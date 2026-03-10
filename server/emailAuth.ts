import { db } from "./db";
import { users, emailOtpCodes } from "@shared/models/auth";
import { eq, and, desc } from "drizzle-orm";
import type { Express, Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendWelcomeEmail, sendForgotPasswordOTP, sendLoginAlertEmail, sendRegistrationOTP, sendLoginOTP } from "./emailService";

const SALT_ROUNDS = 12;

const loginChallenges = new Map<string, { email: string; expiry: number }>();

function createLoginChallenge(email: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  loginChallenges.set(token, { email, expiry: Date.now() + 10 * 60 * 1000 });
  for (const [k, v] of loginChallenges) {
    if (v.expiry < Date.now()) loginChallenges.delete(k);
  }
  return token;
}

function validateLoginChallenge(token: string, email: string): boolean {
  const challenge = loginChallenges.get(token);
  if (!challenge) return false;
  if (challenge.email !== email) return false;
  if (challenge.expiry < Date.now()) {
    loginChallenges.delete(token);
    return false;
  }
  return true;
}

function consumeLoginChallenge(token: string): void {
  loginChallenges.delete(token);
}

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
  password: string,
  country?: string,
  countryCode?: string,
  phone?: string
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
        isEmailVerified: false,
        country: country || null,
        countryCode: countryCode || null,
        phone: phone || null,
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
    const { email, password, country, countryCode, phone } = req.body;

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

    const result = await registerUser(email, password, country, countryCode, phone);
    if (!result.success) {
      return res.status(400).json(result);
    }

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    await db.insert(emailOtpCodes).values({
      email,
      code: hashedOtp,
      purpose: "registration",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendRegistrationOTP(email, otp);
    return res.json({ success: true, message: "Registration successful. Please verify your email.", requiresVerification: true, email });
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

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    await db.insert(emailOtpCodes).values({
      email,
      code: hashedOtp,
      purpose: "login",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const challengeToken = createLoginChallenge(email);
    await sendLoginOTP(email, otp);
    return res.json({ success: true, message: "Verification code sent to your email.", requiresOTP: true, email, challengeToken });
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

  app.post("/api/auth/verify-registration-otp", (async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });

    try {
      const codes = await db.select().from(emailOtpCodes)
        .where(and(eq(emailOtpCodes.email, email), eq(emailOtpCodes.purpose, "registration"), eq(emailOtpCodes.verified, false)))
        .orderBy(desc(emailOtpCodes.createdAt));

      const latestCode = codes[0];
      if (!latestCode) return res.status(400).json({ success: false, message: "No verification code found. Please register again." });

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
      await db.update(users).set({ isEmailVerified: true, updatedAt: new Date() }).where(eq(users.email, email));

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (user) {
        (req.session as any).userId = user.id;
        sendWelcomeEmail(email);
      }

      return res.json({ success: true, message: "Email verified successfully!" });
    } catch (e: any) {
      console.error("[EmailAuth] Registration OTP verification error:", e.message);
      return res.status(500).json({ success: false, message: "Verification failed" });
    }
  }) as RequestHandler);

  app.post("/api/auth/verify-login-otp", (async (req: Request, res: Response) => {
    const { email, otp, challengeToken } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });
    if (!challengeToken || !validateLoginChallenge(challengeToken, email)) {
      return res.status(400).json({ success: false, message: "Invalid or expired login session. Please login again." });
    }

    try {
      const codes = await db.select().from(emailOtpCodes)
        .where(and(eq(emailOtpCodes.email, email), eq(emailOtpCodes.purpose, "login"), eq(emailOtpCodes.verified, false)))
        .orderBy(desc(emailOtpCodes.createdAt));

      const latestCode = codes[0];
      if (!latestCode) return res.status(400).json({ success: false, message: "No verification code found. Please try logging in again." });

      if (new Date() > latestCode.expiresAt) {
        return res.status(400).json({ success: false, message: "Code has expired. Please login again." });
      }

      if ((latestCode.attempts || 0) >= 5) {
        return res.status(400).json({ success: false, message: "Too many attempts. Please login again." });
      }

      await db.update(emailOtpCodes).set({ attempts: (latestCode.attempts || 0) + 1 }).where(eq(emailOtpCodes.id, latestCode.id));

      const isValid = await bcrypt.compare(otp, latestCode.code);
      if (!isValid) return res.status(400).json({ success: false, message: "Invalid code. Please try again." });

      await db.update(emailOtpCodes).set({ verified: true }).where(eq(emailOtpCodes.id, latestCode.id));
      consumeLoginChallenge(challengeToken);

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) return res.status(400).json({ success: false, message: "User not found" });

      (req.session as any).userId = user.id;
      sendLoginAlertEmail(email);

      return res.json({ success: true, message: "Login verified!" });
    } catch (e: any) {
      console.error("[EmailAuth] Login OTP verification error:", e.message);
      return res.status(500).json({ success: false, message: "Verification failed" });
    }
  }) as RequestHandler);

  app.post("/api/auth/resend-otp", (async (req: Request, res: Response) => {
    const { email, purpose, challengeToken } = req.body;
    if (!email || !purpose) return res.status(400).json({ success: false, message: "Email and purpose are required" });
    if (!["registration", "login"].includes(purpose)) return res.status(400).json({ success: false, message: "Invalid purpose" });

    if (purpose === "login") {
      if (!challengeToken || !validateLoginChallenge(challengeToken, email)) {
        return res.status(400).json({ success: false, message: "Invalid login session. Please login again." });
      }
    }

    try {
      const otp = generateOTP();
      const hashedOtp = await bcrypt.hash(otp, 10);
      await db.insert(emailOtpCodes).values({
        email,
        code: hashedOtp,
        purpose,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      if (purpose === "registration") {
        await sendRegistrationOTP(email, otp);
      } else {
        await sendLoginOTP(email, otp);
      }

      return res.json({ success: true, message: "New verification code sent." });
    } catch (e: any) {
      console.error("[EmailAuth] Resend OTP error:", e.message);
      return res.status(500).json({ success: false, message: "Failed to resend code" });
    }
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
