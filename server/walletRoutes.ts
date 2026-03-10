import type { Express, Request, Response, RequestHandler } from "express";
import { db } from "./db";
import { deposits, withdrawals, userBalances, adminPaymentMethods, kycDocuments } from "@shared/models/trading";
import { users, emailOtpCodes } from "@shared/models/auth";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendWithdrawalOTP, sendDepositStatusEmail, sendWithdrawalStatusEmail } from "./emailService";

const INR_TO_USDT = 93.5;

function getUserIdFromRequest(req: any): string | null {
  if (req.session?.userId) return req.session.userId;
  if (req.user?.claims?.sub) return req.user.claims.sub;
  return null;
}

async function getOrCreateBalance(userId: string): Promise<number> {
  const [existing] = await db.select().from(userBalances).where(eq(userBalances.userId, userId));
  if (existing) return Number(existing.balance);
  const [created] = await db.insert(userBalances).values({ userId, balance: 0 }).returning();
  return Number(created.balance);
}

export function setupWalletRoutes(app: Express, verifyAdminSession?: (sessionId: string) => boolean): void {

  const requireAdmin = (req: Request, res: Response): boolean => {
    const sessionId = req.headers['x-admin-session'] as string;
    if (!sessionId || !verifyAdminSession || !verifyAdminSession(sessionId)) {
      res.status(401).json({ message: "Admin authentication required" });
      return false;
    }
    return true;
  };

  app.get("/api/user/balance", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const balance = await getOrCreateBalance(userId);
      res.json({ balance });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.get("/api/payment-methods", (async (_req: Request, res: Response) => {
    try {
      const methods = await db.select().from(adminPaymentMethods).where(eq(adminPaymentMethods.isActive, true));
      res.json(methods);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.post("/api/deposits", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const kycDocs = await db.select().from(kycDocuments).where(eq(kycDocuments.userId, userId));
      const isKycVerified = kycDocs.some((d) => d.status === "verified");
      if (!isKycVerified) {
        return res.status(403).json({ message: "KYC verification required before making deposits. Please verify your identity first.", kycRequired: true });
      }

      const { type, crypto, chain, amountInr, amountUsdt, txHash, utr, toAddress, skrillEmail, voletEmail, transactionId } = req.body;

      if (!type || !amountUsdt || typeof amountUsdt !== "number" || amountUsdt <= 0 || !isFinite(amountUsdt)) {
        return res.status(400).json({ message: "Valid positive amount is required" });
      }

      if (!["crypto", "upi", "imps", "skrill", "volet"].includes(type)) {
        return res.status(400).json({ message: "Invalid deposit type" });
      }

      if ((type === "upi" || type === "imps") && !utr) {
        return res.status(400).json({ message: "UTR/Reference number is required" });
      }

      if (type === "crypto" && !txHash) {
        return res.status(400).json({ message: "Transaction hash is required for crypto deposits" });
      }

      if (type === "skrill" && !skrillEmail) {
        return res.status(400).json({ message: "Skrill email is required" });
      }

      if (type === "skrill" && !transactionId) {
        return res.status(400).json({ message: "Transaction ID is required for Skrill deposits" });
      }

      if (type === "volet" && !voletEmail) {
        return res.status(400).json({ message: "Volet email is required" });
      }

      if (type === "volet" && !transactionId) {
        return res.status(400).json({ message: "Transaction ID is required for Volet deposits" });
      }

      const [deposit] = await db.insert(deposits).values({
        userId,
        type,
        crypto: crypto || null,
        chain: chain || null,
        amountInr: amountInr || null,
        amountUsdt,
        txHash: txHash || null,
        utr: utr || null,
        toAddress: toAddress || null,
        skrillEmail: type === "skrill" ? skrillEmail : null,
        voletEmail: type === "volet" ? voletEmail : null,
        transactionId: transactionId || null,
        status: "pending",
      }).returning();

      res.json(deposit);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.get("/api/deposits", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const userDeposits = await db.select().from(deposits).where(eq(deposits.userId, userId)).orderBy(desc(deposits.createdAt));
      res.json(userDeposits);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.post("/api/withdrawal/send-otp", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.email) return res.status(400).json({ message: "No email associated with account" });

      const { amountUsdt, type } = req.body;
      if (!amountUsdt || !type) return res.status(400).json({ message: "Amount and type are required" });

      const otp = crypto.randomInt(100000, 999999).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);

      await db.insert(emailOtpCodes).values({
        email: user.email,
        code: hashedOtp,
        purpose: "withdrawal",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendWithdrawalOTP(user.email, otp, String(amountUsdt), type);
      res.json({ success: true, message: "Verification code sent to your email" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.post("/api/withdrawal/verify-otp", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.email) return res.status(400).json({ message: "No email associated with account" });

      const { otp } = req.body;
      if (!otp) return res.status(400).json({ message: "OTP is required" });

      const codes = await db.select().from(emailOtpCodes)
        .where(and(eq(emailOtpCodes.email, user.email), eq(emailOtpCodes.purpose, "withdrawal"), eq(emailOtpCodes.verified, false)))
        .orderBy(desc(emailOtpCodes.createdAt));

      const latestCode = codes[0];
      if (!latestCode) return res.status(400).json({ message: "No withdrawal OTP found. Please request a new one." });

      if (new Date() > latestCode.expiresAt) {
        return res.status(400).json({ message: "Code has expired. Please request a new one." });
      }

      if ((latestCode.attempts || 0) >= 5) {
        return res.status(400).json({ message: "Too many attempts. Please request a new code." });
      }

      await db.update(emailOtpCodes).set({ attempts: (latestCode.attempts || 0) + 1 }).where(eq(emailOtpCodes.id, latestCode.id));

      const isValid = await bcrypt.compare(otp, latestCode.code);
      if (!isValid) return res.status(400).json({ message: "Invalid code" });

      await db.update(emailOtpCodes).set({ verified: true }).where(eq(emailOtpCodes.id, latestCode.id));
      res.json({ success: true, message: "OTP verified", withdrawalToken: latestCode.id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.post("/api/withdrawals", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { type, crypto, chain, toAddress, amountUsdt, bankName, accountNumber, ifscCode, accountHolderName, withdrawalToken, binancePayId, wireSwiftCode, wireIban, wireBankName, wireAccountNumber, wireAccountHolderName } = req.body;

      if (!withdrawalToken) {
        return res.status(400).json({ message: "Withdrawal OTP verification required" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (user?.email) {
        const [otpRecord] = await db.select().from(emailOtpCodes)
          .where(and(
            eq(emailOtpCodes.id, withdrawalToken),
            eq(emailOtpCodes.email, user.email),
            eq(emailOtpCodes.verified, true),
            eq(emailOtpCodes.purpose, "withdrawal"),
            gte(emailOtpCodes.expiresAt, new Date())
          ));
        if (!otpRecord) {
          return res.status(400).json({ message: "Invalid or expired withdrawal verification. Please verify OTP again." });
        }
        await db.delete(emailOtpCodes).where(eq(emailOtpCodes.id, withdrawalToken));
      }

      if (!type || !amountUsdt || typeof amountUsdt !== "number" || amountUsdt <= 0 || !isFinite(amountUsdt)) {
        return res.status(400).json({ message: "Valid positive amount is required" });
      }

      if (!["crypto", "upi", "imps", "binance_pay", "wire_transfer"].includes(type)) {
        return res.status(400).json({ message: "Invalid withdrawal type" });
      }

      if (type === "crypto" && !toAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      if (type === "upi" && !toAddress) {
        return res.status(400).json({ message: "UPI ID is required" });
      }
      if (type === "imps" && (!accountNumber || !ifscCode || !accountHolderName)) {
        return res.status(400).json({ message: "Bank details (account number, IFSC, account holder name) are required" });
      }
      if (type === "binance_pay" && !binancePayId) {
        return res.status(400).json({ message: "Binance Pay ID is required" });
      }
      if (type === "wire_transfer" && (!wireBankName || !wireAccountNumber || !wireAccountHolderName || !wireSwiftCode)) {
        return res.status(400).json({ message: "Wire transfer details (bank name, account number, SWIFT code, account holder) are required" });
      }

      const balance = await getOrCreateBalance(userId);
      if (balance < amountUsdt) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const feePercent = (type === "imps" || type === "upi") ? 4 : (type === "binance_pay" || type === "crypto") ? 1 : 2;
      const feeUsdt = parseFloat((amountUsdt * (feePercent / 100)).toFixed(4));
      const netAmountUsdt = parseFloat((amountUsdt - feeUsdt).toFixed(4));
      const amountInr = (type === "upi" || type === "imps") ? parseFloat((netAmountUsdt * INR_TO_USDT).toFixed(2)) : null;

      if (type === "binance_pay") {
        const existingWithdrawals = await db.select().from(withdrawals)
          .where(and(eq(withdrawals.userId, userId), eq(withdrawals.type, "binance_pay")));
        const existingBinanceId = existingWithdrawals.find(w => w.binancePayId)?.binancePayId;
        if (existingBinanceId && existingBinanceId !== binancePayId) {
          return res.status(400).json({ message: "Binance Pay ID cannot be changed once set. Your registered ID: " + existingBinanceId });
        }
      }

      const result = await db.transaction(async (tx) => {
        const [updated] = await tx.update(userBalances).set({
          balance: sql`${userBalances.balance} - ${amountUsdt}`,
          updatedAt: new Date(),
        }).where(and(
          eq(userBalances.userId, userId),
          sql`${userBalances.balance} >= ${amountUsdt}`
        )).returning();

        if (!updated) {
          throw new Error("Insufficient balance");
        }

        const [withdrawal] = await tx.insert(withdrawals).values({
          userId,
          type,
          crypto: crypto || null,
          chain: chain || null,
          toAddress: toAddress || null,
          amountUsdt,
          feeUsdt,
          netAmountUsdt,
          amountInr,
          bankName: bankName || null,
          accountNumber: accountNumber || null,
          ifscCode: ifscCode || null,
          accountHolderName: accountHolderName || null,
          binancePayId: type === "binance_pay" ? binancePayId : null,
          wireSwiftCode: type === "wire_transfer" ? wireSwiftCode : null,
          wireIban: type === "wire_transfer" ? (wireIban || null) : null,
          wireBankName: type === "wire_transfer" ? wireBankName : null,
          wireAccountNumber: type === "wire_transfer" ? wireAccountNumber : null,
          wireAccountHolderName: type === "wire_transfer" ? wireAccountHolderName : null,
          status: "pending",
        }).returning();

        return withdrawal;
      });

      res.json(result);
    } catch (e: any) {
      if (e.message === "Insufficient balance") {
        return res.status(400).json({ message: e.message });
      }
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.get("/api/user/binance-pay-id", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const userWithdrawals = await db.select().from(withdrawals)
        .where(and(eq(withdrawals.userId, userId), eq(withdrawals.type, "binance_pay")));
      const binancePayId = userWithdrawals.find(w => w.binancePayId)?.binancePayId || null;
      res.json({ binancePayId });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.get("/api/withdrawals", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const userWithdrawals = await db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt));
      res.json(userWithdrawals);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.get("/api/transactions", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const [userDeposits, userWithdrawals] = await Promise.all([
        db.select().from(deposits).where(eq(deposits.userId, userId)).orderBy(desc(deposits.createdAt)),
        db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt)),
      ]);
      const transactions = [
        ...userDeposits.map(d => ({ ...d, txType: "deposit" as const })),
        ...userWithdrawals.map(w => ({ ...w, txType: "withdrawal" as const })),
      ].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      res.json(transactions);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.post("/api/admin/payment-methods", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const { type, crypto, chain, address, upiId, qrImage, bankName, accountNumber, ifscCode, accountHolderName } = req.body;
      if (!type || !["crypto", "upi", "imps"].includes(type)) return res.status(400).json({ message: "Valid type is required" });

      if (type === "crypto" && (!address || !crypto || !chain)) return res.status(400).json({ message: "Crypto, chain, and address are required" });
      if (type === "upi" && !upiId) return res.status(400).json({ message: "UPI ID is required" });
      if (type === "imps" && (!accountNumber || !ifscCode || !accountHolderName)) return res.status(400).json({ message: "Account number, IFSC code, and account holder name are required" });

      const [method] = await db.insert(adminPaymentMethods).values({
        type,
        crypto: crypto || null,
        chain: chain || null,
        address: address || null,
        upiId: upiId || null,
        qrImage: qrImage || null,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        accountHolderName: accountHolderName || null,
        isActive: true,
      }).returning();

      res.json(method);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.get("/api/admin/payment-methods", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const methods = await db.select().from(adminPaymentMethods).orderBy(desc(adminPaymentMethods.createdAt));
      res.json(methods);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.patch("/api/admin/payment-methods/:id/toggle", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const { id } = req.params;
      const [method] = await db.select().from(adminPaymentMethods).where(eq(adminPaymentMethods.id, id));
      if (!method) return res.status(404).json({ message: "Method not found" });
      const [updated] = await db.update(adminPaymentMethods).set({ isActive: !method.isActive }).where(eq(adminPaymentMethods.id, id)).returning();
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.delete("/api/admin/payment-methods/:id", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const { id } = req.params;
      await db.delete(adminPaymentMethods).where(eq(adminPaymentMethods.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.get("/api/admin/deposits", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const allDeposits = await db
        .select({
          deposit: deposits,
          userEmail: users.email,
          userFirstName: users.firstName,
        })
        .from(deposits)
        .leftJoin(users, eq(deposits.userId, users.id))
        .orderBy(desc(deposits.createdAt));
      res.json(allDeposits.map(d => ({ ...d.deposit, userEmail: d.userEmail, userName: d.userFirstName })));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.post("/api/admin/deposits/:id/action", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const { id } = req.params;
      const { action, notes } = req.body;

      if (!["approved", "rejected", "processing"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const [deposit] = await db.select().from(deposits).where(eq(deposits.id, id));
      if (!deposit) return res.status(404).json({ message: "Deposit not found" });

      const validTransitions: Record<string, string[]> = {
        pending: ["processing", "approved", "rejected"],
        processing: ["approved", "rejected"],
      };

      const allowed = validTransitions[deposit.status] || [];
      if (!allowed.includes(action)) {
        return res.status(400).json({ message: `Cannot transition from ${deposit.status} to ${action}` });
      }

      await db.update(deposits).set({
        status: action,
        adminNotes: notes || null,
        processedAt: action !== "processing" ? new Date() : null,
      }).where(eq(deposits.id, id));

      if (action === "approved") {
        const [existing] = await db.select().from(userBalances).where(eq(userBalances.userId, deposit.userId));
        if (existing) {
          await db.update(userBalances).set({
            balance: sql`${userBalances.balance} + ${deposit.amountUsdt}`,
            updatedAt: new Date(),
          }).where(eq(userBalances.userId, deposit.userId));
        } else {
          await db.insert(userBalances).values({
            userId: deposit.userId,
            balance: deposit.amountUsdt,
          });
        }
      }

      const [depositUser] = await db.select().from(users).where(eq(users.id, deposit.userId));
      if (depositUser?.email) {
        sendDepositStatusEmail(
          depositUser.email,
          action as "approved" | "rejected" | "processing",
          String(deposit.amountUsdt),
          deposit.type,
          notes
        );
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.get("/api/admin/withdrawals", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const allWithdrawals = await db
        .select({
          withdrawal: withdrawals,
          userEmail: users.email,
          userFirstName: users.firstName,
        })
        .from(withdrawals)
        .leftJoin(users, eq(withdrawals.userId, users.id))
        .orderBy(desc(withdrawals.createdAt));
      res.json(allWithdrawals.map(w => ({ ...w.withdrawal, userEmail: w.userEmail, userName: w.userFirstName })));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);

  app.post("/api/admin/withdrawals/:id/action", (async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const { id } = req.params;
      const { action, notes, txHash } = req.body;

      if (!["approved", "rejected", "processing"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, id));
      if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });

      const validTransitions: Record<string, string[]> = {
        pending: ["processing", "approved", "rejected"],
        processing: ["approved", "rejected"],
      };

      const allowed = validTransitions[withdrawal.status] || [];
      if (!allowed.includes(action)) {
        return res.status(400).json({ message: `Cannot transition from ${withdrawal.status} to ${action}` });
      }

      if (action === "rejected") {
        const [existing] = await db.select().from(userBalances).where(eq(userBalances.userId, withdrawal.userId));
        if (existing) {
          await db.update(userBalances).set({
            balance: sql`${userBalances.balance} + ${withdrawal.amountUsdt}`,
            updatedAt: new Date(),
          }).where(eq(userBalances.userId, withdrawal.userId));
        }
      }

      await db.update(withdrawals).set({
        status: action,
        adminNotes: notes || null,
        txHash: txHash || withdrawal.txHash,
        processedAt: action !== "processing" ? new Date() : null,
      }).where(eq(withdrawals.id, id));

      const [withdrawalUser] = await db.select().from(users).where(eq(users.id, withdrawal.userId));
      if (withdrawalUser?.email) {
        sendWithdrawalStatusEmail(
          withdrawalUser.email,
          action as "approved" | "rejected" | "processing",
          String(withdrawal.amountUsdt),
          withdrawal.type,
          notes
        );
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);
}
