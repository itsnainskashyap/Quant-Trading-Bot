import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table with email/password support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone").unique(),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  country: varchar("country"),
  countryCode: varchar("country_code"),
  riskTolerance: varchar("risk_tolerance").default("medium"),
  tradingExperience: varchar("trading_experience").default("beginner"),
  preferredPairs: jsonb("preferred_pairs").default(sql`'[]'::jsonb`),
  notifications: boolean("notifications").default(true),
  autoTrade: boolean("auto_trade").default(false),
  isEarlyAdopter: boolean("is_early_adopter").default(false),
  isAdmin: boolean("is_admin").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  isEmailVerified: boolean("is_email_verified").default(false),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  selectedPlan: varchar("selected_plan").default("free"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OTP verification table
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone").notNull(),
  code: varchar("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailOtpCodes = pgTable("email_otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code").notNull(),
  purpose: varchar("purpose").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  country: z.string().optional(),
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  tradingExperience: z.enum(["beginner", "intermediate", "advanced", "professional"]).optional(),
  preferredPairs: z.array(z.string()).optional(),
  notifications: z.boolean().optional(),
  autoTrade: z.boolean().optional(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
