import { randomUUID } from "crypto";
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
    const btcBasePrice = 67000 + (Math.random() - 0.5) * 2000;
    const ethBasePrice = 3400 + (Math.random() - 0.5) * 200;

    this.prices.set("BTC-USDT", {
      pair: "BTC-USDT",
      price: btcBasePrice,
      change24h: (Math.random() - 0.5) * 6,
      high24h: btcBasePrice * 1.02,
      low24h: btcBasePrice * 0.98,
      volume24h: 25000000000 + Math.random() * 5000000000,
      timestamp: Date.now(),
    });

    this.prices.set("ETH-USDT", {
      pair: "ETH-USDT",
      price: ethBasePrice,
      change24h: (Math.random() - 0.5) * 8,
      high24h: ethBasePrice * 1.025,
      low24h: ethBasePrice * 0.975,
      volume24h: 12000000000 + Math.random() * 3000000000,
      timestamp: Date.now(),
    });

    this.metrics.set("BTC-USDT", this.generateMetrics("BTC-USDT"));
    this.metrics.set("ETH-USDT", this.generateMetrics("ETH-USDT"));
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
      for (const [pair, data] of this.prices) {
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
}

export const storage = new MemStorage();
