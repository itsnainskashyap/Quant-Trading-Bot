import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { tradingPairs, type TradingPair, type TradingSignal } from "@shared/schema";
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
    const validPairs = tradingPairs;
    
    if (!validPairs.includes(pair)) {
      res.status(400).json({ error: `Invalid trading pair. Valid pairs: ${validPairs.join(', ')}` });
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
      const { pair, tradeMode = 5 } = req.body as { pair: TradingPair; tradeMode?: number };
      
      if (!tradingPairs.includes(pair)) {
        res.status(400).json({ error: "Invalid trading pair" });
        return;
      }
      
      // Validate tradeMode
      const validModes = [1, 3, 5, 10];
      const validatedMode = validModes.includes(tradeMode) ? tradeMode : 5;
      console.log(`[Consensus] Analyzing ${pair} for ${validatedMode} minute trade`);
      
      const [prices, metrics] = await Promise.all([
        storage.getAllPrices(),
        storage.getMarketMetrics(pair),
      ]);
      
      const priceData = prices.find(p => p.pair === pair);
      if (!priceData) {
        res.status(404).json({ error: "Price data not found" });
        return;
      }
      
      const consensus = await getMultiAIConsensus(pair, metrics, priceData.price, validatedMode);
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

  // AI Trading Assistant Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, pair, signal } = req.body;
      
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: "Message is required" });
        return;
      }
      
      const systemPrompt = `You are TradeX AI Assistant, a helpful trading assistant for cryptocurrency traders. You specialize in:
- Explaining trading signals (BUY/SELL/NO_TRADE)
- Stop-loss and take-profit strategies
- Risk management (2% max risk per trade, 10% position sizing)
- Capital protection and money management
- Technical analysis concepts (RSI, MACD, Bollinger Bands, etc.)

Current context: User is viewing ${pair || 'cryptocurrency'} trading signals.
${signal ? `Current signal: ${signal}` : ''}

Keep responses concise (2-3 sentences max), helpful, and focused on trading education. Never give financial advice - remind users to do their own research. Be friendly but professional.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });
      
      const reply = response.choices[0]?.message?.content || "I'm here to help with trading questions!";
      res.json({ reply });
    } catch (error) {
      console.error("Chat error:", error);
      res.json({ reply: "I'm having trouble connecting right now. Try asking about stop-losses, position sizing, or signal interpretation!" });
    }
  });

  app.post("/api/predictions/take", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const userId = user.claims?.sub;
      if (!userId) {
        res.status(401).json({ error: "Invalid session - please log in again" });
        return;
      }
      
      const canTrade = await storage.canUserTrade(userId);
      if (!canTrade.allowed) {
        res.status(403).json({ 
          error: canTrade.reason,
          upgradeRequired: true,
          remaining: canTrade.remaining,
        });
        return;
      }
      
      const { pair, signal: signalType, entryPrice, confidence, exitWindowMinutes, capital, tradeSize, stopLoss, takeProfit } = req.body as { 
        pair: TradingPair;
        signal: 'BUY' | 'SELL';
        entryPrice: number;
        confidence: number;
        exitWindowMinutes: number;
        capital?: number;
        tradeSize?: number;
        stopLoss?: number;
        takeProfit?: number;
      };
      
      if (!tradingPairs.includes(pair)) {
        res.status(400).json({ error: "Invalid trading pair" });
        return;
      }
      
      if (!signalType || (signalType !== 'BUY' && signalType !== 'SELL')) {
        res.status(400).json({ error: "Invalid signal type" });
        return;
      }
      
      if (!entryPrice || entryPrice <= 0) {
        res.status(400).json({ error: "Invalid entry price" });
        return;
      }
      
      // Use the signal data from the frontend instead of regenerating
      const exitWindow = exitWindowMinutes || 5;
      const exitTimestamp = Date.now() + exitWindow * 60 * 1000;
      
      const signal: TradingSignal = {
        id: crypto.randomUUID(),
        pair,
        signal: signalType,
        confidence: confidence || 60,
        riskGrade: confidence >= 70 ? 'LOW' : confidence >= 55 ? 'MEDIUM' : 'HIGH',
        exitWindowMinutes: exitWindow,
        exitTimestamp,
        marketRegime: 'TREND',
        modelScores: [],
        reasoning: `${signalType} signal with ${confidence}% confidence. Trade recorded for ${exitWindow} minute hold.`,
        warnings: [],
        timestamp: Date.now(),
      };
      
      try {
        const prediction = await storage.createPrediction(userId, signal, entryPrice, {
          capital,
          tradeSize,
          stopLoss,
          takeProfit,
        });
        
        res.json({
          prediction,
          signal,
          message: `Trade recorded. Exit window: ${exitWindow} minutes.`,
          remaining: canTrade.remaining !== undefined ? canTrade.remaining - 1 : undefined,
        });
      } catch (dbError: any) {
        console.error("Database error creating prediction:", dbError?.message || dbError);
        console.error("User ID:", userId);
        console.error("Signal:", JSON.stringify(signal));
        res.status(500).json({ error: "Database error recording trade", details: dbError?.message });
      }
    } catch (error: any) {
      console.error("Take prediction error:", error?.message || error);
      res.status(500).json({ error: "Failed to record prediction", details: error?.message });
    }
  });

  app.get("/api/predictions", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const userId = user.claims?.sub;
      if (!userId) {
        res.status(401).json({ error: "Invalid session - please log in again" });
        return;
      }
      
      // Auto-process expired predictions before fetching
      try {
        await storage.processExpiredPredictions();
      } catch (e) {
        console.error("Error processing expired predictions:", e);
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const predictions = await storage.getUserPredictions(userId, limit);
      
      const stats = predictions.reduce((acc, p) => {
        if (p.outcome === "WIN") acc.wins++;
        else if (p.outcome === "LOSS") acc.losses++;
        else if (p.outcome === "NEUTRAL") acc.neutral++;
        else if (p.outcome === "PENDING") acc.pending++;
        else if (p.outcome === "SKIPPED") acc.skipped++;
        
        if (p.profitLoss != null) {
          acc.totalProfitLoss += Number(p.profitLoss);
          // Calculate dollar profit based on trade size
          const tradeSize = Number(p.tradeSize) || 0;
          const dollarProfit = (Number(p.profitLoss) / 100) * tradeSize;
          acc.totalDollarProfit += dollarProfit;
        }
        return acc;
      }, { wins: 0, losses: 0, neutral: 0, pending: 0, skipped: 0, totalProfitLoss: 0, totalDollarProfit: 0 });
      
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
      
      // Platform is now 100% FREE - unlimited signals for everyone
      res.json({
        plan: "free",
        canTrade: true,
        remaining: -1, // Unlimited
        dailyLimit: -1, // Unlimited
        isEarlyAdopter: true,
      });
    } catch (error) {
      console.error("Subscription error:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Backtest statistics endpoint
  app.get("/api/backtest-stats", async (req, res) => {
    try {
      const stats = storage.getBacktestStats();
      res.json(stats);
    } catch (error) {
      console.error("Backtest stats error:", error);
      res.status(500).json({ error: "Failed to fetch backtest stats" });
    }
  });

  // Technical indicators endpoint
  app.get("/api/indicators/:pair", async (req, res) => {
    try {
      const pair = req.params.pair as TradingPair;
      const validPairs = tradingPairs;
      
      if (!validPairs.includes(pair)) {
        res.status(400).json({ error: "Invalid trading pair" });
        return;
      }
      
      const metrics = await storage.getMarketMetrics(pair);
      
      res.json({
        pair,
        rsi: metrics.rsi,
        rsiSignal: metrics.rsiSignal,
        macdTrend: metrics.macdTrend,
        macdHistogram: metrics.macdHistogram,
        bollingerPosition: metrics.bollingerPosition,
        sma20: metrics.sma20,
        sma50: metrics.sma50,
        momentum: metrics.momentum,
        overallSignal: metrics.overallTechnicalSignal,
        strength: metrics.technicalStrength,
      });
    } catch (error) {
      console.error("Indicators error:", error);
      res.status(500).json({ error: "Failed to fetch indicators" });
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
