import { randomUUID } from "crypto";
import { eq, and, lt, count, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { predictions, subscriptions, type Prediction, type Subscription } from "@shared/models/trading";
import { users } from "@shared/models/auth";
import type { 
  TradingSignal, 
  PriceData, 
  MarketMetrics, 
  SignalHistory,
  TradingPair,
  SignalType,
  RiskGrade,
  MarketRegime,
  ModelScore
} from "@shared/schema";

export interface IStorage {
  getPriceData(pair: TradingPair): Promise<PriceData>;
  getAllPrices(): Promise<PriceData[]>;
  getMarketMetrics(pair: TradingPair): Promise<MarketMetrics>;
  generateSignal(pair: TradingPair): Promise<TradingSignal | null>;
  getSignalHistory(): Promise<SignalHistory[]>;
  addToHistory(signal: TradingSignal): Promise<void>;
  getProtectionStatus(): Promise<{
    tradesRemaining: number;
    maxTrades: number;
    drawdownPercent: number;
    isVolatilityHigh: boolean;
    isNewsPause: boolean;
  }>;
  isDataFeedHealthy(): boolean;
  
  createPrediction(userId: string, signal: TradingSignal, entryPrice: number): Promise<Prediction>;
  getUserPredictions(userId: string, limit?: number): Promise<Prediction[]>;
  getPendingPredictions(): Promise<Prediction[]>;
  completePrediction(predictionId: string, exitPrice: number, outcome: string, profitLoss: number, outcomeReason: string): Promise<Prediction | null>;
  processExpiredPredictions(): Promise<number>;
  
  getUserSubscription(userId: string): Promise<Subscription | null>;
  createOrUpdateSubscription(userId: string, plan: string): Promise<Subscription>;
  getTotalUserCount(): Promise<number>;
  getUserDailyPredictionCount(userId: string): Promise<number>;
  canUserTrade(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }>;
}

export class MemStorage implements IStorage {
  private prices: Map<TradingPair, PriceData>;
  private metrics: Map<TradingPair, MarketMetrics>;
  private history: SignalHistory[];
  private tradesExecutedToday: number;
  private lastPriceUpdate: number;
  private currentSignal: TradingSignal | null;

  constructor() {
    this.prices = new Map();
    this.metrics = new Map();
    this.history = [];
    this.tradesExecutedToday = 0;
    this.lastPriceUpdate = Date.now();
    this.currentSignal = null;
    this.initializeMockData();
  }

  private initializeMockData() {
    const cryptoPrices: Record<TradingPair, { base: number; volatility: number; volume: number }> = {
      "BTC-USDT": { base: 97000, volatility: 2000, volume: 25000000000 },
      "ETH-USDT": { base: 3400, volatility: 200, volume: 12000000000 },
      "SOL-USDT": { base: 185, volatility: 15, volume: 3000000000 },
      "XRP-USDT": { base: 2.35, volatility: 0.15, volume: 2000000000 },
      "DOGE-USDT": { base: 0.32, volatility: 0.03, volume: 1500000000 },
      "BNB-USDT": { base: 680, volatility: 30, volume: 1800000000 },
      "ADA-USDT": { base: 0.95, volatility: 0.08, volume: 800000000 },
      "AVAX-USDT": { base: 38, volatility: 3, volume: 600000000 },
      "DOT-USDT": { base: 7.5, volatility: 0.5, volume: 400000000 },
      "MATIC-USDT": { base: 0.52, volatility: 0.04, volume: 350000000 },
      "LINK-USDT": { base: 22, volatility: 2, volume: 500000000 },
      "LTC-USDT": { base: 105, volatility: 8, volume: 400000000 },
      "SHIB-USDT": { base: 0.000022, volatility: 0.000002, volume: 300000000 },
      "ATOM-USDT": { base: 9.5, volatility: 0.8, volume: 200000000 },
      "UNI-USDT": { base: 13, volatility: 1, volume: 250000000 },
    };

    for (const [pair, config] of Object.entries(cryptoPrices) as [TradingPair, typeof cryptoPrices["BTC-USDT"]][]) {
      const price = config.base + (Math.random() - 0.5) * config.volatility;
      this.prices.set(pair, {
        pair,
        price,
        change24h: (Math.random() - 0.5) * 8,
        high24h: price * 1.02,
        low24h: price * 0.98,
        volume24h: config.volume + Math.random() * config.volume * 0.2,
        timestamp: Date.now(),
      });
      this.metrics.set(pair, this.generateMetrics(pair));
    }
  }

  private generateMetrics(pair: TradingPair): MarketMetrics {
    return {
      pair,
      volumeDelta: (Math.random() - 0.5) * 40,
      orderBookImbalance: (Math.random() - 0.5) * 80,
      volatility: 1 + Math.random() * 4,
      atr: pair === "BTC-USDT" ? 200 + Math.random() * 300 : 50 + Math.random() * 100,
      fundingRate: (Math.random() - 0.5) * 0.002,
      openInterest: pair === "BTC-USDT" 
        ? 15000000000 + Math.random() * 5000000000
        : 8000000000 + Math.random() * 2000000000,
    };
  }

  private updatePrices() {
    const now = Date.now();
    if (now - this.lastPriceUpdate > 3000) {
      for (const [pair, data] of Array.from(this.prices.entries())) {
        const changePercent = (Math.random() - 0.5) * 0.5;
        const newPrice = data.price * (1 + changePercent / 100);
        this.prices.set(pair, {
          ...data,
          price: newPrice,
          high24h: Math.max(data.high24h, newPrice),
          low24h: Math.min(data.low24h, newPrice),
          change24h: data.change24h + (Math.random() - 0.5) * 0.2,
          timestamp: now,
        });
        
        this.metrics.set(pair, this.generateMetrics(pair));
      }
      this.lastPriceUpdate = now;
    }
  }

  async getPriceData(pair: TradingPair): Promise<PriceData> {
    this.updatePrices();
    return this.prices.get(pair)!;
  }

  async getAllPrices(): Promise<PriceData[]> {
    this.updatePrices();
    return Array.from(this.prices.values());
  }

  async getMarketMetrics(pair: TradingPair): Promise<MarketMetrics> {
    this.updatePrices();
    return this.metrics.get(pair)!;
  }

  async generateSignal(pair: TradingPair): Promise<TradingSignal | null> {
    const metrics = await this.getMarketMetrics(pair);
    const price = await this.getPriceData(pair);
    
    const trendScore = 50 + (Math.random() - 0.5) * 60;
    const momentumScore = 50 + (Math.random() - 0.5) * 60;
    const volatilityScore = 100 - metrics.volatility * 15;
    const trapScore = 50 + (Math.random() - 0.5) * 40;
    
    const modelScores: ModelScore[] = [
      { 
        name: "Trend Detection", 
        score: Math.round(trendScore),
        description: trendScore > 65 ? "Strong directional bias detected" : "Weak or no clear trend"
      },
      { 
        name: "Momentum Confirmation", 
        score: Math.round(momentumScore),
        description: momentumScore > 65 ? "Price momentum aligned with trend" : "Momentum divergence detected"
      },
      { 
        name: "Volatility Filter", 
        score: Math.round(Math.max(0, Math.min(100, volatilityScore))),
        description: volatilityScore > 65 ? "Favorable volatility conditions" : "Elevated volatility risk"
      },
      { 
        name: "Liquidity Trap Detector", 
        score: Math.round(trapScore),
        description: trapScore > 60 ? "No trap patterns detected" : "Potential fake breakout zone"
      },
    ];
    
    const avgScore = modelScores.reduce((sum, m) => sum + m.score, 0) / modelScores.length;
    
    if (avgScore < 55) {
      this.currentSignal = null;
      return null;
    }
    
    const isBullish = metrics.orderBookImbalance > 10 && trendScore > 55;
    const isBearish = metrics.orderBookImbalance < -10 && trendScore > 55;
    
    let signal: SignalType = "NO_TRADE";
    if (avgScore >= 65 && isBullish) {
      signal = "BUY";
    } else if (avgScore >= 65 && isBearish) {
      signal = "SELL";
    }
    
    let riskGrade: RiskGrade = "MEDIUM";
    if (avgScore >= 75 && metrics.volatility < 2) {
      riskGrade = "LOW";
    } else if (avgScore < 60 || metrics.volatility > 4) {
      riskGrade = "HIGH";
    }
    
    let regime: MarketRegime = "RANGE";
    if (trendScore > 70) {
      regime = "TREND";
    } else if (metrics.volatility > 4 || trapScore < 40) {
      regime = "CHAOS";
    }
    
    const exitWindowMinutes = signal === "NO_TRADE" ? 0 : Math.floor(5 + Math.random() * 20);
    
    const warnings: string[] = [];
    if (metrics.volatility > 3) warnings.push("High volatility detected");
    if (Math.abs(metrics.fundingRate) > 0.001) warnings.push("Elevated funding rate");
    if (trapScore < 50) warnings.push("Potential liquidity trap zone");
    if (avgScore < 65) warnings.push("Low confidence - consider skipping");
    
    this.currentSignal = {
      id: randomUUID(),
      pair,
      signal,
      confidence: Math.round(avgScore),
      riskGrade,
      exitWindowMinutes,
      exitTimestamp: Date.now() + exitWindowMinutes * 60 * 1000,
      marketRegime: regime,
      modelScores,
      reasoning: "",
      warnings,
      timestamp: Date.now(),
    };
    
    return this.currentSignal;
  }

  async getSignalHistory(): Promise<SignalHistory[]> {
    return this.history.slice(-10);
  }

  async addToHistory(signal: TradingSignal): Promise<void> {
    this.history.push({
      id: signal.id,
      pair: signal.pair,
      signal: signal.signal,
      confidence: signal.confidence,
      timestamp: signal.timestamp,
      outcome: signal.signal === "NO_TRADE" ? "SKIPPED" : "PENDING",
    });
    
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
  }

  async getProtectionStatus() {
    const metrics = await this.getMarketMetrics("BTC-USDT");
    return {
      tradesRemaining: Math.max(0, 10 - this.tradesExecutedToday),
      maxTrades: 10,
      drawdownPercent: Math.random() * 3,
      isVolatilityHigh: metrics.volatility > 4,
      isNewsPause: Math.random() < 0.1,
    };
  }

  isDataFeedHealthy(): boolean {
    return Date.now() - this.lastPriceUpdate < 10000;
  }

  async createPrediction(userId: string, signal: TradingSignal, entryPrice: number): Promise<Prediction> {
    const exitTimestamp = new Date(signal.exitTimestamp);
    
    const [prediction] = await db.insert(predictions).values({
      userId,
      pair: signal.pair,
      signal: signal.signal,
      confidence: signal.confidence,
      riskGrade: signal.riskGrade,
      entryPrice,
      exitWindowMinutes: signal.exitWindowMinutes,
      exitTimestamp,
      reasoning: signal.reasoning,
      outcome: "PENDING",
    }).returning();
    
    this.tradesExecutedToday++;
    
    return prediction;
  }

  async getUserPredictions(userId: string, limit: number = 20): Promise<Prediction[]> {
    return db.select()
      .from(predictions)
      .where(eq(predictions.userId, userId))
      .orderBy(sql`${predictions.createdAt} DESC`)
      .limit(limit);
  }

  async getPendingPredictions(): Promise<Prediction[]> {
    const now = new Date();
    return db.select()
      .from(predictions)
      .where(
        and(
          eq(predictions.outcome, "PENDING"),
          lt(predictions.exitTimestamp, now)
        )
      );
  }

  async completePrediction(
    predictionId: string, 
    exitPrice: number, 
    outcome: string, 
    profitLoss: number, 
    outcomeReason: string
  ): Promise<Prediction | null> {
    const [updated] = await db.update(predictions)
      .set({
        exitPrice,
        outcome,
        profitLoss,
        outcomeReason,
        completedAt: new Date(),
      })
      .where(eq(predictions.id, predictionId))
      .returning();
    
    return updated || null;
  }

  async processExpiredPredictions(): Promise<number> {
    const pending = await this.getPendingPredictions();
    let processed = 0;
    
    for (const prediction of pending) {
      const currentPrice = await this.getPriceData(prediction.pair as TradingPair);
      const exitPrice = currentPrice.price;
      const entryPrice = prediction.entryPrice;
      
      let profitLoss = 0;
      let outcome = "NEUTRAL";
      
      if (prediction.signal === "BUY") {
        profitLoss = ((exitPrice - entryPrice) / entryPrice) * 100;
        outcome = profitLoss > 0.1 ? "WIN" : profitLoss < -0.1 ? "LOSS" : "NEUTRAL";
      } else if (prediction.signal === "SELL") {
        profitLoss = ((entryPrice - exitPrice) / entryPrice) * 100;
        outcome = profitLoss > 0.1 ? "WIN" : profitLoss < -0.1 ? "LOSS" : "NEUTRAL";
      } else {
        outcome = "SKIPPED";
        profitLoss = 0;
      }
      
      const outcomeReason = this.generateOutcomeReason(prediction, exitPrice, profitLoss, outcome);
      
      await this.completePrediction(prediction.id, exitPrice, outcome, profitLoss, outcomeReason);
      processed++;
    }
    
    return processed;
  }

  private generateOutcomeReason(prediction: Prediction, exitPrice: number, profitLoss: number, outcome: string): string {
    const direction = prediction.signal === "BUY" ? "long" : "short";
    const priceChange = ((exitPrice - prediction.entryPrice) / prediction.entryPrice * 100).toFixed(2);
    
    if (outcome === "WIN") {
      return `Successful ${direction} trade on ${prediction.pair}. Entry at $${prediction.entryPrice.toFixed(2)}, exit at $${exitPrice.toFixed(2)}. Price moved ${priceChange}% in our favor, yielding ${profitLoss.toFixed(2)}% profit. AI confidence of ${prediction.confidence}% was validated.`;
    } else if (outcome === "LOSS") {
      return `Unsuccessful ${direction} trade on ${prediction.pair}. Entry at $${prediction.entryPrice.toFixed(2)}, exit at $${exitPrice.toFixed(2)}. Price moved ${priceChange}% against position, resulting in ${Math.abs(profitLoss).toFixed(2)}% loss. Market conditions changed unexpectedly after entry.`;
    } else if (outcome === "NEUTRAL") {
      return `Flat trade on ${prediction.pair}. Entry at $${prediction.entryPrice.toFixed(2)}, exit at $${exitPrice.toFixed(2)}. Price movement of ${priceChange}% was insufficient for meaningful profit or loss within the exit window.`;
    } else {
      return `Trade skipped due to NO_TRADE signal. Market conditions did not meet the 65% confidence threshold required for entry. Capital preservation prioritized.`;
    }
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    
    return subscription || null;
  }

  async createOrUpdateSubscription(userId: string, plan: string): Promise<Subscription> {
    const existing = await this.getUserSubscription(userId);
    
    if (existing) {
      const [updated] = await db.update(subscriptions)
        .set({ plan, status: "active", startDate: new Date() })
        .where(eq(subscriptions.id, existing.id))
        .returning();
      return updated;
    }
    
    const [subscription] = await db.insert(subscriptions)
      .values({
        userId,
        plan,
        status: "active",
      })
      .returning();
    
    return subscription;
  }

  async getTotalUserCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(users);
    return result[0]?.count || 0;
  }

  async getUserDailyPredictionCount(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const result = await db.select({ count: count() })
      .from(predictions)
      .where(
        and(
          eq(predictions.userId, userId),
          gte(predictions.createdAt, startOfDay)
        )
      );
    
    return result[0]?.count || 0;
  }

  async isUserEarlyAdopter(userId: string): Promise<boolean> {
    const FIRST_N_USERS_FREE = 1000;
    
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (user?.isEarlyAdopter) {
      return true;
    }
    
    const usersBeforeCount = await db.select({ count: count() })
      .from(users)
      .where(lt(users.createdAt, user?.createdAt || new Date()));
    
    const position = (usersBeforeCount[0]?.count || 0) + 1;
    
    if (position <= FIRST_N_USERS_FREE && user) {
      await db.update(users)
        .set({ isEarlyAdopter: true })
        .where(eq(users.id, userId));
      return true;
    }
    
    return false;
  }

  async canUserTrade(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number; isEarlyAdopter?: boolean }> {
    const FREE_DAILY_LIMIT = 10;
    
    const subscription = await this.getUserSubscription(userId);
    
    if (subscription?.plan === "pro" && subscription.status === "active") {
      return { allowed: true, remaining: -1, isEarlyAdopter: false };
    }
    
    const isEarlyAdopter = await this.isUserEarlyAdopter(userId);
    
    if (isEarlyAdopter) {
      const dailyCount = await this.getUserDailyPredictionCount(userId);
      const remaining = Math.max(0, FREE_DAILY_LIMIT - dailyCount);
      
      if (dailyCount >= FREE_DAILY_LIMIT) {
        return { 
          allowed: false, 
          reason: "Daily limit reached. Free users get 10 signals per day. Upgrade to Pro for unlimited signals.",
          remaining: 0,
          isEarlyAdopter: true
        };
      }
      
      return { allowed: true, remaining, isEarlyAdopter: true };
    }
    
    return { 
      allowed: false, 
      reason: "Free access is no longer available. Please subscribe to Pro (₹1999/month) for unlimited trading signals.",
      remaining: 0,
      isEarlyAdopter: false
    };
  }
}

export const storage = new MemStorage();
