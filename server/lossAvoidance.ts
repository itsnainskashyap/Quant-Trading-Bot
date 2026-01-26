import type { TradingPair, MarketMetrics } from "@shared/schema";
import { getAssetProfile, getAssetMemory, updateAssetMemory } from "./assetIntelligence";

export interface LossAvoidanceState {
  pair: TradingPair;
  isBlocked: boolean;
  blockReason: string | null;
  cooldownActive: boolean;
  cooldownRemainingMinutes: number;
  consecutiveLosses: number;
  confidenceReduction: number;
  stabilityScore: number;
  riskLevel: 'safe' | 'caution' | 'danger' | 'blocked';
}

export interface MarketStabilityCheck {
  isStable: boolean;
  stabilityScore: number;
  issues: string[];
  conditions: {
    volatilityNormalized: boolean;
    cleanCandleStructure: boolean;
    indicatorsAligned: boolean;
    spreadNormal: boolean;
    liquidityAdequate: boolean;
  };
}

function checkMarketStability(pair: TradingPair, metrics: MarketMetrics): MarketStabilityCheck {
  const profile = getAssetProfile(pair);
  const issues: string[] = [];
  let stabilityScore = 100;
  
  const baseVolatility = profile.volatilityClass === 'extreme' ? 12 : 
                         profile.volatilityClass === 'high' ? 8 : 
                         profile.volatilityClass === 'medium' ? 5 : 3;
  
  const volatility = metrics.volatility || 5;
  const volatilityNormalized = volatility <= baseVolatility * 1.3;
  if (!volatilityNormalized) {
    issues.push(`Volatility ${volatility.toFixed(1)}% exceeds normal range`);
    stabilityScore -= 25;
  }
  
  const atr = metrics.atrPercent || 2;
  const bollingerWidth = metrics.bollingerWidth || 2;
  const cleanCandleStructure = atr < 4 && bollingerWidth < 3.5;
  if (!cleanCandleStructure) {
    issues.push('Candle structure is erratic or wick-heavy');
    stabilityScore -= 20;
  }
  
  const rsiNeutral = (metrics.rsi || 50) >= 35 && (metrics.rsi || 50) <= 65;
  const macdClear = metrics.macdTrend !== 'NEUTRAL' || metrics.macdCrossover === 'NONE';
  const indicatorsAligned = rsiNeutral && macdClear;
  if (!indicatorsAligned) {
    issues.push('Technical indicators showing mixed signals');
    stabilityScore -= 15;
  }
  
  const spreadNormal = (metrics.orderBookImbalance || 0) < 30;
  if (!spreadNormal) {
    issues.push('Order book showing unusual imbalance');
    stabilityScore -= 15;
  }
  
  const volume = metrics.volumeDelta || 0;
  const liquidityAdequate = volume > 0.5;
  if (!liquidityAdequate) {
    issues.push('Low liquidity period detected');
    stabilityScore -= 25;
  }
  
  return {
    isStable: stabilityScore >= 60,
    stabilityScore: Math.max(0, stabilityScore),
    issues,
    conditions: {
      volatilityNormalized,
      cleanCandleStructure,
      indicatorsAligned,
      spreadNormal,
      liquidityAdequate
    }
  };
}

export function checkLossAvoidance(pair: TradingPair, metrics: MarketMetrics): LossAvoidanceState {
  const memory = getAssetMemory(pair);
  const now = Date.now();
  
  let isBlocked = false;
  let blockReason: string | null = null;
  let confidenceReduction = 0;
  let riskLevel: 'safe' | 'caution' | 'danger' | 'blocked' = 'safe';
  
  const cooldownActive = now < memory.cooldownUntil;
  const cooldownRemainingMinutes = cooldownActive ? Math.ceil((memory.cooldownUntil - now) / 60000) : 0;
  
  if (cooldownActive) {
    isBlocked = true;
    blockReason = `Asset in cooldown (${cooldownRemainingMinutes} min remaining) due to consecutive losses`;
    riskLevel = 'blocked';
  }
  
  if (memory.consecutiveLosses >= 3) {
    isBlocked = true;
    blockReason = `${memory.consecutiveLosses} consecutive losses - automatic cooldown activated`;
    riskLevel = 'blocked';
    
    if (!cooldownActive) {
      memory.cooldownUntil = now + 30 * 60 * 1000;
    }
  } else if (memory.consecutiveLosses >= 2) {
    confidenceReduction = 20;
    riskLevel = 'danger';
  } else if (memory.consecutiveLosses === 1) {
    confidenceReduction = 10;
    riskLevel = 'caution';
  }
  
  const stability = checkMarketStability(pair, metrics);
  
  if (!stability.isStable && !isBlocked) {
    if (stability.stabilityScore < 40) {
      isBlocked = true;
      blockReason = `Unstable market conditions: ${stability.issues[0] || 'Multiple issues detected'}`;
      riskLevel = 'blocked';
    } else if (stability.stabilityScore < 60) {
      confidenceReduction = Math.max(confidenceReduction, 25);
      if (riskLevel !== 'blocked' && riskLevel !== 'danger') {
        riskLevel = 'caution';
      }
    }
  }
  
  if (!stability.conditions.volatilityNormalized && metrics.volatility && metrics.volatility > 15) {
    isBlocked = true;
    blockReason = 'Abnormal volatility spike detected';
    riskLevel = 'blocked';
  }
  
  if (!stability.conditions.liquidityAdequate) {
    isBlocked = true;
    blockReason = 'Low liquidity period - high slippage risk';
    riskLevel = 'blocked';
  }
  
  if (!stability.conditions.spreadNormal && (metrics.orderBookImbalance || 0) > 50) {
    isBlocked = true;
    blockReason = 'Sudden spread expansion - potential manipulation';
    riskLevel = 'blocked';
  }
  
  return {
    pair,
    isBlocked,
    blockReason,
    cooldownActive,
    cooldownRemainingMinutes,
    consecutiveLosses: memory.consecutiveLosses,
    confidenceReduction,
    stabilityScore: stability.stabilityScore,
    riskLevel
  };
}

export function recordTradeOutcome(pair: TradingPair, outcome: 'win' | 'loss' | 'expired'): void {
  const memory = getAssetMemory(pair);
  
  if (outcome === 'loss') {
    memory.consecutiveLosses++;
    memory.consecutiveWins = 0;
    memory.performanceScore = Math.max(0, memory.performanceScore - 10);
    
    if (memory.consecutiveLosses >= 3) {
      memory.cooldownUntil = Date.now() + 30 * 60 * 1000;
    }
  } else if (outcome === 'win') {
    memory.consecutiveWins++;
    memory.consecutiveLosses = 0;
    memory.performanceScore = Math.min(100, memory.performanceScore + 5);
    
    memory.cooldownUntil = 0;
  }
  
  updateAssetMemory(pair, 'NO_TRADE', 0, outcome);
}

export function canExitCooldown(pair: TradingPair, metrics: MarketMetrics): boolean {
  const memory = getAssetMemory(pair);
  const now = Date.now();
  
  if (now >= memory.cooldownUntil) {
    const stability = checkMarketStability(pair, metrics);
    
    if (stability.isStable && stability.stabilityScore >= 70) {
      memory.cooldownUntil = 0;
      memory.consecutiveLosses = Math.max(0, memory.consecutiveLosses - 1);
      return true;
    }
  }
  
  return false;
}

export function getLossAvoidanceSummary(state: LossAvoidanceState): string {
  const riskEmoji = {
    'safe': 'Safe',
    'caution': 'Caution',
    'danger': 'Danger',
    'blocked': 'BLOCKED'
  };
  
  let summary = `LOSS AVOIDANCE [${state.pair}]: ${riskEmoji[state.riskLevel]} | `;
  summary += `Stability: ${state.stabilityScore}% | `;
  
  if (state.consecutiveLosses > 0) {
    summary += `Losses: ${state.consecutiveLosses} | `;
  }
  
  if (state.cooldownActive) {
    summary += `Cooldown: ${state.cooldownRemainingMinutes}min | `;
  }
  
  if (state.confidenceReduction > 0) {
    summary += `Confidence -${state.confidenceReduction}% | `;
  }
  
  if (state.blockReason) {
    summary += `Reason: ${state.blockReason}`;
  }
  
  return summary;
}

export function getDefensiveRiskMultiplier(state: LossAvoidanceState): number {
  if (state.isBlocked) return 0;
  
  let multiplier = 1.0;
  
  multiplier -= state.confidenceReduction / 100;
  
  switch (state.riskLevel) {
    case 'danger': multiplier *= 0.7; break;
    case 'caution': multiplier *= 0.85; break;
    case 'safe': multiplier *= 1.0; break;
  }
  
  const stabilityFactor = state.stabilityScore / 100;
  multiplier *= (0.5 + stabilityFactor * 0.5);
  
  return Math.max(0.3, Math.min(1.0, multiplier));
}
