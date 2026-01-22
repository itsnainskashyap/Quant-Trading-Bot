export interface TechnicalIndicators {
  rsi: number;
  rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: 'ABOVE_UPPER' | 'ABOVE_MIDDLE' | 'BELOW_MIDDLE' | 'BELOW_LOWER';
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  atr: number;
  momentum: number;
  overallSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  strength: number;
}

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // Neutral if not enough data
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
} {
  if (prices.length < 26) {
    return { macdLine: 0, signalLine: 0, histogram: 0, trend: 'NEUTRAL' };
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
  
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (histogram > 0 && macdLine > 0) trend = 'BULLISH';
  else if (histogram < 0 && macdLine < 0) trend = 'BEARISH';
  
  return { macdLine, signalLine, histogram, trend };
}

export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
  upper: number;
  middle: number;
  lower: number;
  position: 'ABOVE_UPPER' | 'ABOVE_MIDDLE' | 'BELOW_MIDDLE' | 'BELOW_LOWER';
} {
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);
  
  const squaredDiffs = slice.map(p => Math.pow(p - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(variance);
  
  const upper = sma + stdDev * std;
  const lower = sma - stdDev * std;
  const currentPrice = prices[prices.length - 1];
  
  let position: 'ABOVE_UPPER' | 'ABOVE_MIDDLE' | 'BELOW_MIDDLE' | 'BELOW_LOWER';
  if (currentPrice > upper) position = 'ABOVE_UPPER';
  else if (currentPrice > sma) position = 'ABOVE_MIDDLE';
  else if (currentPrice > lower) position = 'BELOW_MIDDLE';
  else position = 'BELOW_LOWER';
  
  return { upper, middle: sma, lower, position };
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

export function calculateAllIndicators(
  prices: number[],
  highs?: number[],
  lows?: number[]
): TechnicalIndicators {
  const rsi = calculateRSI(prices);
  const macd = calculateMACD(prices);
  const bollingerBands = calculateBollingerBands(prices);
  
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const currentPrice = prices[prices.length - 1];
  
  let maTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (currentPrice > sma20 && sma20 > sma50) maTrend = 'BULLISH';
  else if (currentPrice < sma20 && sma20 < sma50) maTrend = 'BEARISH';
  
  const atr = highs && lows 
    ? calculateATR(highs, lows, prices)
    : prices.length > 1 
      ? Math.abs(prices[prices.length - 1] - prices[prices.length - 2])
      : 0;
  
  const momentum = calculateMomentum(prices);
  
  // Calculate overall signal
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  if (rsi < 30) bullishSignals += 2;
  else if (rsi < 40) bullishSignals += 1;
  else if (rsi > 70) bearishSignals += 2;
  else if (rsi > 60) bearishSignals += 1;
  
  if (macd.trend === 'BULLISH') bullishSignals += 2;
  else if (macd.trend === 'BEARISH') bearishSignals += 2;
  
  if (bollingerBands.position === 'BELOW_LOWER') bullishSignals += 2;
  else if (bollingerBands.position === 'ABOVE_UPPER') bearishSignals += 2;
  
  if (maTrend === 'BULLISH') bullishSignals += 2;
  else if (maTrend === 'BEARISH') bearishSignals += 2;
  
  if (momentum > 5) bullishSignals += 1;
  else if (momentum < -5) bearishSignals += 1;
  
  const netSignal = bullishSignals - bearishSignals;
  let overallSignal: TechnicalIndicators['overallSignal'] = 'NEUTRAL';
  
  if (netSignal >= 5) overallSignal = 'STRONG_BUY';
  else if (netSignal >= 2) overallSignal = 'BUY';
  else if (netSignal <= -5) overallSignal = 'STRONG_SELL';
  else if (netSignal <= -2) overallSignal = 'SELL';
  
  const strength = Math.min(100, Math.abs(netSignal) * 10 + 40);
  
  return {
    rsi,
    rsiSignal: rsi < 30 ? 'OVERSOLD' : rsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL',
    macd,
    bollingerBands,
    movingAverages: {
      sma20,
      sma50,
      ema12: ema12[ema12.length - 1] || 0,
      ema26: ema26[ema26.length - 1] || 0,
      trend: maTrend,
    },
    atr,
    momentum,
    overallSignal,
    strength,
  };
}
