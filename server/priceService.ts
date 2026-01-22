import type { TradingPair, PriceData } from "@shared/schema";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

const PAIR_TO_COINGECKO_ID: Record<TradingPair, string> = {
  "BTC-USDT": "bitcoin",
  "ETH-USDT": "ethereum",
  "SOL-USDT": "solana",
  "XRP-USDT": "ripple",
  "DOGE-USDT": "dogecoin",
  "BNB-USDT": "binancecoin",
  "ADA-USDT": "cardano",
  "AVAX-USDT": "avalanche-2",
  "DOT-USDT": "polkadot",
  "MATIC-USDT": "matic-network",
  "LINK-USDT": "chainlink",
  "LTC-USDT": "litecoin",
  "SHIB-USDT": "shiba-inu",
  "ATOM-USDT": "cosmos",
  "UNI-USDT": "uniswap",
};

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol: number;
  usd_24h_high?: number;
  usd_24h_low?: number;
}

interface OHLCData {
  timestamps: number[];
  closes: number[];
  highs: number[];
  lows: number[];
}

interface PriceCache {
  data: Map<TradingPair, PriceData>;
  lastFetch: number;
  historicalPrices: Map<TradingPair, number[]>;
  ohlcData: Map<TradingPair, OHLCData>;
  isInitialized: boolean;
  lastApiCall: number;
}

const cache: PriceCache = {
  data: new Map(),
  lastFetch: 0,
  historicalPrices: new Map(),
  ohlcData: new Map(),
  isInitialized: false,
  lastApiCall: 0,
};

const CACHE_DURATION = 60000; // 60 seconds
const API_CALL_DELAY = 2000; // 2 seconds between API calls

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastCall = now - cache.lastApiCall;
  if (timeSinceLastCall < API_CALL_DELAY) {
    await delay(API_CALL_DELAY - timeSinceLastCall);
  }
  cache.lastApiCall = Date.now();
  return fetch(url);
}

export async function initializePriceService(): Promise<void> {
  if (cache.isInitialized) return;
  
  console.log("[PriceService] Initializing with historical data...");
  
  // First fetch current prices
  await fetchRealPrices();
  
  // Then fetch OHLC data for major pairs (limited to avoid rate limits)
  const majorPairs: TradingPair[] = ["BTC-USDT", "ETH-USDT", "SOL-USDT"];
  
  for (const pair of majorPairs) {
    try {
      await delay(2500); // Extra delay for OHLC requests
      const ohlc = await fetchOHLCData(pair);
      if (ohlc.closes.length > 0) {
        cache.ohlcData.set(pair, ohlc);
        cache.historicalPrices.set(pair, ohlc.closes);
        console.log(`[PriceService] Loaded ${ohlc.closes.length} historical prices for ${pair}`);
      }
    } catch (error) {
      console.log(`[PriceService] Using simulated data for ${pair}`);
      generateSimulatedHistory(pair);
    }
  }
  
  // Generate simulated history for other pairs
  const allPairs = Object.keys(PAIR_TO_COINGECKO_ID) as TradingPair[];
  for (const pair of allPairs) {
    if (!cache.historicalPrices.has(pair)) {
      generateSimulatedHistory(pair);
    }
  }
  
  cache.isInitialized = true;
  console.log("[PriceService] Initialization complete");
}

function generateSimulatedHistory(pair: TradingPair): void {
  const currentPrice = cache.data.get(pair)?.price || getBasePrice(pair);
  const prices: number[] = [];
  
  // Generate 100 realistic price points with trend and noise
  let price = currentPrice;
  const volatility = currentPrice * 0.002; // 0.2% volatility per candle
  
  for (let i = 99; i >= 0; i--) {
    // Add random walk with slight mean reversion
    const noise = (Math.random() - 0.5) * 2 * volatility;
    const meanReversion = (currentPrice - price) * 0.01;
    price = price + noise + meanReversion;
    prices.push(price);
  }
  
  cache.historicalPrices.set(pair, prices);
}

function getBasePrice(pair: TradingPair): number {
  const basePrices: Record<TradingPair, number> = {
    "BTC-USDT": 97000,
    "ETH-USDT": 3400,
    "SOL-USDT": 185,
    "XRP-USDT": 2.35,
    "DOGE-USDT": 0.32,
    "BNB-USDT": 680,
    "ADA-USDT": 0.95,
    "AVAX-USDT": 38,
    "DOT-USDT": 7.5,
    "MATIC-USDT": 0.52,
    "LINK-USDT": 22,
    "LTC-USDT": 105,
    "SHIB-USDT": 0.000022,
    "ATOM-USDT": 9.5,
    "UNI-USDT": 13,
  };
  return basePrices[pair];
}

export async function fetchRealPrices(): Promise<Map<TradingPair, PriceData>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cache.data.size > 0 && now - cache.lastFetch < CACHE_DURATION) {
    return cache.data;
  }

  try {
    const ids = Object.values(PAIR_TO_COINGECKO_ID).join(",");
    const response = await rateLimitedFetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.log("[PriceService] Rate limited, using cached data");
      } else {
        console.error("[PriceService] API error:", response.status);
      }
      return cache.data.size > 0 ? cache.data : generateFallbackPrices();
    }

    const data = await response.json() as Record<string, CoinGeckoPrice>;
    
    for (const [pair, coinId] of Object.entries(PAIR_TO_COINGECKO_ID) as [TradingPair, string][]) {
      const coinData = data[coinId];
      if (coinData) {
        const price = coinData.usd;
        const change24h = coinData.usd_24h_change || 0;
        
        // Update historical prices with new price
        const history = cache.historicalPrices.get(pair) || [];
        if (history.length === 0 || history[history.length - 1] !== price) {
          history.push(price);
          if (history.length > 200) history.shift();
          cache.historicalPrices.set(pair, history);
        }
        
        cache.data.set(pair, {
          pair,
          price,
          change24h,
          high24h: price * (1 + Math.abs(change24h) / 100 * 0.3),
          low24h: price * (1 - Math.abs(change24h) / 100 * 0.3),
          volume24h: coinData.usd_24h_vol || 0,
          timestamp: now,
          isLiveData: true,
        });
      }
    }
    
    cache.lastFetch = now;
    console.log(`[PriceService] Updated ${cache.data.size} pairs with real prices`);
    return cache.data;
  } catch (error) {
    console.error("[PriceService] Error:", error);
    return cache.data.size > 0 ? cache.data : generateFallbackPrices();
  }
}

export function getHistoricalPrices(pair: TradingPair): number[] {
  return cache.historicalPrices.get(pair) || [];
}

export function hasRealData(): boolean {
  return cache.isInitialized && cache.data.size > 0;
}

function generateFallbackPrices(): Map<TradingPair, PriceData> {
  const fallback = new Map<TradingPair, PriceData>();
  const now = Date.now();
  
  for (const pair of Object.keys(PAIR_TO_COINGECKO_ID) as TradingPair[]) {
    const basePrice = getBasePrice(pair);
    const price = basePrice;
    
    fallback.set(pair, {
      pair,
      price,
      change24h: 0,
      high24h: price * 1.01,
      low24h: price * 0.99,
      volume24h: basePrice * 1000000,
      timestamp: now,
      isLiveData: false,
    });
    
    // Also generate history for fallback
    if (!cache.historicalPrices.has(pair)) {
      generateSimulatedHistory(pair);
    }
  }
  
  return fallback;
}

async function fetchOHLCData(pair: TradingPair): Promise<OHLCData> {
  const coinId = PAIR_TO_COINGECKO_ID[pair];
  const response = await rateLimitedFetch(
    `${COINGECKO_API}/coins/${coinId}/ohlc?vs_currency=usd&days=1`
  );

  if (!response.ok) {
    throw new Error(`OHLC fetch failed: ${response.status}`);
  }

  const data = await response.json() as number[][];
  
  return {
    timestamps: data.map(d => d[0]),
    closes: data.map(d => d[4]),
    highs: data.map(d => d[2]),
    lows: data.map(d => d[3]),
  };
}

export async function fetchOHLCVData(pair: TradingPair, days: number = 1): Promise<{
  timestamps: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
}> {
  try {
    const coinId = PAIR_TO_COINGECKO_ID[pair];
    const response = await rateLimitedFetch(
      `${COINGECKO_API}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
    );

    if (!response.ok) {
      throw new Error(`OHLC fetch failed: ${response.status}`);
    }

    const data = await response.json() as number[][];
    
    return {
      timestamps: data.map(d => d[0]),
      opens: data.map(d => d[1]),
      highs: data.map(d => d[2]),
      lows: data.map(d => d[3]),
      closes: data.map(d => d[4]),
      volumes: data.map(() => 0),
    };
  } catch (error) {
    // Return from cache or simulated
    const history = cache.historicalPrices.get(pair) || [];
    const closes = history.length > 0 ? history : Array(50).fill(getBasePrice(pair));
    
    return {
      timestamps: closes.map((_, i) => Date.now() - i * 3600000),
      opens: closes,
      highs: closes.map(c => c * 1.005),
      lows: closes.map(c => c * 0.995),
      closes,
      volumes: closes.map(() => 1000000),
    };
  }
}
