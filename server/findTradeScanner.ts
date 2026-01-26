import { storage } from "./storage";
import { getEnhancedAIConsensus } from "./enhancedAI";
import { checkLossAvoidance } from "./lossAvoidance";
import type { TradingPair, MarketMetrics } from "@shared/schema";
import { tradingPairs } from "@shared/schema";

const SCAN_INTERVAL = 15000; // 15 seconds between scans
let scannerRunning = false;

export async function startFindTradeScanner() {
  if (scannerRunning) return;
  scannerRunning = true;
  
  console.log("[FindTradeScanner] Starting server-side scanner...");
  
  setInterval(async () => {
    try {
      await processActiveScans();
    } catch (error) {
      console.error("[FindTradeScanner] Error:", error);
    }
  }, SCAN_INTERVAL);
}

async function processActiveScans() {
  const activeScans = await storage.getActiveScans();
  
  if (activeScans.length === 0) return;
  
  console.log(`[FindTradeScanner] Processing ${activeScans.length} active scans...`);
  
  for (const scan of activeScans) {
    try {
      // Check if scan expired
      if (new Date() >= new Date(scan.expiresAt)) {
        await storage.updateFindTradeScan(scan.id, { 
          status: 'timeout', 
          completedAt: new Date() 
        });
        console.log(`[FindTradeScanner] Scan ${scan.id} timed out`);
        continue;
      }
      
      // Run analysis for this scan
      const result = await runScanAnalysis(scan.pair as TradingPair, scan.minConfidence);
      
      // Update attempt count
      await storage.updateFindTradeScan(scan.id, { 
        attempts: (scan.attempts || 0) + 1 
      });
      
      if (result.found) {
        await storage.completeFindTradeScan(scan.id, {
          signal: result.signal!,
          confidence: result.confidence!,
          entryPrice: result.entryPrice!,
          stopLoss: result.stopLoss!,
          takeProfit: result.takeProfit!,
          reasoning: result.reasoning!,
        });
        console.log(`[FindTradeScanner] Found trade for scan ${scan.id}: ${result.signal} at ${result.confidence}%`);
      }
    } catch (error) {
      console.error(`[FindTradeScanner] Error processing scan ${scan.id}:`, error);
    }
  }
}

async function runScanAnalysis(pair: TradingPair, minConfidence: number): Promise<{
  found: boolean;
  signal?: string;
  confidence?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning?: string;
}> {
  if (!tradingPairs.includes(pair)) {
    return { found: false };
  }
  
  const [prices, metrics] = await Promise.all([
    storage.getAllPrices(),
    storage.getMarketMetrics(pair),
  ]);
  
  const priceData = prices.find(p => p.pair === pair);
  if (!priceData) {
    return { found: false };
  }
  
  // Check loss avoidance
  const lossAvoidance = checkLossAvoidance(pair, metrics);
  if (lossAvoidance.isBlocked) {
    return { found: false };
  }
  
  // Build metrics
  const fullMetrics: MarketMetrics = metrics || {
    pair,
    volumeDelta: 0,
    orderBookImbalance: 0,
    volatility: 0.02,
    atr: priceData.price * 0.02,
    rsi: 50,
    fundingRate: 0,
    openInterest: 0,
  };
  
  // Run enhanced AI consensus
  const aiResult = await getEnhancedAIConsensus(pair, fullMetrics, priceData.price, 5);
  
  if (aiResult.finalSignal !== 'NO_TRADE' && aiResult.finalConfidence >= minConfidence) {
    const reasoning = aiResult.agents
      .filter((a: any) => a.signal === aiResult.finalSignal)
      .map((a: any) => a.reasoning)
      .slice(0, 2)
      .join('. ') || aiResult.reasoning;
    
    return {
      found: true,
      signal: aiResult.finalSignal,
      confidence: Math.round(aiResult.finalConfidence),
      entryPrice: priceData.price,
      stopLoss: Math.round(aiResult.tradeRecommendation.stopLoss * 10000) / 10000,
      takeProfit: Math.round(aiResult.tradeRecommendation.takeProfit * 10000) / 10000,
      reasoning: reasoning.substring(0, 300),
    };
  }
  
  return { found: false };
}
