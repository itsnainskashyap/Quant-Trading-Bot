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

interface PriceCache {
  data: Map<TradingPair, PriceData>;
  lastFetch: number;
  historicalPrices: Map<TradingPair, number[]>;
}

const cache: PriceCache = {
  data: new Map(),
  lastFetch: 0,
  historicalPrices: new Map(),
};

const CACHE_DURATION = 30000; // 30 seconds

export async function fetchRealPrices(): Promise<Map<TradingPair, PriceData>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cache.data.size > 0 && now - cache.lastFetch < CACHE_DURATION) {
    return cache.data;
  }

  try {
    const ids = Object.values(PAIR_TO_COINGECKO_ID).join(",");
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    );

    if (!response.ok) {
      console.error("CoinGecko API error:", response.status);
      return cache.data.size > 0 ? cache.data : generateFallbackPrices();
    }

    const data = await response.json() as Record<string, CoinGeckoPrice>;
    
    for (const [pair, coinId] of Object.entries(PAIR_TO_COINGECKO_ID) as [TradingPair, string][]) {
      const coinData = data[coinId];
      if (coinData) {
        const price = coinData.usd;
        const change24h = coinData.usd_24h_change || 0;
        
        // Store historical prices for technical indicators
        const history = cache.historicalPrices.get(pair) || [];
        history.push(price);
        if (history.length > 100) history.shift(); // Keep last 100 prices
        cache.historicalPrices.set(pair, history);
        
        cache.data.set(pair, {
          pair,
          price,
          change24h,
          high24h: price * (1 + Math.abs(change24h) / 100 * 0.5),
          low24h: price * (1 - Math.abs(change24h) / 100 * 0.5),
          volume24h: coinData.usd_24h_vol || 0,
          timestamp: now,
        });
      }
    }
    
    cache.lastFetch = now;
    return cache.data;
  } catch (error) {
    console.error("Error fetching prices:", error);
    return cache.data.size > 0 ? cache.data : generateFallbackPrices();
  }
}

export function getHistoricalPrices(pair: TradingPair): number[] {
  return cache.historicalPrices.get(pair) || [];
}

function generateFallbackPrices(): Map<TradingPair, PriceData> {
  const fallback = new Map<TradingPair, PriceData>();
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

  const now = Date.now();
  for (const [pair, basePrice] of Object.entries(basePrices) as [TradingPair, number][]) {
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.02);
    fallback.set(pair, {
      pair,
      price,
      change24h: (Math.random() - 0.5) * 8,
      high24h: price * 1.02,
      low24h: price * 0.98,
      volume24h: basePrice * 1000000,
      timestamp: now,
    });
  }
  
  return fallback;
}

export async function fetchOHLCVData(pair: TradingPair, days: number = 7): Promise<{
  timestamps: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
}> {
  try {
    const coinId = PAIR_TO_COINGECKO_ID[pair];
    const response = await fetch(
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
      volumes: data.map(() => 0), // OHLC endpoint doesn't include volume
    };
  } catch (error) {
    console.error("Error fetching OHLCV:", error);
    // Return mock data
    const closes = Array.from({ length: 100 }, () => 
      cache.data.get(pair)?.price || 50000
    );
    return {
      timestamps: closes.map((_, i) => Date.now() - i * 3600000),
      opens: closes,
      highs: closes.map(c => c * 1.01),
      lows: closes.map(c => c * 0.99),
      closes,
      volumes: closes.map(() => 1000000),
    };
  }
}
