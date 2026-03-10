import type { Express, Request, Response, RequestHandler } from "express";
import { db } from "./db";
import { deposits, withdrawals, userBalances, adminPaymentMethods } from "@shared/models/trading";
import { users } from "@shared/models/auth";
import { eq, desc, and, sql } from "drizzle-orm";

const INR_TO_USDT = 92;

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

      const { type, crypto, chain, amountInr, amountUsdt, txHash, utr, toAddress } = req.body;

      if (!type || !amountUsdt || typeof amountUsdt !== "number" || amountUsdt <= 0 || !isFinite(amountUsdt)) {
        return res.status(400).json({ message: "Valid positive amount is required" });
      }

      if (!["crypto", "upi"].includes(type)) {
        return res.status(400).json({ message: "Invalid deposit type" });
      }

      if (type === "upi" && !utr) {
        return res.status(400).json({ message: "UTR is required for UPI deposits" });
      }

      if (type === "crypto" && !txHash) {
        return res.status(400).json({ message: "Transaction hash is required for crypto deposits" });
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

  app.post("/api/withdrawals", (async (req: Request, res: Response) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { type, crypto, chain, toAddress, amountUsdt } = req.body;

      if (!type || !amountUsdt || !toAddress || typeof amountUsdt !== "number" || amountUsdt <= 0 || !isFinite(amountUsdt)) {
        return res.status(400).json({ message: "Valid positive amount and address are required" });
      }

      if (!["crypto", "upi"].includes(type)) {
        return res.status(400).json({ message: "Invalid withdrawal type" });
      }

      const balance = await getOrCreateBalance(userId);
      if (balance < amountUsdt) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const amountInr = type === "upi" ? amountUsdt * INR_TO_USDT : null;

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
          toAddress,
          amountUsdt,
          amountInr,
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
      const { type, crypto, chain, address, upiId, qrImage } = req.body;
      if (!type || !["crypto", "upi"].includes(type)) return res.status(400).json({ message: "Valid type is required" });

      const [method] = await db.insert(adminPaymentMethods).values({
        type,
        crypto: crypto || null,
        chain: chain || null,
        address: address || null,
        upiId: upiId || null,
        qrImage: qrImage || null,
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

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  }) as RequestHandler);
}
