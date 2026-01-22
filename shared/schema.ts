import { z } from "zod";

export const signalTypes = ["BUY", "SELL", "NO_TRADE"] as const;
export type SignalType = typeof signalTypes[number];

export const riskGrades = ["LOW", "MEDIUM", "HIGH"] as const;
export type RiskGrade = typeof riskGrades[number];

export const marketRegimes = ["TREND", "RANGE", "CHAOS"] as const;
export type MarketRegime = typeof marketRegimes[number];

export const tradingPairs = [
  "BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT", "DOGE-USDT", 
  "BNB-USDT", "ADA-USDT", "AVAX-USDT", "DOT-USDT", "MATIC-USDT",
  "LINK-USDT", "LTC-USDT", "SHIB-USDT", "ATOM-USDT", "UNI-USDT"
] as const;
export type TradingPair = typeof tradingPairs[number];

export const priceDataSchema = z.object({
  pair: z.enum(tradingPairs),
  price: z.number(),
  change24h: z.number(),
  high24h: z.number(),
  low24h: z.number(),
  volume24h: z.number(),
  timestamp: z.number(),
});
export type PriceData = z.infer<typeof priceDataSchema>;

export const modelScoreSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  description: z.string(),
});
export type ModelScore = z.infer<typeof modelScoreSchema>;

export const tradingSignalSchema = z.object({
  id: z.string(),
  pair: z.enum(tradingPairs),
  signal: z.enum(signalTypes),
  confidence: z.number().min(0).max(100),
  riskGrade: z.enum(riskGrades),
  exitWindowMinutes: z.number(),
  exitTimestamp: z.number(),
  marketRegime: z.enum(marketRegimes),
  modelScores: z.array(modelScoreSchema),
  reasoning: z.string(),
  warnings: z.array(z.string()),
  timestamp: z.number(),
});
export type TradingSignal = z.infer<typeof tradingSignalSchema>;

export const marketMetricsSchema = z.object({
  pair: z.enum(tradingPairs),
  volumeDelta: z.number(),
  orderBookImbalance: z.number(),
  volatility: z.number(),
  atr: z.number(),
  fundingRate: z.number(),
  openInterest: z.number(),
  // Technical Indicators
  rsi: z.number().optional(),
  rsiSignal: z.enum(['OVERSOLD', 'OVERBOUGHT', 'NEUTRAL']).optional(),
  macdTrend: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']).optional(),
  macdHistogram: z.number().optional(),
  bollingerPosition: z.enum(['ABOVE_UPPER', 'ABOVE_MIDDLE', 'BELOW_MIDDLE', 'BELOW_LOWER']).optional(),
  sma20: z.number().optional(),
  sma50: z.number().optional(),
  momentum: z.number().optional(),
  overallTechnicalSignal: z.enum(['STRONG_BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG_SELL']).optional(),
  technicalStrength: z.number().optional(),
});
export type MarketMetrics = z.infer<typeof marketMetricsSchema>;

export const backtestStatsSchema = z.object({
  totalSignals: z.number(),
  winningSignals: z.number(),
  losingSignals: z.number(),
  winRate: z.number(),
  avgProfit: z.number(),
  avgLoss: z.number(),
  profitFactor: z.number(),
  maxDrawdown: z.number(),
  sharpeRatio: z.number(),
  lastUpdated: z.number(),
});
export type BacktestStats = z.infer<typeof backtestStatsSchema>;

export const signalHistorySchema = z.object({
  id: z.string(),
  pair: z.enum(tradingPairs),
  signal: z.enum(signalTypes),
  confidence: z.number(),
  timestamp: z.number(),
  outcome: z.enum(["WIN", "LOSS", "PENDING", "SKIPPED"]).optional(),
});
export type SignalHistory = z.infer<typeof signalHistorySchema>;

export const llmExplanationRequestSchema = z.object({
  signal: tradingSignalSchema,
  priceData: priceDataSchema,
  metrics: marketMetricsSchema,
});
export type LLMExplanationRequest = z.infer<typeof llmExplanationRequestSchema>;

export const aiProviderAnalysisSchema = z.object({
  provider: z.string(),
  signal: z.enum(signalTypes),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  riskLevel: z.enum(riskGrades),
  success: z.boolean(),
});
export type AIProviderAnalysis = z.infer<typeof aiProviderAnalysisSchema>;

export const consensusResultSchema = z.object({
  consensusSignal: z.enum(signalTypes),
  consensusConfidence: z.number().min(0).max(100),
  consensusRisk: z.enum(riskGrades),
  agreementLevel: z.number().min(0).max(100),
  providers: z.array(aiProviderAnalysisSchema),
  hasConsensus: z.boolean(),
  reasoning: z.string(),
  warnings: z.array(z.string()),
});
export type ConsensusResult = z.infer<typeof consensusResultSchema>;

export * from "./models/auth";
export * from "./models/trading";
