import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import type { TradingPair } from "@shared/schema";
import { getMultiAIConsensus, generateConsensusExplanation } from "./consensus";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);
  registerAuthRoutes(app);
  
  const handleDashboard = async (pair: TradingPair, res: any) => {
    try {
      const [prices, signal, metrics, history, protection] = await Promise.all([
        storage.getAllPrices(),
        storage.generateSignal(pair),
        storage.getMarketMetrics(pair),
        storage.getSignalHistory(),
        storage.getProtectionStatus(),
      ]);
      
      let reasoning = "";
      if (signal) {
        reasoning = await generateExplanation(signal, prices.find(p => p.pair === pair)!, metrics);
        signal.reasoning = reasoning;
        await storage.addToHistory(signal);
      }
      
      res.json({
        prices,
        signal,
        metrics,
        history,
        protection,
        isDataFeedHealthy: storage.isDataFeedHealthy(),
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  };

  app.get("/api/dashboard", async (req, res) => {
    handleDashboard("BTC-USDT", res);
  });

  app.get("/api/dashboard/:pair", async (req, res) => {
    const pair = req.params.pair as TradingPair;
    const validPairs: TradingPair[] = ["BTC-USDT", "ETH-USDT"];
    
    if (!validPairs.includes(pair)) {
      res.status(400).json({ error: "Invalid trading pair. Valid pairs: BTC-USDT, ETH-USDT" });
      return;
    }
      
    handleDashboard(pair, res);
  });

  app.post("/api/explain", async (req, res) => {
    try {
      const { pair } = req.body as { pair: TradingPair };
      
      const [prices, signal, metrics] = await Promise.all([
        storage.getAllPrices(),
        storage.generateSignal(pair),
        storage.getMarketMetrics(pair),
      ]);
      
      const priceData = prices.find(p => p.pair === pair);
      
      if (!signal || !priceData) {
        res.json({
          reasoning: "No active trading signal. The AI models have determined that current market conditions do not meet the confidence threshold for a trade recommendation. This is a protective measure to preserve capital during uncertain market periods.",
          warnings: ["No signal - market conditions unfavorable"],
        });
        return;
      }
      
      const reasoning = await generateExplanation(signal, priceData, metrics);
      
      res.json({
        reasoning,
        warnings: signal.warnings,
      });
    } catch (error) {
      console.error("Explain error:", error);
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });

  app.get("/api/prices", async (req, res) => {
    try {
      const prices = await storage.getAllPrices();
      res.json(prices);
    } catch (error) {
      console.error("Prices error:", error);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  });

  app.get("/api/signal/:pair", async (req, res) => {
    try {
      const pair = req.params.pair as TradingPair;
      const signal = await storage.generateSignal(pair);
      res.json(signal);
    } catch (error) {
      console.error("Signal error:", error);
      res.status(500).json({ error: "Failed to generate signal" });
    }
  });

  app.get("/api/metrics/:pair", async (req, res) => {
    try {
      const pair = req.params.pair as TradingPair;
      const metrics = await storage.getMarketMetrics(pair);
      res.json(metrics);
    } catch (error) {
      console.error("Metrics error:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  app.get("/api/history", async (req, res) => {
    try {
      const history = await storage.getSignalHistory();
      res.json(history);
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.post("/api/consensus", async (req, res) => {
    try {
      const { pair } = req.body as { pair: TradingPair };
      const validPairs: TradingPair[] = ["BTC-USDT", "ETH-USDT"];
      
      if (!validPairs.includes(pair)) {
        res.status(400).json({ error: "Invalid trading pair" });
        return;
      }
      
      const [prices, metrics] = await Promise.all([
        storage.getAllPrices(),
        storage.getMarketMetrics(pair),
      ]);
      
      const priceData = prices.find(p => p.pair === pair);
      if (!priceData) {
        res.status(404).json({ error: "Price data not found" });
        return;
      }
      
      const consensus = await getMultiAIConsensus(pair, metrics, priceData.price);
      const explanation = generateConsensusExplanation(consensus);
      
      res.json({
        consensus,
        explanation,
      });
    } catch (error) {
      console.error("Consensus error:", error);
      res.status(500).json({ error: "Failed to generate consensus" });
    }
  });

  app.post("/api/predictions/take", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const canTrade = await storage.canUserTrade(user.id);
      if (!canTrade.allowed) {
        res.status(403).json({ 
          error: canTrade.reason,
          upgradeRequired: true,
          remaining: canTrade.remaining,
        });
        return;
      }
      
      const { pair } = req.body as { pair: TradingPair };
      const validPairs: TradingPair[] = ["BTC-USDT", "ETH-USDT"];
      
      if (!validPairs.includes(pair)) {
        res.status(400).json({ error: "Invalid trading pair" });
        return;
      }
      
      const [signal, prices] = await Promise.all([
        storage.generateSignal(pair),
        storage.getAllPrices(),
      ]);
      
      if (!signal) {
        res.status(400).json({ error: "No signal available for this pair" });
        return;
      }
      
      const priceData = prices.find(p => p.pair === pair);
      if (!priceData) {
        res.status(404).json({ error: "Price data not found" });
        return;
      }
      
      const metrics = await storage.getMarketMetrics(pair);
      const reasoning = await generateExplanation(signal, priceData, metrics);
      signal.reasoning = reasoning;
      
      const prediction = await storage.createPrediction(user.id, signal, priceData.price);
      
      res.json({
        prediction,
        signal,
        message: `Trade recorded. Exit window: ${signal.exitWindowMinutes} minutes.`,
        remaining: canTrade.remaining !== undefined ? canTrade.remaining - 1 : undefined,
      });
    } catch (error) {
      console.error("Take prediction error:", error);
      res.status(500).json({ error: "Failed to record prediction" });
    }
  });

  app.get("/api/predictions", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const predictions = await storage.getUserPredictions(user.id, limit);
      
      const stats = predictions.reduce((acc, p) => {
        if (p.outcome === "WIN") acc.wins++;
        else if (p.outcome === "LOSS") acc.losses++;
        else if (p.outcome === "NEUTRAL") acc.neutral++;
        else if (p.outcome === "PENDING") acc.pending++;
        else if (p.outcome === "SKIPPED") acc.skipped++;
        
        if (p.profitLoss !== null) {
          acc.totalProfitLoss += p.profitLoss;
        }
        return acc;
      }, { wins: 0, losses: 0, neutral: 0, pending: 0, skipped: 0, totalProfitLoss: 0 });
      
      const completedTrades = stats.wins + stats.losses + stats.neutral;
      const winRate = completedTrades > 0 ? (stats.wins / completedTrades) * 100 : 0;
      
      res.json({
        predictions,
        stats: {
          ...stats,
          total: predictions.length,
          completedTrades,
          winRate: winRate.toFixed(1),
        },
      });
    } catch (error) {
      console.error("Get predictions error:", error);
      res.status(500).json({ error: "Failed to fetch predictions" });
    }
  });

  app.post("/api/predictions/process", async (req, res) => {
    try {
      const processed = await storage.processExpiredPredictions();
      res.json({ 
        processed,
        message: `Processed ${processed} expired predictions.`,
      });
    } catch (error) {
      console.error("Process predictions error:", error);
      res.status(500).json({ error: "Failed to process predictions" });
    }
  });

  app.get("/api/subscription", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const subscription = await storage.getUserSubscription(user.id);
      const canTrade = await storage.canUserTrade(user.id);
      const totalUsers = await storage.getTotalUserCount();
      const dailyCount = await storage.getUserDailyPredictionCount(user.id);
      
      res.json({
        subscription,
        canTrade: canTrade.allowed,
        remaining: canTrade.remaining,
        reason: canTrade.reason,
        dailyUsed: dailyCount,
        dailyLimit: 10,
        totalUsers,
        isEarlyAdopter: totalUsers <= 1000,
      });
    } catch (error) {
      console.error("Subscription error:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  return httpServer;
}

async function generateExplanation(
  signal: NonNullable<Awaited<ReturnType<typeof storage.generateSignal>>>,
  priceData: Awaited<ReturnType<typeof storage.getPriceData>>,
  metrics: Awaited<ReturnType<typeof storage.getMarketMetrics>>
): Promise<string> {
  try {
    const prompt = `You are an AI trading assistant for TradeX AI, a crypto trading decision platform. Provide a clear, concise explanation of the current trading signal.

Current Market Data:
- Pair: ${signal.pair}
- Price: $${priceData.price.toFixed(2)}
- 24h Change: ${priceData.change24h.toFixed(2)}%
- Volatility: ${metrics.volatility.toFixed(2)}%
- Order Book Imbalance: ${metrics.orderBookImbalance.toFixed(1)}% (positive = buy pressure)
- Volume Delta: ${metrics.volumeDelta.toFixed(1)}%
- Market Regime: ${signal.marketRegime}

AI Model Scores:
${signal.modelScores.map(m => `- ${m.name}: ${m.score}%`).join('\n')}

Signal Generated: ${signal.signal}
Confidence: ${signal.confidence}%
Risk Grade: ${signal.riskGrade}
Exit Window: ${signal.exitWindowMinutes} minutes

${signal.warnings.length > 0 ? `Warnings: ${signal.warnings.join(', ')}` : ''}

Provide a 2-3 sentence explanation of why this signal was generated, focusing on the key factors that led to this decision. Be clear about the reasoning without making profit promises. If it's a NO_TRADE signal, explain why the models recommended skipping this opportunity.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        {
          role: "system",
          content: "You are a professional trading analyst providing clear, educational explanations. Never make profit guarantees. Focus on probability-based analysis. Keep responses concise (2-3 sentences).",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_completion_tokens: 256,
    });

    return response.choices[0]?.message?.content || "Analysis complete. Please review the signal metrics and model scores for detailed insights.";
  } catch (error) {
    console.error("LLM explanation error:", error);
    return `Signal: ${signal.signal} with ${signal.confidence}% confidence. The ensemble of AI models analyzed trend, momentum, volatility, and liquidity patterns to generate this recommendation. ${signal.riskGrade} risk level detected with a ${signal.exitWindowMinutes}-minute exit window.`;
  }
}
