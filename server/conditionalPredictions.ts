import type { TradingPair, SignalType, MarketMetrics } from "@shared/schema";
import { getAssetProfile, getAssetMemory } from "./assetIntelligence";

export interface TriggerCondition {
  type: 'price_above' | 'price_below' | 'breakout' | 'breakdown' | 'retest_success' | 'retest_fail' | 'volume_confirm' | 'candle_close';
  targetPrice?: number;
  referenceLevel?: 'resistance' | 'support' | 'ma20' | 'ma50';
  volumeMultiplier?: number;
  candleType?: 'bullish' | 'bearish';
  description: string;
}

export interface ConditionalSignal {
  pair: TradingPair;
  intent: SignalType;
  triggerConditions: TriggerCondition[];
  expiryTime: number;
  expiryMinutes: number;
  confidence: number;
  isTriggered: boolean;
  triggerPrice?: number;
  reasoning: string;
  cancelReason?: string;
}

const pendingSignals: Map<string, ConditionalSignal> = new Map();

export function createConditionalSignal(
  pair: TradingPair,
  intent: SignalType,
  currentPrice: number,
  metrics: MarketMetrics,
  confidence: number,
  reasoning: string,
  expiryMinutes: number = 5
): ConditionalSignal {
  const profile = getAssetProfile(pair);
  const conditions: TriggerCondition[] = [];
  
  if (intent === 'NO_TRADE') {
    return {
      pair,
      intent: 'NO_TRADE',
      triggerConditions: [],
      expiryTime: Date.now() + expiryMinutes * 60 * 1000,
      expiryMinutes,
      confidence,
      isTriggered: false,
      reasoning,
    };
  }
  
  const resistance = metrics.nearestResistance || currentPrice * 1.02;
  const support = metrics.nearestSupport || currentPrice * 0.98;
  const atr = metrics.atr || currentPrice * 0.02;
  
  if (intent === 'BUY') {
    if (currentPrice < resistance && currentPrice > resistance * 0.995) {
      conditions.push({
        type: 'breakout',
        targetPrice: resistance * 1.002,
        referenceLevel: 'resistance',
        description: `Price must close above resistance at $${resistance.toFixed(2)}`
      });
    } else if (currentPrice > support && currentPrice < support * 1.01) {
      conditions.push({
        type: 'retest_success',
        targetPrice: support,
        referenceLevel: 'support',
        description: `Price must successfully retest support at $${support.toFixed(2)} and bounce`
      });
    } else {
      conditions.push({
        type: 'price_above',
        targetPrice: currentPrice * 1.002,
        description: `Next candle must close above $${(currentPrice * 1.002).toFixed(2)}`
      });
    }
    
    if (metrics.volumeConfirmation === false) {
      conditions.push({
        type: 'volume_confirm',
        volumeMultiplier: profile.volumeThreshold,
        description: `Volume must exceed ${profile.volumeThreshold}x average`
      });
    }
    
    conditions.push({
      type: 'candle_close',
      candleType: 'bullish',
      description: 'Confirmation candle must close bullish'
    });
  } else if (intent === 'SELL') {
    if (currentPrice > support && currentPrice < support * 1.005) {
      conditions.push({
        type: 'breakdown',
        targetPrice: support * 0.998,
        referenceLevel: 'support',
        description: `Price must close below support at $${support.toFixed(2)}`
      });
    } else if (currentPrice < resistance && currentPrice > resistance * 0.99) {
      conditions.push({
        type: 'retest_fail',
        targetPrice: resistance,
        referenceLevel: 'resistance',
        description: `Price must fail to break above resistance at $${resistance.toFixed(2)}`
      });
    } else {
      conditions.push({
        type: 'price_below',
        targetPrice: currentPrice * 0.998,
        description: `Next candle must close below $${(currentPrice * 0.998).toFixed(2)}`
      });
    }
    
    if (metrics.volumeConfirmation === false) {
      conditions.push({
        type: 'volume_confirm',
        volumeMultiplier: profile.volumeThreshold,
        description: `Volume must exceed ${profile.volumeThreshold}x average`
      });
    }
    
    conditions.push({
      type: 'candle_close',
      candleType: 'bearish',
      description: 'Confirmation candle must close bearish'
    });
  }
  
  const signal: ConditionalSignal = {
    pair,
    intent,
    triggerConditions: conditions,
    expiryTime: Date.now() + expiryMinutes * 60 * 1000,
    expiryMinutes,
    confidence,
    isTriggered: false,
    reasoning,
  };
  
  const signalId = `${pair}-${Date.now()}`;
  pendingSignals.set(signalId, signal);
  
  return signal;
}

export function checkTriggerConditions(
  signal: ConditionalSignal,
  currentPrice: number,
  metrics: MarketMetrics
): { triggered: boolean; failedConditions: string[] } {
  if (signal.intent === 'NO_TRADE') {
    return { triggered: false, failedConditions: ['NO_TRADE signal - no trigger needed'] };
  }
  
  if (Date.now() > signal.expiryTime) {
    return { triggered: false, failedConditions: ['Signal expired without trigger'] };
  }
  
  const failedConditions: string[] = [];
  
  for (const condition of signal.triggerConditions) {
    switch (condition.type) {
      case 'price_above':
        if (condition.targetPrice && currentPrice <= condition.targetPrice) {
          failedConditions.push(`Price ${currentPrice.toFixed(2)} not above target ${condition.targetPrice.toFixed(2)}`);
        }
        break;
      case 'price_below':
        if (condition.targetPrice && currentPrice >= condition.targetPrice) {
          failedConditions.push(`Price ${currentPrice.toFixed(2)} not below target ${condition.targetPrice.toFixed(2)}`);
        }
        break;
      case 'breakout':
        if (condition.targetPrice && currentPrice < condition.targetPrice) {
          failedConditions.push(`Breakout not confirmed - price below ${condition.targetPrice.toFixed(2)}`);
        }
        break;
      case 'breakdown':
        if (condition.targetPrice && currentPrice > condition.targetPrice) {
          failedConditions.push(`Breakdown not confirmed - price above ${condition.targetPrice.toFixed(2)}`);
        }
        break;
      case 'volume_confirm':
        if (condition.volumeMultiplier && (metrics.volumeDelta || 0) < condition.volumeMultiplier) {
          failedConditions.push(`Volume confirmation failed - need ${condition.volumeMultiplier}x`);
        }
        break;
      case 'retest_success':
      case 'retest_fail':
        break;
      case 'candle_close':
        break;
    }
  }
  
  return {
    triggered: failedConditions.length === 0,
    failedConditions
  };
}

export function formatTriggerConditions(conditions: TriggerCondition[]): string {
  if (conditions.length === 0) return 'No conditions required';
  
  return conditions.map((c, i) => `${i + 1}. ${c.description}`).join('\n');
}

export function cleanExpiredSignals(): number {
  const now = Date.now();
  let cleaned = 0;
  
  const entries = Array.from(pendingSignals.entries());
  for (const [id, signal] of entries) {
    if (now > signal.expiryTime && !signal.isTriggered) {
      pendingSignals.delete(id);
      cleaned++;
    }
  }
  
  return cleaned;
}

export function getPendingSignalsForPair(pair: TradingPair): ConditionalSignal[] {
  const signals: ConditionalSignal[] = [];
  const now = Date.now();
  
  const values = Array.from(pendingSignals.values());
  for (const signal of values) {
    if (signal.pair === pair && !signal.isTriggered && now < signal.expiryTime) {
      signals.push(signal);
    }
  }
  
  return signals;
}
