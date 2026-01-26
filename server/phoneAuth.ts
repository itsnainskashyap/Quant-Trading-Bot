import { db } from "./db";
import { users, otpCodes } from "@shared/models/auth";
import { eq, and, gt } from "drizzle-orm";
import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import crypto from "crypto";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

const otpRateLimits = new Map<string, { count: number; resetAt: number }>();

export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  try {
    const now = Date.now();
    const rateLimit = otpRateLimits.get(phone);
    if (rateLimit) {
      if (now < rateLimit.resetAt) {
        if (rateLimit.count >= 5) {
          return { success: false, message: "Too many OTP requests. Please wait 10 minutes." };
        }
        rateLimit.count++;
      } else {
        otpRateLimits.set(phone, { count: 1, resetAt: now + 10 * 60 * 1000 });
      }
    } else {
      otpRateLimits.set(phone, { count: 1, resetAt: now + 10 * 60 * 1000 });
    }

    const code = generateOTP();
    const hashedCode = hashOTP(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.delete(otpCodes).where(eq(otpCodes.phone, phone));

    await db.insert(otpCodes).values({
      phone,
      code: hashedCode,
      expiresAt,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[PhoneAuth] Dev mode OTP for ...${phone.slice(-4)}: ${code}`);
    }

    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("[PhoneAuth] Error sending OTP");
    return { success: false, message: "Failed to send OTP" };
  }
}

export async function verifyOTP(phone: string, code: string): Promise<{ success: boolean; userId?: string; message: string }> {
  try {
    const [otpRecord] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.verified, false),
          gt(otpCodes.expiresAt, new Date())
        )
      );

    if (!otpRecord) {
      return { success: false, message: "OTP expired or not found" };
    }

    const attempts = (otpRecord.attempts || 0) + 1;
    if (attempts >= 5) {
      await db.delete(otpCodes).where(eq(otpCodes.id, otpRecord.id));
      return { success: false, message: "Too many attempts. Please request a new code." };
    }

    const hashedInput = hashOTP(code);
    if (otpRecord.code !== hashedInput) {
      await db.update(otpCodes).set({ attempts }).where(eq(otpCodes.id, otpRecord.id));
      return { success: false, message: `Invalid OTP. ${5 - attempts} attempts remaining.` };
    }

    await db.delete(otpCodes).where(eq(otpCodes.id, otpRecord.id));

    let [user] = await db.select().from(users).where(eq(users.phone, phone));

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          phone,
          isPhoneVerified: true,
        })
        .returning();
      user = newUser;
    } else {
      await db.update(users).set({ isPhoneVerified: true, updatedAt: new Date() }).where(eq(users.id, user.id));
    }

    return { success: true, userId: user.id, message: "Phone verified successfully" };
  } catch (error) {
    console.error("[PhoneAuth] Error verifying OTP:", error);
    return { success: false, message: "Verification failed" };
  }
}

export async function getUserByPhone(phone: string) {
  const [user] = await db.select().from(users).where(eq(users.phone, phone));
  return user;
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function updateUserProfile(userId: string, data: Partial<typeof users.$inferInsert>) {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export const isPhoneAuthenticated: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const session = req.session as any;
  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function setupPhoneAuth(app: Express): void {
  app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        return res.status(400).json({ message: "Invalid phone number" });
      }

      const result = await sendOTP(cleanPhone);
      if (result.success) {
        res.json({ success: true, message: "OTP sent to your phone" });
      } else {
        res.status(500).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ message: "Phone and OTP code are required" });
      }

      const cleanPhone = phone.replace(/\D/g, "");
      const result = await verifyOTP(cleanPhone, code);

      if (result.success && result.userId) {
        (req.session as any).userId = result.userId;
        const user = await getUserById(result.userId);
        res.json({ success: true, user, needsProfile: !user?.firstName });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    try {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await getUserById(session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.patch("/api/auth/profile", isPhoneAuthenticated, async (req: Request, res: Response) => {
    try {
      const session = req.session as any;
      const userId = session.userId;

      const { firstName, lastName, email, country, riskTolerance, tradingExperience, preferredPairs, notifications, autoTrade } = req.body;

      const updated = await updateUserProfile(userId, {
        firstName,
        lastName,
        email,
        country,
        riskTolerance,
        tradingExperience,
        preferredPairs,
        notifications,
        autoTrade,
      });

      res.json(updated);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
}
