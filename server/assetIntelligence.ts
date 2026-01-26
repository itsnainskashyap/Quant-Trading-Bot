import type { TradingPair, MarketMetrics, SignalType, RiskGrade } from "@shared/schema";

export interface AssetProfile {
  symbol: TradingPair;
  category: 'major' | 'altcoin' | 'meme' | 'defi';
  volatilityClass: 'low' | 'medium' | 'high' | 'extreme';
  typicalSpread: number;
  avgDailyRange: number;
  rsiOversold: number;
  rsiOverbought: number;
  atrMultiplier: number;
  volumeThreshold: number;
  correlatedAssets: TradingPair[];
  sessionBias: {
    asia: 'bullish' | 'bearish' | 'neutral';
    london: 'bullish' | 'bearish' | 'neutral';
    ny: 'bullish' | 'bearish' | 'neutral';
  };
}

export interface AssetMemory {
  recentSignals: Array<{
    timestamp: number;
    signal: SignalType;
    confidence: number;
    outcome: 'win' | 'loss' | 'pending' | 'expired';
    pnlPercent: number;
  }>;
  consecutiveLosses: number;
  consecutiveWins: number;
  winRate: number;
  avgConfidence: number;
  lastSignalTime: number;
  cooldownUntil: number;
  volatilityHistory: number[];
  performanceScore: number;
}

const assetProfiles: Record<TradingPair, AssetProfile> = {
  "BTC-USDT": {
    symbol: "BTC-USDT",
    category: 'major',
    volatilityClass: 'medium',
    typicalSpread: 0.01,
    avgDailyRange: 3.5,
    rsiOversold: 28,
    rsiOverbought: 72,
    atrMultiplier: 1.5,
    volumeThreshold: 1.2,
    correlatedAssets: ["ETH-USDT"],
    sessionBias: { asia: 'neutral', london: 'bullish', ny: 'bullish' }
  },
  "ETH-USDT": {
    symbol: "ETH-USDT",
    category: 'major',
    volatilityClass: 'medium',
    typicalSpread: 0.02,
    avgDailyRange: 4.0,
    rsiOversold: 28,
    rsiOverbought: 72,
    atrMultiplier: 1.5,
    volumeThreshold: 1.3,
    correlatedAssets: ["BTC-USDT"],
    sessionBias: { asia: 'neutral', london: 'bullish', ny: 'bullish' }
  },
  "SOL-USDT": {
    symbol: "SOL-USDT",
    category: 'altcoin',
    volatilityClass: 'high',
    typicalSpread: 0.03,
    avgDailyRange: 6.0,
    rsiOversold: 25,
    rsiOverbought: 75,
    atrMultiplier: 2.0,
    volumeThreshold: 1.5,
    correlatedAssets: ["ETH-USDT"],
    sessionBias: { asia: 'bullish', london: 'neutral', ny: 'bullish' }
  },
  "XRP-USDT": {
    symbol: "XRP-USDT",
    category: 'altcoin',
    volatilityClass: 'high',
    typicalSpread: 0.02,
    avgDailyRange: 5.5,
    rsiOversold: 25,
    rsiOverbought: 75,
    atrMultiplier: 1.8,
    volumeThreshold: 1.4,
    correlatedAssets: ["BTC-USDT"],
    sessionBias: { asia: 'bullish', london: 'neutral', ny: 'neutral' }
  },
  "DOGE-USDT": {
    symbol: "DOGE-USDT",
    category: 'meme',
    volatilityClass: 'extreme',
    typicalSpread: 0.04,
    avgDailyRange: 8.0,
    rsiOversold: 22,
    rsiOverbought: 78,
    atrMultiplier: 2.5,
    volumeThreshold: 2.0,
    correlatedAssets: ["SHIB-USDT"],
    sessionBias: { asia: 'neutral', london: 'neutral', ny: 'bullish' }
  },
  "BNB-USDT": {
    symbol: "BNB-USDT",
    category: 'major',
    volatilityClass: 'medium',
    typicalSpread: 0.02,
    avgDailyRange: 4.0,
    rsiOversold: 28,
    rsiOverbought: 72,
    atrMultiplier: 1.5,
    volumeThreshold: 1.2,
    correlatedAssets: ["BTC-USDT", "ETH-USDT"],
    sessionBias: { asia: 'bullish', london: 'neutral', ny: 'neutral' }
  },
  "ADA-USDT": {
    symbol: "ADA-USDT",
    category: 'altcoin',
    volatilityClass: 'high',
    typicalSpread: 0.03,
    avgDailyRange: 5.5,
    rsiOversold: 25,
    rsiOverbought: 75,
    atrMultiplier: 1.8,
    volumeThreshold: 1.4,
    correlatedAssets: ["DOT-USDT"],
    sessionBias: { asia: 'neutral', london: 'bullish', ny: 'neutral' }
  },
  "AVAX-USDT": {
    symbol: "AVAX-USDT",
    category: 'altcoin',
    volatilityClass: 'high',
    typicalSpread: 0.03,
    avgDailyRange: 6.5,
    rsiOversold: 25,
    rsiOverbought: 75,
    atrMultiplier: 2.0,
    volumeThreshold: 1.5,
    correlatedAssets: ["SOL-USDT", "ETH-USDT"],
    sessionBias: { asia: 'neutral', london: 'bullish', ny: 'bullish' }
  },
  "DOT-USDT": {
    symbol: "DOT-USDT",
    category: 'altcoin',
    volatilityClass: 'high',
    typicalSpread: 0.03,
    avgDailyRange: 5.0,
    rsiOversold: 25,
    rsiOverbought: 75,
    atrMultiplier: 1.8,
    volumeThreshold: 1.4,
    correlatedAssets: ["ADA-USDT", "ATOM-USDT"],
    sessionBias: { asia: 'neutral', london: 'bullish', ny: 'neutral' }
  },
  "MATIC-USDT": {
    symbol: "MATIC-USDT",
    category: 'altcoin',
    volatilityClass: 'high',
    typicalSpread: 0.03,
    avgDailyRange: 6.0,
    rsiOversold: 25,
    rsiOverbought: 75,
    atrMultiplier: 2.0,
    volumeThreshold: 1.5,
    correlatedAssets: ["ETH-USDT"],
    sessionBias: { asia: 'neutral', london: 'neutral', ny: 'bullish' }
  },
  "LINK-USDT": {
    symbol: "LINK-USDT",
    category: 'defi',
    volatilityClass: 'high',
    typicalSpread: 0.03,
    avgDailyRange: 5.5,
    rsiOversold: 25,
    rsiOverbought: 75,
    atrMultiplier: 1.8,
    volumeThreshold: 1.4,
    correlatedAssets: ["ETH-USDT", "UNI-USDT"],
    sessionBias: { asia: 'neutral', london: 'bullish', ny: 'bullish' }
  },
  "LTC-USDT": {
    symbol: "LTC-USDT",
    category: 'major',
    volatilityClass: 'medium',
    typicalSpread: 0.02,
    avgDailyRange: 4.5,
    rsiOversold: 28,
    rsiOverbought: 72,
    atrMultiplier: 1.5,
    volumeThreshold: 1.3,
    correlatedAssets: ["BTC-USDT"],
    sessionBias: { asia: 'neutral', london: 'neutral', ny: 'bullish' }
  },
  "SHIB-USDT": {
    symbol: "SHIB-USDT",
    category: 'meme',
    volatilityClass: 'extreme',
    typicalSpread: 0.05,
    avgDailyRange: 10.0,
    rsiOversold: 20,
    rsiOverbought: 80,
    atrMultiplier: 3.0,
    volumeThreshold: 2.5,
    correlatedAssets: ["DOGE-USDT"],
    sessionBias: { asia: 'neutral', london: 'neutral', ny: 'bullish' }
  },
  "ATOM-USDT": {
    symbol: "ATOM-USDT",
    category: 'altcoin',
    volatilityClass: 'high',
    typicalSpread: 0.03,
    avgDailyRange: 5.5,
    rsiOversold: 25,
    rsiOverbought: 75,
    atrMultiplier: 1.8,
    volumeThreshold: 1.4,
    correlatedAssets: ["DOT-USDT"],
    sessionBias: { asia: 'neutral', london: 'bullish', ny: 'neutral' }
  },
  "UNI-USDT": {
    symbol: "UNI-USDT",
    category: 'defi',
    volatilityClass: 'high',
    typicalSpread: 0.03,
    avgDailyRange: 6.0,
    rsiOversold: 25,
    rsiOverbought: 75,
    atrMultiplier: 2.0,
    volumeThreshold: 1.5,
    correlatedAssets: ["LINK-USDT", "ETH-USDT"],
    sessionBias: { asia: 'neutral', london: 'bullish', ny: 'bullish' }
  }
};

const assetMemoryStore: Map<TradingPair, AssetMemory> = new Map();

function initializeMemory(pair: TradingPair): AssetMemory {
  return {
    recentSignals: [],
    consecutiveLosses: 0,
    consecutiveWins: 0,
    winRate: 50,
    avgConfidence: 0,
    lastSignalTime: 0,
    cooldownUntil: 0,
    volatilityHistory: [],
    performanceScore: 50
  };
}

export function getAssetProfile(pair: TradingPair): AssetProfile {
  return assetProfiles[pair];
}

export function getAssetMemory(pair: TradingPair): AssetMemory {
  if (!assetMemoryStore.has(pair)) {
    assetMemoryStore.set(pair, initializeMemory(pair));
  }
  return assetMemoryStore.get(pair)!;
}

export function updateAssetMemory(
  pair: TradingPair, 
  signal: SignalType, 
  confidence: number,
  outcome?: 'win' | 'loss' | 'expired'
): void {
  const memory = getAssetMemory(pair);
  const now = Date.now();
  
  if (outcome) {
    const lastSignal = memory.recentSignals[memory.recentSignals.length - 1];
    if (lastSignal && lastSignal.outcome === 'pending') {
      lastSignal.outcome = outcome;
      lastSignal.pnlPercent = outcome === 'win' ? 2 : outcome === 'loss' ? -2 : 0;
      
      if (outcome === 'win') {
        memory.consecutiveWins++;
        memory.consecutiveLosses = 0;
        memory.performanceScore = Math.min(100, memory.performanceScore + 5);
      } else if (outcome === 'loss') {
        memory.consecutiveLosses++;
        memory.consecutiveWins = 0;
        memory.performanceScore = Math.max(0, memory.performanceScore - 10);
        
        if (memory.consecutiveLosses >= 3) {
          memory.cooldownUntil = now + 30 * 60 * 1000;
        }
      }
      
      const completedSignals = memory.recentSignals.filter(s => s.outcome !== 'pending' && s.outcome !== 'expired');
      const wins = completedSignals.filter(s => s.outcome === 'win').length;
      memory.winRate = completedSignals.length > 0 ? (wins / completedSignals.length) * 100 : 50;
    }
  } else {
    memory.recentSignals.push({
      timestamp: now,
      signal,
      confidence,
      outcome: 'pending',
      pnlPercent: 0
    });
    memory.lastSignalTime = now;
    
    if (memory.recentSignals.length > 20) {
      memory.recentSignals.shift();
    }
    
    const recentConfidences = memory.recentSignals.map(s => s.confidence);
    memory.avgConfidence = recentConfidences.reduce((a, b) => a + b, 0) / recentConfidences.length;
  }
  
  assetMemoryStore.set(pair, memory);
}

export function getCurrentSession(): 'asia' | 'london' | 'ny' {
  const utcHour = new Date().getUTCHours();
  if (utcHour >= 0 && utcHour < 8) return 'asia';
  if (utcHour >= 8 && utcHour < 14) return 'london';
  return 'ny';
}

export function getAssetSpecificThresholds(pair: TradingPair, metrics: MarketMetrics): {
  adjustedRsiOversold: number;
  adjustedRsiOverbought: number;
  confidenceMultiplier: number;
  volatilityAdjustment: number;
  sessionBias: 'bullish' | 'bearish' | 'neutral';
} {
  const profile = getAssetProfile(pair);
  const memory = getAssetMemory(pair);
  const session = getCurrentSession();
  
  let confidenceMultiplier = 1.0;
  if (memory.consecutiveLosses >= 2) {
    confidenceMultiplier *= 0.8;
  }
  if (memory.winRate < 40) {
    confidenceMultiplier *= 0.9;
  }
  if (memory.performanceScore > 70) {
    confidenceMultiplier *= 1.1;
  }
  
  const currentVol = metrics.volatility || 0;
  let volatilityAdjustment = 1.0;
  if (profile.volatilityClass === 'extreme' && currentVol > 15) {
    volatilityAdjustment = 0.7;
  } else if (profile.volatilityClass === 'high' && currentVol > 12) {
    volatilityAdjustment = 0.8;
  }
  
  memory.volatilityHistory.push(currentVol);
  if (memory.volatilityHistory.length > 10) {
    memory.volatilityHistory.shift();
  }
  
  return {
    adjustedRsiOversold: profile.rsiOversold,
    adjustedRsiOverbought: profile.rsiOverbought,
    confidenceMultiplier: confidenceMultiplier * volatilityAdjustment,
    volatilityAdjustment,
    sessionBias: profile.sessionBias[session]
  };
}

export function isAssetInCooldown(pair: TradingPair): boolean {
  const memory = getAssetMemory(pair);
  return Date.now() < memory.cooldownUntil;
}

export function getCooldownReason(pair: TradingPair): string | null {
  const memory = getAssetMemory(pair);
  if (Date.now() < memory.cooldownUntil) {
    const remainingMinutes = Math.ceil((memory.cooldownUntil - Date.now()) / 60000);
    return `Asset in cooldown due to ${memory.consecutiveLosses} consecutive losses. ${remainingMinutes} minutes remaining.`;
  }
  return null;
}

export function getAssetRiskAdjustment(pair: TradingPair): number {
  const profile = getAssetProfile(pair);
  const memory = getAssetMemory(pair);
  
  let adjustment = 1.0;
  
  switch (profile.volatilityClass) {
    case 'extreme': adjustment *= 0.7; break;
    case 'high': adjustment *= 0.85; break;
    case 'medium': adjustment *= 1.0; break;
    case 'low': adjustment *= 1.1; break;
  }
  
  if (memory.consecutiveLosses >= 2) {
    adjustment *= 0.8;
  }
  
  if (memory.performanceScore < 30) {
    adjustment *= 0.7;
  } else if (memory.performanceScore > 70) {
    adjustment *= 1.15;
  }
  
  return Math.max(0.5, Math.min(1.3, adjustment));
}
