import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, integer, boolean, real, text } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  plan: varchar("plan").notNull().default("free"),
  status: varchar("status").notNull().default("active"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  pair: varchar("pair").notNull(),
  signal: varchar("signal").notNull(),
  confidence: integer("confidence").notNull(),
  riskGrade: varchar("risk_grade").notNull(),
  entryPrice: real("entry_price").notNull(),
  exitPrice: real("exit_price"),
  exitWindowMinutes: integer("exit_window_minutes").notNull(),
  exitTimestamp: timestamp("exit_timestamp").notNull(),
  reasoning: text("reasoning").notNull(),
  outcome: varchar("outcome").default("PENDING"),
  profitLoss: real("profit_loss"),
  outcomeReason: text("outcome_reason"),
  capital: real("capital"),
  tradeSize: real("trade_size"),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = typeof predictions.$inferInsert;
