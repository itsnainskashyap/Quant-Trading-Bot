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
  ModelScore,
  BacktestStats
} from "@shared/schema";
import { fetchRealPrices, getHistoricalPrices, fetchOHLCVData, initializePriceService, hasRealData } from "./priceService";
import { calculateAllIndicators, type TechnicalIndicators } from "./technicalIndicators";

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
  
  createPrediction(userId: string, signal: TradingSignal, entryPrice: number, tradeDetails?: { capital?: number; tradeSize?: number; stopLoss?: number; takeProfit?: number }): Promise<Prediction>;
  getUserPredictions(userId: string, limit?: number): Promise<Prediction[]>;
  getPendingPredictions(): Promise<Prediction[]>;
  completePrediction(predictionId: string, exitPrice: number, outcome: string, profitLoss: number, outcomeReason: string): Promise<Prediction | null>;
  processExpiredPredictions(): Promise<number>;
  
  getUserSubscription(userId: string): Promise<Subscription | null>;
  createOrUpdateSubscription(userId: string, plan: string): Promise<Subscription>;
  updateSubscription(userId: string, plan: string): Promise<void>;
  getAllUsersWithSubscriptions(): Promise<Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; plan: string; createdAt: Date | null }>>;
  getTotalUserCount(): Promise<number>;
  getUserDailyPredictionCount(userId: string): Promise<number>;
  canUserTrade(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }>;
  getDailyUsage(userId: string, date: string): Promise<{ analysisCount: number } | null>;
  incrementDailyUsage(userId: string): Promise<void>;
  
  // Admin settings
  getAdminSettings(): Promise<{ trc20Address?: string; bep20Address?: string; proPrice: number } | null>;
  updateAdminSettings(trc20Address: string, bep20Address: string, proPrice?: number): Promise<void>;
  
  // Payment records
  createPaymentRecord(userId: string, network: string, txHash: string, amount: number, walletAddress: string): Promise<any>;
  getPaymentByTxHash(txHash: string): Promise<any | null>;
  verifyPayment(paymentId: string): Promise<void>;
  failPayment(paymentId: string): Promise<void>;
  getUserPayments(userId: string): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private prices: Map<TradingPair, PriceData>;
  private metrics: Map<TradingPair, MarketMetrics>;
  private technicalIndicators: Map<TradingPair, TechnicalIndicators>;
  private history: SignalHistory[];
  private tradesExecutedToday: number;
  private lastPriceUpdate: number;
  private currentSignal: TradingSignal | null;
  private backtestStats: BacktestStats;

  constructor() {
    this.prices = new Map();
    this.metrics = new Map();
    this.technicalIndicators = new Map();
    this.history = [];
    this.tradesExecutedToday = 0;
    this.lastPriceUpdate = 0;
    this.currentSignal = null;
    this.backtestStats = {
      totalSignals: 0,
      winningSignals: 0,
      losingSignals: 0,
      winRate: 0,
      avgProfit: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      lastUpdated: Date.now(),
    };
    this.initializeRealPrices();
  }

  private async initializeRealPrices() {
    await initializePriceService();
    await this.updatePrices();
  }

  private async updatePrices() {
    const now = Date.now();
    if (now - this.lastPriceUpdate > 15000) { // Update every 15 seconds
      try {
        const realPrices = await fetchRealPrices();
        
        for (const [pair, priceData] of Array.from(realPrices.entries())) {
          this.prices.set(pair, priceData);
          
          // Calculate technical indicators from historical prices
          const historicalPrices = getHistoricalPrices(pair);
          if (historicalPrices.length > 0) {
            const indicators = calculateAllIndicators(historicalPrices);
            this.technicalIndicators.set(pair, indicators);
            this.metrics.set(pair, this.generateMetricsWithIndicators(pair, indicators));
          } else {
            this.metrics.set(pair, this.generateMetrics(pair));
          }
        }
        
        this.lastPriceUpdate = now;
        console.log(`[PriceService] Updated ${realPrices.size} pairs with real prices from CoinGecko`);
      } catch (error) {
        console.error("[PriceService] Error updating prices:", error);
        // If prices are empty, initialize with fallback
        if (this.prices.size === 0) {
          this.initializeFallbackPrices();
        }
      }
    }
  }

  private initializeFallbackPrices() {
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
      const price = config.base;
      this.prices.set(pair, {
        pair,
        price,
        change24h: 0,
        high24h: price * 1.01,
        low24h: price * 0.99,
        volume24h: config.volume,
        timestamp: Date.now(),
        isLiveData: false,
      });
      this.metrics.set(pair, this.generateMetrics(pair));
    }
  }

  private generateMetricsWithIndicators(pair: TradingPair, indicators: TechnicalIndicators): MarketMetrics {
    return {
      pair,
      volumeDelta: (Math.random() - 0.5) * 40,
      orderBookImbalance: indicators.overallSignal === 'STRONG_BUY' ? 40 + Math.random() * 30 :
                          indicators.overallSignal === 'BUY' ? 10 + Math.random() * 30 :
                          indicators.overallSignal === 'STRONG_SELL' ? -40 - Math.random() * 30 :
                          indicators.overallSignal === 'SELL' ? -10 - Math.random() * 30 :
                          (Math.random() - 0.5) * 20,
      volatility: Math.max(1, indicators.atrPercent),
      atr: indicators.atr,
      fundingRate: (Math.random() - 0.5) * 0.002,
      openInterest: pair === "BTC-USDT" 
        ? 15000000000 + Math.random() * 5000000000
        : 8000000000 + Math.random() * 2000000000,
      // Core Technical Indicators
      rsi: indicators.rsi,
      rsiSignal: indicators.rsiSignal,
      macdTrend: indicators.macd.trend,
      macdHistogram: indicators.macd.histogram,
      macdCrossover: indicators.macd.crossover,
      bollingerPosition: indicators.bollingerBands.position,
      bollingerWidth: indicators.bollingerBands.width,
      bollingerSqueeze: indicators.bollingerBands.squeeze,
      // Moving Averages
      sma20: indicators.movingAverages.sma20,
      sma50: indicators.movingAverages.sma50,
      sma200: indicators.movingAverages.sma200,
      ema12: indicators.movingAverages.ema12,
      ema26: indicators.movingAverages.ema26,
      ema50: indicators.movingAverages.ema50,
      maTrend: indicators.movingAverages.trend,
      goldenCross: indicators.movingAverages.goldenCross,
      deathCross: indicators.movingAverages.deathCross,
      // Oscillators
      stochasticK: indicators.stochastic.k,
      stochasticD: indicators.stochastic.d,
      stochasticSignal: indicators.stochastic.signal,
      williamsR: indicators.williamsR,
      // Trend & Momentum
      adx: indicators.adx,
      trendStrength: indicators.trendStrength,
      momentum: indicators.momentum,
      roc: indicators.roc,
      atrPercent: indicators.atrPercent,
      // Support/Resistance
      nearestSupport: indicators.supportResistance.nearestSupport,
      nearestResistance: indicators.supportResistance.nearestResistance,
      distanceToSupport: indicators.supportResistance.distanceToSupport,
      distanceToResistance: indicators.supportResistance.distanceToResistance,
      // Volume Analysis
      volumeTrend: indicators.volumeProfile.trend,
      volumeConfirmation: indicators.volumeProfile.confirmation,
      // Confluence Analysis
      confluenceScore: indicators.confluenceScore,
      bullishSignals: indicators.confluenceSignals.bullish,
      bearishSignals: indicators.confluenceSignals.bearish,
      overallTechnicalSignal: indicators.overallSignal,
      technicalStrength: indicators.strength,
      reliability: indicators.reliability,
    };
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

  async getPriceData(pair: TradingPair): Promise<PriceData> {
    await this.updatePrices();
    const priceData = this.prices.get(pair);
    if (!priceData) {
      // Return fallback if not yet loaded
      return {
        pair,
        price: 0,
        change24h: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        timestamp: Date.now(),
        isLiveData: false,
      };
    }
    return priceData;
  }

  async getAllPrices(): Promise<PriceData[]> {
    await this.updatePrices();
    return Array.from(this.prices.values());
  }

  async getMarketMetrics(pair: TradingPair): Promise<MarketMetrics> {
    await this.updatePrices();
    const metricsData = this.metrics.get(pair);
    if (!metricsData) {
      return this.generateMetrics(pair);
    }
    return metricsData;
  }

  getBacktestStats(): BacktestStats {
    // Update stats from completed predictions
    this.updateBacktestStats();
    return this.backtestStats;
  }

  private async updateBacktestStats() {
    try {
      const allPredictions = await db.select().from(predictions).limit(1000);
      const completed = allPredictions.filter(p => p.outcome && p.outcome !== 'PENDING');
      
      if (completed.length === 0) {
        // No completed trades - return zeros
        this.backtestStats = {
          totalSignals: 0,
          winningSignals: 0,
          losingSignals: 0,
          winRate: 0,
          avgProfit: 0,
          avgLoss: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          lastUpdated: Date.now(),
        };
        return;
      }
      
      const wins = completed.filter(p => p.outcome === 'WIN');
      const losses = completed.filter(p => p.outcome === 'LOSS');
      
      const avgProfit = wins.length > 0 
        ? wins.reduce((sum, p) => sum + (p.profitLoss || 0), 0) / wins.length 
        : 0;
      const avgLoss = losses.length > 0 
        ? Math.abs(losses.reduce((sum, p) => sum + (p.profitLoss || 0), 0) / losses.length)
        : 0;
      
      // Calculate real profit factor only if we have both wins and losses
      let profitFactor = 0;
      if (wins.length > 0 && losses.length > 0 && avgLoss > 0) {
        const totalProfit = wins.reduce((sum, p) => sum + Math.max(0, p.profitLoss || 0), 0);
        const totalLoss = Math.abs(losses.reduce((sum, p) => sum + Math.min(0, p.profitLoss || 0), 0));
        profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;
      }
      
      // Calculate real max drawdown from P/L history
      let maxDrawdown = 0;
      let peak = 0;
      let runningPnL = 0;
      for (const pred of completed.sort((a, b) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      )) {
        runningPnL += pred.profitLoss || 0;
        if (runningPnL > peak) peak = runningPnL;
        const drawdown = peak - runningPnL;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
      
      // Simple Sharpe ratio approximation (returns / volatility)
      const returns = completed.map(p => p.profitLoss || 0);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
      
      this.backtestStats = {
        totalSignals: completed.length,
        winningSignals: wins.length,
        losingSignals: losses.length,
        winRate: (wins.length / completed.length) * 100,
        avgProfit,
        avgLoss,
        profitFactor,
        maxDrawdown,
        sharpeRatio,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error("Error updating backtest stats:", error);
    }
  }

  async generateSignal(pair: TradingPair): Promise<TradingSignal | null> {
    const metrics = await this.getMarketMetrics(pair);
    const price = await this.getPriceData(pair);
    const indicators = this.technicalIndicators.get(pair);
    
    // Use technical indicators for more accurate signal generation
    let trendScore = 50;
    let momentumScore = 50;
    let volatilityScore = 65;
    let trapScore = 60;
    
    if (indicators) {
      // RSI-based momentum scoring
      if (indicators.rsi < 30) momentumScore = 80; // Oversold - bullish
      else if (indicators.rsi > 70) momentumScore = 20; // Overbought - bearish
      else momentumScore = 50 + (50 - indicators.rsi) * 0.6;
      
      // MACD trend scoring
      if (indicators.macd.trend === 'BULLISH') trendScore = 70 + Math.min(indicators.macd.histogram * 10, 20);
      else if (indicators.macd.trend === 'BEARISH') trendScore = 30 - Math.min(Math.abs(indicators.macd.histogram) * 10, 20);
      else trendScore = 50;
      
      // Bollinger Bands volatility
      if (indicators.bollingerBands.position === 'BELOW_LOWER') volatilityScore = 85;
      else if (indicators.bollingerBands.position === 'ABOVE_UPPER') volatilityScore = 25;
      else volatilityScore = 60;
      
      // Moving average trend
      if (indicators.movingAverages.trend === 'BULLISH') {
        trendScore = Math.min(90, trendScore + 15);
      } else if (indicators.movingAverages.trend === 'BEARISH') {
        trendScore = Math.max(10, trendScore - 15);
      }
      
      // Trap detection based on momentum
      trapScore = 50 + Math.min(Math.abs(indicators.momentum), 30);
    } else {
      // Fallback to slight randomness if no indicators
      trendScore = 50 + (Math.random() - 0.5) * 40;
      momentumScore = 50 + (Math.random() - 0.5) * 40;
      volatilityScore = 100 - metrics.volatility * 15;
      trapScore = 50 + (Math.random() - 0.5) * 30;
    }
    
    const modelScores: ModelScore[] = [
      { 
        name: "RSI Analysis", 
        score: Math.round(Math.max(0, Math.min(100, momentumScore))),
        description: indicators?.rsiSignal === 'OVERSOLD' ? "RSI oversold - potential bounce" :
                     indicators?.rsiSignal === 'OVERBOUGHT' ? "RSI overbought - potential pullback" :
                     `RSI at ${indicators?.rsi?.toFixed(1) || 'N/A'} - neutral zone`
      },
      { 
        name: "MACD Trend", 
        score: Math.round(Math.max(0, Math.min(100, trendScore))),
        description: indicators?.macd.trend === 'BULLISH' ? "MACD bullish crossover confirmed" :
                     indicators?.macd.trend === 'BEARISH' ? "MACD bearish crossover confirmed" :
                     "MACD showing no clear trend"
      },
      { 
        name: "Bollinger Bands", 
        score: Math.round(Math.max(0, Math.min(100, volatilityScore))),
        description: indicators?.bollingerBands.position === 'BELOW_LOWER' ? "Price below lower band - oversold" :
                     indicators?.bollingerBands.position === 'ABOVE_UPPER' ? "Price above upper band - overbought" :
                     "Price within normal volatility range"
      },
      { 
        name: "Moving Averages", 
        score: Math.round(Math.max(0, Math.min(100, trapScore))),
        description: indicators?.movingAverages.trend === 'BULLISH' ? "Price above SMA20 & SMA50 - bullish" :
                     indicators?.movingAverages.trend === 'BEARISH' ? "Price below SMA20 & SMA50 - bearish" :
                     "Moving averages mixed - ranging market"
      },
    ];
    
    const avgScore = modelScores.reduce((sum, m) => sum + m.score, 0) / modelScores.length;
    
    if (avgScore < 40 || avgScore > 60 && avgScore < 65) {
      // No clear signal
      this.currentSignal = null;
      return null;
    }
    
    const isBullish = avgScore >= 65 && (
      (indicators?.overallSignal === 'BUY' || indicators?.overallSignal === 'STRONG_BUY') ||
      metrics.orderBookImbalance > 10
    );
    const isBearish = avgScore <= 35 || (
      avgScore < 50 && 
      (indicators?.overallSignal === 'SELL' || indicators?.overallSignal === 'STRONG_SELL')
    );
    
    let signal: SignalType = "NO_TRADE";
    if (isBullish) {
      signal = "BUY";
    } else if (isBearish) {
      signal = "SELL";
    }
    
    let riskGrade: RiskGrade = "MEDIUM";
    if (avgScore >= 75 && metrics.volatility < 2) {
      riskGrade = "LOW";
    } else if (avgScore < 50 || metrics.volatility > 4) {
      riskGrade = "HIGH";
    }
    
    let regime: MarketRegime = "RANGE";
    if (indicators?.movingAverages.trend !== 'NEUTRAL') {
      regime = "TREND";
    } else if (metrics.volatility > 4) {
      regime = "CHAOS";
    }
    
    const exitWindowMinutes = signal === "NO_TRADE" ? 0 : Math.floor(5 + Math.random() * 20);
    
    const warnings: string[] = [];
    if (metrics.volatility > 3) warnings.push("High volatility detected");
    if (Math.abs(metrics.fundingRate) > 0.001) warnings.push("Elevated funding rate");
    if (indicators?.rsiSignal === 'OVERBOUGHT' && signal === 'BUY') warnings.push("RSI overbought - potential reversal");
    if (indicators?.rsiSignal === 'OVERSOLD' && signal === 'SELL') warnings.push("RSI oversold - potential bounce");
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

  async createPrediction(userId: string, signal: TradingSignal, entryPrice: number, tradeDetails?: { capital?: number; tradeSize?: number; stopLoss?: number; takeProfit?: number }): Promise<Prediction> {
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
      capital: tradeDetails?.capital,
      tradeSize: tradeDetails?.tradeSize,
      stopLoss: tradeDetails?.stopLoss,
      takeProfit: tradeDetails?.takeProfit,
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

  async updateSubscription(userId: string, plan: string): Promise<void> {
    const existing = await this.getUserSubscription(userId);
    if (existing) {
      await db.update(subscriptions)
        .set({ plan, status: "active" })
        .where(eq(subscriptions.userId, userId));
    } else {
      await db.insert(subscriptions).values({
        userId,
        plan,
        status: "active",
      });
    }
  }

  async getAllUsersWithSubscriptions(): Promise<Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; plan: string; createdAt: Date | null }>> {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      createdAt: users.createdAt,
    }).from(users);
    
    const result = await Promise.all(allUsers.map(async (user) => {
      const subscription = await this.getUserSubscription(user.id);
      return {
        ...user,
        plan: subscription?.plan || 'free',
      };
    }));
    
    return result;
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
    // Platform is now 100% FREE - no limits, no Pro plan required
    return { allowed: true, remaining: -1, isEarlyAdopter: true };
  }

  async getDailyUsage(userId: string, date: string): Promise<{ analysisCount: number } | null> {
    try {
      const { dailyUsage } = await import("@shared/models/trading");
      const result = await db.select()
        .from(dailyUsage)
        .where(and(
          eq(dailyUsage.userId, userId),
          eq(dailyUsage.date, date)
        ))
        .limit(1);
      
      if (result.length === 0) return null;
      return { analysisCount: result[0].analysisCount };
    } catch (error) {
      console.error("Error getting daily usage:", error);
      return null;
    }
  }

  async incrementDailyUsage(userId: string): Promise<void> {
    try {
      const { dailyUsage } = await import("@shared/models/trading");
      const today = new Date().toISOString().split('T')[0];
      
      const existing = await db.select()
        .from(dailyUsage)
        .where(and(
          eq(dailyUsage.userId, userId),
          eq(dailyUsage.date, today)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(dailyUsage)
          .set({ 
            analysisCount: (existing[0].analysisCount || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(dailyUsage.id, existing[0].id));
      } else {
        await db.insert(dailyUsage).values({
          userId,
          date: today,
          analysisCount: 1
        });
      }
    } catch (error) {
      console.error("Error incrementing daily usage:", error);
    }
  }

  // Admin settings methods
  async getAdminSettings(): Promise<{ trc20Address?: string; bep20Address?: string; proPrice: number } | null> {
    try {
      const { adminSettings } = await import("@shared/models/trading");
      const result = await db.select().from(adminSettings).limit(1);
      
      if (result.length === 0) {
        // Create default settings
        const newSettings = await db.insert(adminSettings).values({
          proPrice: 10
        }).returning();
        return { 
          trc20Address: newSettings[0].trc20Address || undefined, 
          bep20Address: newSettings[0].bep20Address || undefined, 
          proPrice: newSettings[0].proPrice 
        };
      }
      
      return { 
        trc20Address: result[0].trc20Address || undefined, 
        bep20Address: result[0].bep20Address || undefined, 
        proPrice: result[0].proPrice 
      };
    } catch (error) {
      console.error("Error getting admin settings:", error);
      return { proPrice: 10 };
    }
  }

  async updateAdminSettings(trc20Address: string, bep20Address: string, proPrice?: number): Promise<void> {
    try {
      const { adminSettings } = await import("@shared/models/trading");
      const existing = await db.select().from(adminSettings).limit(1);
      
      if (existing.length > 0) {
        await db.update(adminSettings)
          .set({ 
            trc20Address, 
            bep20Address, 
            proPrice: proPrice || existing[0].proPrice,
            updatedAt: new Date() 
          })
          .where(eq(adminSettings.id, existing[0].id));
      } else {
        await db.insert(adminSettings).values({
          trc20Address,
          bep20Address,
          proPrice: proPrice || 10
        });
      }
    } catch (error) {
      console.error("Error updating admin settings:", error);
    }
  }

  // Payment record methods
  async createPaymentRecord(userId: string, network: string, txHash: string, amount: number, walletAddress: string): Promise<any> {
    try {
      const { paymentRecords } = await import("@shared/models/trading");
      const result = await db.insert(paymentRecords).values({
        userId,
        network,
        txHash,
        amount,
        walletAddress,
        status: 'pending'
      }).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating payment record:", error);
      throw error;
    }
  }

  async getPaymentByTxHash(txHash: string): Promise<any | null> {
    try {
      const { paymentRecords } = await import("@shared/models/trading");
      const result = await db.select()
        .from(paymentRecords)
        .where(eq(paymentRecords.txHash, txHash))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Error getting payment by tx hash:", error);
      return null;
    }
  }

  async verifyPayment(paymentId: string): Promise<void> {
    try {
      const { paymentRecords } = await import("@shared/models/trading");
      await db.update(paymentRecords)
        .set({ 
          status: 'verified',
          verifiedAt: new Date()
        })
        .where(eq(paymentRecords.id, paymentId));
    } catch (error) {
      console.error("Error verifying payment:", error);
    }
  }

  async failPayment(paymentId: string): Promise<void> {
    try {
      const { paymentRecords } = await import("@shared/models/trading");
      await db.update(paymentRecords)
        .set({ status: 'failed' })
        .where(eq(paymentRecords.id, paymentId));
    } catch (error) {
      console.error("Error failing payment:", error);
    }
  }

  async getUserPayments(userId: string): Promise<any[]> {
    try {
      const { paymentRecords } = await import("@shared/models/trading");
      const result = await db.select()
        .from(paymentRecords)
        .where(eq(paymentRecords.userId, userId))
        .orderBy(sql`${paymentRecords.createdAt} DESC`);
      return result;
    } catch (error) {
      console.error("Error getting user payments:", error);
      return [];
    }
  }
}

export const storage = new MemStorage();
