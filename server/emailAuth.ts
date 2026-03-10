import { db } from "./db";
import { users, emailOtpCodes } from "@shared/models/auth";
import { eq, and, desc } from "drizzle-orm";
import type { Express, Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendWelcomeEmail, sendForgotPasswordOTP, sendLoginAlertEmail } from "./emailService";

const SALT_ROUNDS = 12;

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(
  email: string,
  password: string
): Promise<{ success: boolean; userId?: string; message: string }> {
  try {
    const [existingUser] = await db.select().from(users).where(eq(users.email, email));
    if (existingUser) {
      return { success: false, message: "Email already registered" };
    }

    const hashedPassword = await hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        isEmailVerified: true,
      })
      .returning();

    return { success: true, userId: newUser.id, message: "Registration successful" };
  } catch (error) {
    console.error("[EmailAuth] Registration error:", error);
    return { success: false, message: "Registration failed" };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; userId?: string; message: string }> {
  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.password) {
      return { success: false, message: "Invalid email or password" };
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return { success: false, message: "Invalid email or password" };
    }

    return { success: true, userId: user.id, message: "Login successful" };
  } catch (error) {
    console.error("[EmailAuth] Login error:", error);
    return { success: false, message: "Login failed" };
  }
}

export function setupEmailAuth(app: Express): void {
  app.post("/api/auth/register", (async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const result = await registerUser(email, password);
    if (!result.success) {
      return res.status(400).json(result);
    }

    (req.session as any).userId = result.userId;
    sendWelcomeEmail(email);
    return res.json(result);
  }) as RequestHandler);

  app.post("/api/auth/login", (async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const result = await loginUser(email, password);
    if (!result.success) {
      return res.status(401).json(result);
    }

    (req.session as any).userId = result.userId;
    sendLoginAlertEmail(email);
    return res.json(result);
  }) as RequestHandler);

  app.post("/api/auth/logout", ((req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true, message: "Logged out" });
    });
  }) as RequestHandler);

  app.get("/api/auth/user", (async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      return res.json(safeUser);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  }) as RequestHandler);

  app.post("/api/auth/personalize", (async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { firstName, lastName, riskTolerance, tradingExperience, preferredPairs } = req.body;

    try {
      await db.update(users).set({
        firstName,
        lastName,
        riskTolerance,
        tradingExperience,
        preferredPairs: preferredPairs || [],
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      return res.json({ success: true, message: "Profile updated" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to update profile" });
    }
  }) as RequestHandler);

  app.post("/api/auth/forgot-password", (async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) {
        return res.json({ success: true, message: "If an account exists with this email, a reset code has been sent." });
      }

      const otp = generateOTP();
      const hashedOtp = await bcrypt.hash(otp, 10);

      await db.insert(emailOtpCodes).values({
        email,
        code: hashedOtp,
        purpose: "forgot_password",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendForgotPasswordOTP(email, otp);
      return res.json({ success: true, message: "If an account exists with this email, a reset code has been sent." });
    } catch (e: any) {
      console.error("[ForgotPassword] Error:", e.message);
      return res.status(500).json({ success: false, message: "Failed to process request" });
    }
  }) as RequestHandler);

  app.post("/api/auth/verify-reset-otp", (async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });

    try {
      const codes = await db.select().from(emailOtpCodes)
        .where(and(eq(emailOtpCodes.email, email), eq(emailOtpCodes.purpose, "forgot_password"), eq(emailOtpCodes.verified, false)))
        .orderBy(desc(emailOtpCodes.createdAt));

      const latestCode = codes[0];
      if (!latestCode) return res.status(400).json({ success: false, message: "No reset request found. Please request a new code." });

      if (new Date() > latestCode.expiresAt) {
        return res.status(400).json({ success: false, message: "Code has expired. Please request a new one." });
      }

      if ((latestCode.attempts || 0) >= 5) {
        return res.status(400).json({ success: false, message: "Too many attempts. Please request a new code." });
      }

      await db.update(emailOtpCodes).set({ attempts: (latestCode.attempts || 0) + 1 }).where(eq(emailOtpCodes.id, latestCode.id));

      const isValid = await bcrypt.compare(otp, latestCode.code);
      if (!isValid) return res.status(400).json({ success: false, message: "Invalid code. Please try again." });

      await db.update(emailOtpCodes).set({ verified: true }).where(eq(emailOtpCodes.id, latestCode.id));
      return res.json({ success: true, message: "Code verified", resetToken: latestCode.id });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: "Verification failed" });
    }
  }) as RequestHandler);

  app.post("/api/auth/reset-password", (async (req: Request, res: Response) => {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) return res.status(400).json({ success: false, message: "All fields are required" });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    try {
      const [code] = await db.select().from(emailOtpCodes)
        .where(and(eq(emailOtpCodes.id, resetToken), eq(emailOtpCodes.email, email), eq(emailOtpCodes.verified, true), eq(emailOtpCodes.purpose, "forgot_password")));

      if (!code) return res.status(400).json({ success: false, message: "Invalid or expired reset token" });

      if (new Date() > new Date(code.expiresAt.getTime() + 15 * 60 * 1000)) {
        return res.status(400).json({ success: false, message: "Reset token expired" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await db.update(users).set({ password: hashedPassword, updatedAt: new Date() }).where(eq(users.email, email));

      await db.delete(emailOtpCodes).where(and(eq(emailOtpCodes.email, email), eq(emailOtpCodes.purpose, "forgot_password")));

      return res.json({ success: true, message: "Password reset successfully. You can now log in." });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: "Failed to reset password" });
    }
  }) as RequestHandler);

  app.post("/api/auth/select-plan", (async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { plan } = req.body;
    if (!plan || !["free", "pro"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    try {
      await db.update(users).set({
        selectedPlan: plan,
        onboardingCompleted: true,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));

      return res.json({ success: true, message: "Plan selected" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to select plan" });
    }
  }) as RequestHandler);
}
