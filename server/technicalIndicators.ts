export interface TechnicalIndicators {
  rsi: number;
  rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  stochastic: {
    k: number;
    d: number;
    signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  };
  williamsR: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    crossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    width: number;
    position: 'ABOVE_UPPER' | 'ABOVE_MIDDLE' | 'BELOW_MIDDLE' | 'BELOW_LOWER';
    squeeze: boolean;
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
    ema50: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    goldenCross: boolean;
    deathCross: boolean;
  };
  atr: number;
  atrPercent: number;
  momentum: number;
  roc: number;
  adx: number;
  trendStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NO_TREND';
  volumeProfile: {
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    confirmation: boolean;
  };
  supportResistance: {
    nearestSupport: number;
    nearestResistance: number;
    distanceToSupport: number;
    distanceToResistance: number;
  };
  confluenceScore: number;
  confluenceSignals: {
    bullish: string[];
    bearish: string[];
    neutral: string[];
  };
  overallSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  strength: number;
  reliability: number;
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function calculateStochastic(prices: number[], highs: number[], lows: number[], kPeriod: number = 14, dPeriod: number = 3): { k: number; d: number; signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' } {
  if (prices.length < kPeriod) {
    return { k: 50, d: 50, signal: 'NEUTRAL' };
  }

  const kValues: number[] = [];
  
  for (let i = kPeriod - 1; i < prices.length; i++) {
    const sliceHighs = highs.slice(i - kPeriod + 1, i + 1);
    const sliceLows = lows.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...sliceHighs);
    const low = Math.min(...sliceLows);
    const close = prices[i];
    
    if (high === low) {
      kValues.push(50);
    } else {
      kValues.push(((close - low) / (high - low)) * 100);
    }
  }

  const k = kValues[kValues.length - 1];
  const dSlice = kValues.slice(-dPeriod);
  const d = dSlice.reduce((a, b) => a + b, 0) / dSlice.length;

  let signal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' = 'NEUTRAL';
  if (k < 20 && d < 20) signal = 'OVERSOLD';
  else if (k > 80 && d > 80) signal = 'OVERBOUGHT';

  return { k, d, signal };
}

export function calculateWilliamsR(prices: number[], highs: number[], lows: number[], period: number = 14): number {
  if (prices.length < period) return -50;

  const sliceHighs = highs.slice(-period);
  const sliceLows = lows.slice(-period);
  const high = Math.max(...sliceHighs);
  const low = Math.min(...sliceLows);
  const close = prices[prices.length - 1];

  if (high === low) return -50;
  return ((high - close) / (high - low)) * -100;
}

export function calculateROC(prices: number[], period: number = 12): number {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - period - 1];
  if (past === 0) return 0;
  return ((current - past) / past) * 100;
}

export function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period * 2) return 25;

  const trueRanges: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);

    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const smoothTR = trueRanges.slice(-period).reduce((a, b) => a + b, 0);
  const smoothPlusDM = plusDM.slice(-period).reduce((a, b) => a + b, 0);
  const smoothMinusDM = minusDM.slice(-period).reduce((a, b) => a + b, 0);

  if (smoothTR === 0) return 25;

  const plusDI = (smoothPlusDM / smoothTR) * 100;
  const minusDI = (smoothMinusDM / smoothTR) * 100;

  const diSum = plusDI + minusDI;
  if (diSum === 0) return 25;

  const dx = (Math.abs(plusDI - minusDI) / diSum) * 100;
  return dx;
}

export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  
  const multiplier = 2 / (period + 1);
  const ema: number[] = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  
  return ema;
}

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) {
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calculateMACD(prices: number[]): {
  macdLine: number;
  signalLine: number;
  histogram: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  crossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
} {
  if (prices.length < 26) {
    return { macdLine: 0, signalLine: 0, histogram: 0, trend: 'NEUTRAL', crossover: 'NONE' };
  }

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const macdValues: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdValues.push(ema12[i] - ema26[i]);
  }
  
  const signalEMA = calculateEMA(macdValues.slice(-9), 9);
  const macdLine = macdValues[macdValues.length - 1];
  const signalLine = signalEMA[signalEMA.length - 1] || 0;
  const histogram = macdLine - signalLine;
  
  const prevMacd = macdValues[macdValues.length - 2] || 0;
  const prevSignal = signalEMA[signalEMA.length - 2] || 0;
  
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (histogram > 0 && macdLine > 0) trend = 'BULLISH';
  else if (histogram < 0 && macdLine < 0) trend = 'BEARISH';
  
  let crossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE' = 'NONE';
  if (prevMacd < prevSignal && macdLine > signalLine) crossover = 'BULLISH_CROSS';
  else if (prevMacd > prevSignal && macdLine < signalLine) crossover = 'BEARISH_CROSS';
  
  return { macdLine, signalLine, histogram, trend, crossover };
}

export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
  upper: number;
  middle: number;
  lower: number;
  width: number;
  position: 'ABOVE_UPPER' | 'ABOVE_MIDDLE' | 'BELOW_MIDDLE' | 'BELOW_LOWER';
  squeeze: boolean;
} {
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);
  
  const squaredDiffs = slice.map(p => Math.pow(p - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(variance);
  
  const upper = sma + stdDev * std;
  const lower = sma - stdDev * std;
  const width = (upper - lower) / sma * 100;
  const currentPrice = prices[prices.length - 1];
  
  let position: 'ABOVE_UPPER' | 'ABOVE_MIDDLE' | 'BELOW_MIDDLE' | 'BELOW_LOWER';
  if (currentPrice > upper) position = 'ABOVE_UPPER';
  else if (currentPrice > sma) position = 'ABOVE_MIDDLE';
  else if (currentPrice > lower) position = 'BELOW_MIDDLE';
  else position = 'BELOW_LOWER';
  
  const squeeze = width < 3;
  
  return { upper, middle: sma, lower, width, position, squeeze };
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < 2) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }
  
  if (trueRanges.length < period) {
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }
  
  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export function calculateMomentum(prices: number[], period: number = 10): number {
  if (prices.length < period) return 0;
  
  const current = prices[prices.length - 1];
  const past = prices[prices.length - period];
  
  return ((current - past) / past) * 100;
}

export function calculateVolumeProfile(volumes: number[]): { trend: 'INCREASING' | 'DECREASING' | 'STABLE'; confirmation: boolean } {
  if (volumes.length < 5) {
    return { trend: 'STABLE', confirmation: false };
  }

  const recent = volumes.slice(-5);
  const older = volumes.slice(-10, -5);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;
  
  const change = (recentAvg - olderAvg) / olderAvg * 100;
  
  let trend: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
  if (change > 20) trend = 'INCREASING';
  else if (change < -20) trend = 'DECREASING';
  
  return { trend, confirmation: trend === 'INCREASING' };
}

export function findSupportResistance(prices: number[], highs: number[], lows: number[]): {
  nearestSupport: number;
  nearestResistance: number;
  distanceToSupport: number;
  distanceToResistance: number;
} {
  const currentPrice = prices[prices.length - 1];
  const recentLows = lows.slice(-20);
  const recentHighs = highs.slice(-20);
  
  const support = Math.min(...recentLows);
  const resistance = Math.max(...recentHighs);
  
  const distanceToSupport = ((currentPrice - support) / currentPrice) * 100;
  const distanceToResistance = ((resistance - currentPrice) / currentPrice) * 100;
  
  return {
    nearestSupport: support,
    nearestResistance: resistance,
    distanceToSupport,
    distanceToResistance,
  };
}

export function calculateConfluence(
  rsi: number,
  stochastic: { k: number; d: number; signal: string },
  williamsR: number,
  macd: { trend: string; crossover: string; histogram: number },
  bollinger: { position: string; squeeze: boolean },
  maTrend: string,
  adx: number,
  momentum: number,
  volumeConfirm: boolean
): { score: number; bullish: string[]; bearish: string[]; neutral: string[] } {
  const bullish: string[] = [];
  const bearish: string[] = [];
  const neutral: string[] = [];
  
  if (rsi < 30) bullish.push('RSI oversold (<30)');
  else if (rsi < 40) bullish.push('RSI approaching oversold');
  else if (rsi > 70) bearish.push('RSI overbought (>70)');
  else if (rsi > 60) bearish.push('RSI approaching overbought');
  else neutral.push('RSI neutral');
  
  if (stochastic.signal === 'OVERSOLD') bullish.push('Stochastic oversold');
  else if (stochastic.signal === 'OVERBOUGHT') bearish.push('Stochastic overbought');
  else neutral.push('Stochastic neutral');
  
  if (stochastic.k > stochastic.d && stochastic.signal === 'OVERSOLD') bullish.push('Stochastic bullish crossover in oversold');
  else if (stochastic.k < stochastic.d && stochastic.signal === 'OVERBOUGHT') bearish.push('Stochastic bearish crossover in overbought');
  
  if (williamsR < -80) bullish.push('Williams %R oversold');
  else if (williamsR > -20) bearish.push('Williams %R overbought');
  else neutral.push('Williams %R neutral');
  
  if (macd.trend === 'BULLISH') bullish.push('MACD bullish trend');
  else if (macd.trend === 'BEARISH') bearish.push('MACD bearish trend');
  else neutral.push('MACD neutral');
  
  if (macd.crossover === 'BULLISH_CROSS') bullish.push('MACD bullish crossover');
  else if (macd.crossover === 'BEARISH_CROSS') bearish.push('MACD bearish crossover');
  
  if (bollinger.position === 'BELOW_LOWER') bullish.push('Price below lower Bollinger Band');
  else if (bollinger.position === 'ABOVE_UPPER') bearish.push('Price above upper Bollinger Band');
  
  if (maTrend === 'BULLISH') bullish.push('Moving averages bullish alignment');
  else if (maTrend === 'BEARISH') bearish.push('Moving averages bearish alignment');
  else neutral.push('Moving averages mixed');
  
  if (adx > 25) {
    if (maTrend === 'BULLISH') bullish.push('Strong bullish trend (ADX>' + adx.toFixed(0) + ')');
    else if (maTrend === 'BEARISH') bearish.push('Strong bearish trend (ADX>' + adx.toFixed(0) + ')');
  } else {
    neutral.push('Weak trend strength');
  }
  
  if (momentum > 2) bullish.push('Positive momentum');
  else if (momentum < -2) bearish.push('Negative momentum');
  
  if (volumeConfirm) bullish.push('Volume confirms move');
  
  const bullishScore = bullish.length;
  const bearishScore = bearish.length;
  const netScore = bullishScore - bearishScore;
  
  return { score: netScore, bullish, bearish, neutral };
}

export function calculateAllIndicators(
  prices: number[],
  highs?: number[],
  lows?: number[],
  volumes?: number[]
): TechnicalIndicators {
  const h = highs || prices.map(p => p * 1.001);
  const l = lows || prices.map(p => p * 0.999);
  const v = volumes || prices.map(() => 1000000);
  
  const rsi = calculateRSI(prices);
  const stochastic = calculateStochastic(prices, h, l);
  const williamsR = calculateWilliamsR(prices, h, l);
  const macd = calculateMACD(prices);
  const bollingerBands = calculateBollingerBands(prices);
  const roc = calculateROC(prices);
  const adx = calculateADX(h, l, prices);
  
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  const sma200 = calculateSMA(prices, Math.min(200, prices.length));
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const ema50 = calculateEMA(prices, 50);
  
  const currentPrice = prices[prices.length - 1];
  
  let maTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  const bullishMA = currentPrice > sma20 && sma20 > sma50;
  const bearishMA = currentPrice < sma20 && sma20 < sma50;
  if (bullishMA) maTrend = 'BULLISH';
  else if (bearishMA) maTrend = 'BEARISH';
  
  const goldenCross = sma50 > sma200 && prices.length >= 200;
  const deathCross = sma50 < sma200 && prices.length >= 200;
  
  const atr = calculateATR(h, l, prices);
  const atrPercent = (atr / currentPrice) * 100;
  
  const momentum = calculateMomentum(prices);
  
  let trendStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'NO_TREND' = 'NO_TREND';
  if (adx > 40) trendStrength = 'STRONG';
  else if (adx > 25) trendStrength = 'MODERATE';
  else if (adx > 15) trendStrength = 'WEAK';
  
  const volumeProfile = calculateVolumeProfile(v);
  const supportResistance = findSupportResistance(prices, h, l);
  
  const confluence = calculateConfluence(
    rsi,
    stochastic,
    williamsR,
    macd,
    bollingerBands,
    maTrend,
    adx,
    momentum,
    volumeProfile.confirmation
  );
  
  let overallSignal: TechnicalIndicators['overallSignal'] = 'NEUTRAL';
  
  if (confluence.score >= 6) overallSignal = 'STRONG_BUY';
  else if (confluence.score >= 4) overallSignal = 'BUY';
  else if (confluence.score <= -6) overallSignal = 'STRONG_SELL';
  else if (confluence.score <= -4) overallSignal = 'SELL';
  
  const strength = Math.min(100, Math.abs(confluence.score) * 12 + 30);
  
  const reliability = Math.min(100, 
    (prices.length >= 50 ? 20 : 0) +
    (adx > 25 ? 20 : 0) +
    (Math.abs(confluence.score) >= 4 ? 30 : Math.abs(confluence.score) * 7) +
    (volumeProfile.confirmation ? 15 : 0) +
    (confluence.neutral.length < 4 ? 15 : 0)
  );
  
  return {
    rsi,
    rsiSignal: rsi < 30 ? 'OVERSOLD' : rsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL',
    stochastic,
    williamsR,
    macd,
    bollingerBands,
    movingAverages: {
      sma20,
      sma50,
      sma200,
      ema12: ema12[ema12.length - 1] || 0,
      ema26: ema26[ema26.length - 1] || 0,
      ema50: ema50[ema50.length - 1] || 0,
      trend: maTrend,
      goldenCross,
      deathCross,
    },
    atr,
    atrPercent,
    momentum,
    roc,
    adx,
    trendStrength,
    volumeProfile,
    supportResistance,
    confluenceScore: confluence.score,
    confluenceSignals: {
      bullish: confluence.bullish,
      bearish: confluence.bearish,
      neutral: confluence.neutral,
    },
    overallSignal,
    strength,
    reliability,
  };
}
