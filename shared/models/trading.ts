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
  exitTimestamp: timestamp("exit_timestamp"), // When trade should auto-close
  extensionCount: integer("extension_count").default(0), // How many times AI extended
  status: varchar("status").notNull().default("OPEN"), // OPEN, CLOSED, STOPPED, PROFIT_TAKEN
  profitLoss: real("profit_loss"),
  profitLossPercent: real("profit_loss_percent"),
  closeReason: varchar("close_reason"), // AI_STOP, AI_PROFIT, USER_CLOSE, MANUAL_SL, MANUAL_TP, TIME_EXPIRED
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

// Promo codes for discounts on Pro subscription
export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  discountPercent: integer("discount_percent").notNull(), // 10 = 10% off
  maxUses: integer("max_uses"), // null = unlimited
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"), // null = never expires
  createdAt: timestamp("created_at").defaultNow(),
});

// Track promo code usage by user
export const promoCodeUsage = pgTable("promo_code_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCodeId: varchar("promo_code_id").notNull().references(() => promoCodes.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  usedAt: timestamp("used_at").defaultNow(),
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;
export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type InsertPromoCodeUsage = typeof promoCodeUsage.$inferInsert;

// Active Find Trade scans - runs server-side even when user closes tab
export const findTradeScans = pgTable("find_trade_scans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  pair: varchar("pair").notNull(),
  status: varchar("status").notNull().default("scanning"), // scanning, found, timeout, cancelled
  minConfidence: integer("min_confidence").notNull().default(90),
  attempts: integer("attempts").notNull().default(0),
  // Result fields (populated when found)
  resultSignal: varchar("result_signal"), // BUY or SELL
  resultConfidence: integer("result_confidence"),
  resultEntryPrice: real("result_entry_price"),
  resultStopLoss: real("result_stop_loss"),
  resultTakeProfit: real("result_take_profit"),
  resultReasoning: text("result_reasoning"),
  // Timing
  startedAt: timestamp("started_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 30 minutes from start
  completedAt: timestamp("completed_at"),
});

export type FindTradeScan = typeof findTradeScans.$inferSelect;
export type InsertFindTradeScan = typeof findTradeScans.$inferInsert;

export const adminPaymentMethods = pgTable("admin_payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // crypto, upi, or imps
  crypto: varchar("crypto"), // BTC, ETH, USDT, LTC, USDC
  chain: varchar("chain"), // ERC20, TRC20, BEP20, Bitcoin, Litecoin
  address: varchar("address"), // crypto address
  upiId: varchar("upi_id"), // UPI ID
  qrImage: text("qr_image"), // base64 QR image for UPI
  bankName: varchar("bank_name"), // IMPS bank name
  accountNumber: varchar("account_number"), // IMPS account number
  ifscCode: varchar("ifsc_code"), // IMPS IFSC code
  accountHolderName: varchar("account_holder_name"), // IMPS account holder
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deposits = pgTable("deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().default(sql`'TXD-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // crypto, upi, imps, skrill, volet
  crypto: varchar("crypto"),
  chain: varchar("chain"),
  amountInr: real("amount_inr"),
  amountUsdt: real("amount_usdt").notNull(),
  txHash: varchar("tx_hash"),
  utr: varchar("utr"),
  toAddress: varchar("to_address"),
  skrillEmail: varchar("skrill_email"),
  voletEmail: varchar("volet_email"),
  transactionId: varchar("transaction_id"),
  status: varchar("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().default(sql`'TXW-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // crypto, upi, imps, binance_pay, wire_transfer
  crypto: varchar("crypto"),
  chain: varchar("chain"),
  toAddress: varchar("to_address"),
  amountUsdt: real("amount_usdt").notNull(),
  feeUsdt: real("fee_usdt"),
  netAmountUsdt: real("net_amount_usdt"),
  amountInr: real("amount_inr"),
  bankName: varchar("bank_name"),
  accountNumber: varchar("account_number"),
  ifscCode: varchar("ifsc_code"),
  accountHolderName: varchar("account_holder_name"),
  binancePayId: varchar("binance_pay_id"),
  wireSwiftCode: varchar("wire_swift_code"),
  wireIban: varchar("wire_iban"),
  wireBankName: varchar("wire_bank_name"),
  wireAccountNumber: varchar("wire_account_number"),
  wireAccountHolderName: varchar("wire_account_holder_name"),
  status: varchar("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  txHash: varchar("tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const userBalances = pgTable("user_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  balance: real("balance").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const kycDocuments = pgTable("kyc_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: varchar("document_type").notNull(), // aadhaar, pancard, voter_id, id_card
  documentImage: text("document_image").notNull(), // base64 front image
  documentImageBack: text("document_image_back"), // base64 back image
  extractedName: varchar("extracted_name"),
  extractedDob: varchar("extracted_dob"),
  extractedDocNumber: varchar("extracted_doc_number"),
  extractedFatherName: varchar("extracted_father_name"),
  extractedAddress: text("extracted_address"),
  extractedGender: varchar("extracted_gender"),
  status: varchar("status").notNull().default("pending"), // pending, verified, rejected
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

export type AdminPaymentMethod = typeof adminPaymentMethods.$inferSelect;
export type InsertAdminPaymentMethod = typeof adminPaymentMethods.$inferInsert;
export type Deposit = typeof deposits.$inferSelect;
export type InsertDeposit = typeof deposits.$inferInsert;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = typeof withdrawals.$inferInsert;
export type UserBalance = typeof userBalances.$inferSelect;
export type InsertUserBalance = typeof userBalances.$inferInsert;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type InsertKycDocument = typeof kycDocuments.$inferInsert;
