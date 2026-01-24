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

export const brokerConnections = pgTable("broker_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  exchange: varchar("exchange").notNull(), // binance, bybit, okx, kucoin, etc.
  apiKey: text("api_key").notNull(),
  apiSecret: text("api_secret").notNull(),
  passphrase: text("passphrase"), // Some exchanges like OKX need this
  isActive: boolean("is_active").default(true),
  autoTrade: boolean("auto_trade").default(false), // Enable/disable auto trading
  testMode: boolean("test_mode").default(true), // Use sandbox/testnet
  lastConnected: timestamp("last_connected"),
  createdAt: timestamp("created_at").defaultNow(),
});

// TradeX virtual broker - paper trading with real-time sync
export const tradexBalances = pgTable("tradex_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  balance: real("balance").notNull().default(10000), // Virtual balance in USDT
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tradexTrades = pgTable("tradex_trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  pair: varchar("pair").notNull(),
  signal: varchar("signal").notNull(), // BUY or SELL
  entryPrice: real("entry_price").notNull(),
  currentPrice: real("current_price"),
  amount: real("amount").notNull(), // Trade size in USDT
  leverage: integer("leverage").notNull().default(1),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  aiStopLoss: real("ai_stop_loss"), // AI-adjusted stop loss
  aiTakeProfit: real("ai_take_profit"), // AI-adjusted take profit
  status: varchar("status").notNull().default("OPEN"), // OPEN, CLOSED, STOPPED, PROFIT_TAKEN
  profitLoss: real("profit_loss"),
  profitLossPercent: real("profit_loss_percent"),
  closeReason: varchar("close_reason"), // AI_STOP, AI_PROFIT, USER_CLOSE, MANUAL_SL, MANUAL_TP
  aiRecommendation: text("ai_recommendation"), // Current AI suggestion
  aiAnalysis: text("ai_analysis"), // Live AI analysis
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Daily usage tracking for Free/Pro tier limits
export const dailyUsage = pgTable("daily_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  analysisCount: integer("analysis_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = typeof predictions.$inferInsert;
export type BrokerConnection = typeof brokerConnections.$inferSelect;
export type InsertBrokerConnection = typeof brokerConnections.$inferInsert;
export type TradexBalance = typeof tradexBalances.$inferSelect;
export type InsertTradexBalance = typeof tradexBalances.$inferInsert;
export type TradexTrade = typeof tradexTrades.$inferSelect;
export type InsertTradexTrade = typeof tradexTrades.$inferInsert;
export type DailyUsage = typeof dailyUsage.$inferSelect;
export type InsertDailyUsage = typeof dailyUsage.$inferInsert;

// Admin settings for payment wallet addresses
export const adminSettings = pgTable("admin_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trc20Address: varchar("trc20_address"), // TRON TRC20 USDT address
  bep20Address: varchar("bep20_address"), // BSC BEP20 USDT address
  proPrice: real("pro_price").notNull().default(10), // Pro subscription price in USDT
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment records for subscription payments
export const paymentRecords = pgTable("payment_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  network: varchar("network").notNull(), // trc20 or bep20
  txHash: varchar("tx_hash").notNull().unique(),
  amount: real("amount").notNull(),
  walletAddress: varchar("wallet_address").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, verified, failed
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminSettings = typeof adminSettings.$inferSelect;
export type InsertAdminSettings = typeof adminSettings.$inferInsert;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = typeof paymentRecords.$inferInsert;
