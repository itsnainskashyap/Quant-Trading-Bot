import type { TradingPair, SignalType, MarketMetrics, MarketRegime } from "@shared/schema";
import { getAssetProfile, getAssetMemory, isAssetInCooldown, getCooldownReason } from "./assetIntelligence";
import type { AIAgentResult } from "./enhancedAI";

export interface MetaJudgeInput {
  pair: TradingPair;
  proposedSignal: SignalType;
  confidence: number;
  agentResults: AIAgentResult[];
  metrics: MarketMetrics;
  currentPrice: number;
}

export interface BlockReason {
  code: string;
  severity: 'warning' | 'block';
  description: string;
}

export interface MetaJudgeResult {
  approved: boolean;
  originalSignal: SignalType;
  finalSignal: SignalType;
  adjustedConfidence: number;
  blockReasons: BlockReason[];
  warnings: string[];
  marketStructure: {
    regime: MarketRegime;
    quality: 'clean' | 'choppy' | 'unclear';
    volatilityState: 'normal' | 'elevated' | 'extreme';
    trendStrength: 'strong' | 'moderate' | 'weak' | 'none';
  };
  recommendation: string;
}

function detectMarketRegime(metrics: MarketMetrics): MarketRegime {
  const adx = metrics.adx || 25;
  const volatility = metrics.volatility || 5;
  const trendStrength = metrics.trendStrength || 'MODERATE';
  
  if (adx > 25 && (trendStrength === 'STRONG' || trendStrength === 'MODERATE')) {
    return 'TREND';
  }
  
  if (adx < 20 && volatility < 8) {
    return 'RANGE';
  }
  
  return 'CHAOS';
}

function detectMarketQuality(metrics: MarketMetrics): 'clean' | 'choppy' | 'unclear' {
  const bollingerWidth = metrics.bollingerWidth || 2;
  const atr = metrics.atrPercent || 2;
  const volatility = metrics.volatility || 5;
  
  if (volatility > 12 || bollingerWidth > 4 || atr > 4) {
    return 'choppy';
  }
  
  if (volatility < 3 && bollingerWidth < 1.5) {
    return 'unclear';
  }
  
  return 'clean';
}

function detectVolatilityState(metrics: MarketMetrics, pair: TradingPair): 'normal' | 'elevated' | 'extreme' {
  const profile = getAssetProfile(pair);
  const volatility = metrics.volatility || 5;
  const atr = metrics.atrPercent || 2;
  
  const baseVolatility = profile.volatilityClass === 'extreme' ? 10 : 
                         profile.volatilityClass === 'high' ? 7 : 
                         profile.volatilityClass === 'medium' ? 5 : 3;
  
  if (volatility > baseVolatility * 2 || atr > 5) {
    return 'extreme';
  }
  
  if (volatility > baseVolatility * 1.5 || atr > 3.5) {
    return 'elevated';
  }
  
  return 'normal';
}

function calculateAgentDisagreement(agents: AIAgentResult[]): number {
  if (agents.length < 2) return 0;
  
  const buyVotes = agents.filter(a => a.signal === 'BUY').length;
  const sellVotes = agents.filter(a => a.signal === 'SELL').length;
  const noTradeVotes = agents.filter(a => a.signal === 'NO_TRADE').length;
  
  const total = agents.length;
  const maxVotes = Math.max(buyVotes, sellVotes, noTradeVotes);
  
  return 100 - (maxVotes / total) * 100;
}

function detectFakeBreakout(metrics: MarketMetrics, currentPrice: number): boolean {
  const resistance = metrics.nearestResistance || currentPrice * 1.05;
  const support = metrics.nearestSupport || currentPrice * 0.95;
  
  const nearResistance = Math.abs(currentPrice - resistance) / currentPrice < 0.005;
  const nearSupport = Math.abs(currentPrice - support) / currentPrice < 0.005;
  
  if ((nearResistance || nearSupport) && !metrics.volumeConfirmation) {
    return true;
  }
  
  return false;
}

function detectWickHeavyCandles(metrics: MarketMetrics): boolean {
  const volatility = metrics.volatility || 5;
  const bollingerWidth = metrics.bollingerWidth || 2;
  
  return volatility > 10 && bollingerWidth > 3;
}

export function evaluateSignal(input: MetaJudgeInput): MetaJudgeResult {
  const { pair, proposedSignal, confidence, agentResults, metrics, currentPrice } = input;
  
  const blockReasons: BlockReason[] = [];
  const warnings: string[] = [];
  let adjustedConfidence = confidence;
  let approved = true;
  let finalSignal: SignalType = proposedSignal;
  
  const regime = detectMarketRegime(metrics);
  const quality = detectMarketQuality(metrics);
  const volatilityState = detectVolatilityState(metrics, pair);
  const trendStrength = metrics.trendStrength?.toLowerCase() as 'strong' | 'moderate' | 'weak' | 'none' || 'moderate';
  
  if (isAssetInCooldown(pair)) {
    const reason = getCooldownReason(pair);
    blockReasons.push({
      code: 'ASSET_COOLDOWN',
      severity: 'block',
      description: reason || 'Asset is in cooldown mode'
    });
    approved = false;
  }
  
  if (regime === 'CHAOS') {
    blockReasons.push({
      code: 'CHAOTIC_MARKET',
      severity: 'block',
      description: 'Market is in chaotic regime - high risk of false signals'
    });
    approved = false;
  }
  
  if (quality === 'choppy') {
    blockReasons.push({
      code: 'CHOPPY_CONDITIONS',
      severity: 'block',
      description: 'Market conditions are choppy with unclear direction'
    });
    approved = false;
  }
  
  if (volatilityState === 'extreme') {
    blockReasons.push({
      code: 'EXTREME_VOLATILITY',
      severity: 'block',
      description: 'Volatility is extremely high - unsafe trading conditions'
    });
    approved = false;
  } else if (volatilityState === 'elevated') {
    warnings.push('Elevated volatility detected - increased risk');
    adjustedConfidence *= 0.9;
  }
  
  const disagreement = calculateAgentDisagreement(agentResults);
  if (disagreement > 50) {
    blockReasons.push({
      code: 'HIGH_DISAGREEMENT',
      severity: 'block',
      description: `AI agents have ${disagreement.toFixed(0)}% disagreement - no clear consensus`
    });
    approved = false;
  } else if (disagreement > 30) {
    warnings.push(`Moderate AI disagreement (${disagreement.toFixed(0)}%)`);
    adjustedConfidence *= 0.85;
  }
  
  if (detectFakeBreakout(metrics, currentPrice)) {
    blockReasons.push({
      code: 'FAKE_BREAKOUT_RISK',
      severity: 'block',
      description: 'Price near key level without volume confirmation - high fake breakout risk'
    });
    approved = false;
  }
  
  if (detectWickHeavyCandles(metrics)) {
    blockReasons.push({
      code: 'WICK_HEAVY_CANDLES',
      severity: 'block',
      description: 'Wick-heavy candle patterns detected - high manipulation risk'
    });
    approved = false;
  }
  
  if (!metrics.volumeConfirmation) {
    warnings.push('Volume confirmation is weak');
    adjustedConfidence *= 0.9;
  }
  
  const conflictingIndicators = checkIndicatorConflicts(metrics, proposedSignal);
  if (conflictingIndicators.length >= 3) {
    blockReasons.push({
      code: 'INDICATOR_CONFLICT',
      severity: 'block',
      description: `${conflictingIndicators.length} indicators contradict the signal: ${conflictingIndicators.join(', ')}`
    });
    approved = false;
  } else if (conflictingIndicators.length >= 2) {
    warnings.push(`${conflictingIndicators.length} conflicting indicators: ${conflictingIndicators.join(', ')}`);
    adjustedConfidence *= 0.85;
  }
  
  const memory = getAssetMemory(pair);
  if (memory.consecutiveLosses >= 2) {
    warnings.push(`Asset has ${memory.consecutiveLosses} consecutive losses - extra caution advised`);
    adjustedConfidence *= 0.85;
  }
  
  if (memory.winRate < 35 && memory.recentSignals.length >= 5) {
    blockReasons.push({
      code: 'POOR_PERFORMANCE',
      severity: 'block',
      description: `Recent win rate is ${memory.winRate.toFixed(0)}% - below minimum threshold`
    });
    approved = false;
  }
  
  if (adjustedConfidence < 65) {
    blockReasons.push({
      code: 'LOW_CONFIDENCE',
      severity: 'block',
      description: `Adjusted confidence ${adjustedConfidence.toFixed(0)}% below minimum 65% threshold`
    });
    approved = false;
  }
  
  if (!approved) {
    finalSignal = 'NO_TRADE';
    adjustedConfidence = 0;
  }
  
  const recommendation = generateRecommendation(approved, blockReasons, warnings, proposedSignal);
  
  return {
    approved,
    originalSignal: proposedSignal,
    finalSignal,
    adjustedConfidence,
    blockReasons,
    warnings,
    marketStructure: {
      regime,
      quality,
      volatilityState,
      trendStrength
    },
    recommendation
  };
}

function checkIndicatorConflicts(metrics: MarketMetrics, signal: SignalType): string[] {
  const conflicts: string[] = [];
  
  if (signal === 'BUY') {
    if (metrics.rsiSignal === 'OVERBOUGHT') conflicts.push('RSI overbought');
    if (metrics.macdTrend === 'BEARISH') conflicts.push('MACD bearish');
    if (metrics.maTrend === 'BEARISH') conflicts.push('MA trend bearish');
    if (metrics.stochasticSignal === 'OVERBOUGHT') conflicts.push('Stochastic overbought');
    if (metrics.bollingerPosition === 'ABOVE_UPPER') conflicts.push('Above upper Bollinger');
  } else if (signal === 'SELL') {
    if (metrics.rsiSignal === 'OVERSOLD') conflicts.push('RSI oversold');
    if (metrics.macdTrend === 'BULLISH') conflicts.push('MACD bullish');
    if (metrics.maTrend === 'BULLISH') conflicts.push('MA trend bullish');
    if (metrics.stochasticSignal === 'OVERSOLD') conflicts.push('Stochastic oversold');
    if (metrics.bollingerPosition === 'BELOW_LOWER') conflicts.push('Below lower Bollinger');
  }
  
  return conflicts;
}

function generateRecommendation(
  approved: boolean, 
  blockReasons: BlockReason[], 
  warnings: string[],
  proposedSignal: SignalType
): string {
  if (approved) {
    if (warnings.length > 0) {
      return `Signal APPROVED with caution. ${warnings.length} warning(s) detected: ${warnings[0]}. Proceed with tight stop-loss.`;
    }
    return `Signal APPROVED. Market conditions support a ${proposedSignal} position with standard risk parameters.`;
  }
  
  const primaryBlock = blockReasons[0];
  if (primaryBlock) {
    return `Signal BLOCKED: ${primaryBlock.description}. Wait for cleaner market conditions before trading this asset.`;
  }
  
  return 'Signal BLOCKED due to unfavorable market conditions. NO TRADE is the recommended action.';
}

export function getMetaJudgeSummary(result: MetaJudgeResult): string {
  const status = result.approved ? 'APPROVED' : 'BLOCKED';
  const blockCount = result.blockReasons.length;
  const warnCount = result.warnings.length;
  
  let summary = `META-JUDGE: ${status} | `;
  summary += `Market: ${result.marketStructure.regime}/${result.marketStructure.quality} | `;
  summary += `Volatility: ${result.marketStructure.volatilityState} | `;
  
  if (!result.approved) {
    summary += `Blocked by ${blockCount} condition(s): ${result.blockReasons.map(r => r.code).join(', ')}`;
  } else {
    summary += `Confidence: ${result.adjustedConfidence.toFixed(0)}%`;
    if (warnCount > 0) {
      summary += ` | ${warnCount} warning(s)`;
    }
  }
  
  return summary;
}
