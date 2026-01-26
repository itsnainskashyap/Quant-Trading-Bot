import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import type { Express, Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

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
