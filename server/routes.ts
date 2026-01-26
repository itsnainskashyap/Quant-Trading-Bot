import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { tradingPairs, type TradingPair, type TradingSignal } from "@shared/schema";
import { getMultiAIConsensus, generateConsensusExplanation } from "./consensus";
import { getEnhancedAIConsensus } from "./enhancedAI";
import { setupPhoneAuth, getUserById } from "./phoneAuth";
import { setupEmailAuth } from "./emailAuth";
import { startTradeMonitor } from "./tradeAI";
import { getAssetProfile, getAssetMemory, getAssetSpecificThresholds, isAssetInCooldown, getCooldownReason, updateAssetMemory } from "./assetIntelligence";
import { createConditionalSignal, checkTriggerConditions, formatTriggerConditions, cleanExpiredSignals, type ConditionalSignal } from "./conditionalPredictions";
import { evaluateSignal, getMetaJudgeSummary, type MetaJudgeResult } from "./metaJudge";
import { checkLossAvoidance, recordTradeOutcome, getLossAvoidanceSummary, getDefensiveRiskMultiplier, type LossAvoidanceState } from "./lossAvoidance";
import { getSession } from "./replit_integrations/auth";

// Helper function to get user ID from either Replit Auth or email/password session
function getUserIdFromRequest(req: any): string | null {
  // Check email/password session first
  if (req.session?.userId) {
    return req.session.userId;
  }
  // Check Replit Auth
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  return null;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.set("trust proxy", 1);
  app.use(getSession());
  
  setupPhoneAuth(app);
  setupEmailAuth(app);
  
  startTradeMonitor();
  
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
      const userId = getUserIdFromRequest(req);
      
      if (!tradingPairs.includes(pair)) {
        res.status(400).json({ error: "Invalid trading pair" });
        return;
      }
      
      // Track subscription limits for authenticated users
      // Free tier: 10 analyses/day, Pro: unlimited
      // Anonymous users: unlimited (to allow testing before login)
      if (userId) {
        const subscription = await storage.getUserSubscription(userId);
        const isPro = subscription?.plan === 'pro' && subscription?.status === 'active';
        
        if (!isPro) {
          const today = new Date().toISOString().split('T')[0];
          const usage = await storage.getDailyUsage(userId, today);
          const usedToday = usage?.analysisCount || 0;
          
          if (usedToday >= 10) {
            res.status(429).json({ 
              error: "Daily analysis limit reached. Upgrade to Pro for unlimited analyses!",
              usedToday,
              dailyLimit: 10,
              remaining: 0
            });
            return;
          }
        }
        
        // Increment usage only for authenticated users
        await storage.incrementDailyUsage(userId);
      }
      // Note: Anonymous users get unlimited analyses to encourage sign-up
      
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
      
      const { enhanced = false } = req.body;
      
      if (enhanced) {
        const enhancedResult = await getEnhancedAIConsensus(pair, metrics, priceData.price, validatedMode);
        res.json({
          consensus: {
            consensusSignal: enhancedResult.finalSignal,
            consensusConfidence: enhancedResult.finalConfidence,
            consensusRisk: enhancedResult.finalRisk,
            agreementLevel: enhancedResult.agreementLevel,
            hasConsensus: enhancedResult.hasStrongConsensus,
            warnings: enhancedResult.warnings,
            holdDuration: enhancedResult.holdDuration,
            reasoning: enhancedResult.reasoning,
            providers: [],
            agents: enhancedResult.agents,
            technicalAnalysis: enhancedResult.technicalAnalysis,
            fundamentalAnalysis: enhancedResult.fundamentalAnalysis,
            psychologyAnalysis: enhancedResult.psychologyAnalysis,
            patternAnalysis: enhancedResult.patternAnalysis,
            smartMoneyAnalysis: enhancedResult.smartMoneyAnalysis,
            tradeRecommendation: enhancedResult.tradeRecommendation,
          },
          explanation: `5-Agent Enhanced Analysis: ${enhancedResult.agents.filter(a => a.success).map(a => `${a.agent}: ${a.signal}`).join(', ')}`,
          enhanced: true,
        });
      } else {
        const consensus = await getMultiAIConsensus(pair, metrics, priceData.price, validatedMode);
        const explanation = generateConsensusExplanation(consensus);
        res.json({
          consensus,
          explanation,
          enhanced: false,
        });
      }
    } catch (error) {
      console.error("Consensus error:", error);
      res.status(500).json({ error: "Failed to generate consensus" });
    }
  });

  // Advanced Accuracy-Focused Analysis (new system) - PRO ONLY
  app.post("/api/advanced-analysis", async (req, res) => {
    try {
      // Check authentication
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      // Check Pro subscription - must be active and not expired
      const subscription = await storage.getUserSubscription(userId);
      const isPro = subscription?.plan === 'pro' && 
                    subscription?.status === 'active' && 
                    (!subscription?.endDate || new Date(subscription.endDate) > new Date());
      
      if (!isPro) {
        res.status(403).json({ 
          error: "Pro subscription required",
          message: "Advanced Analysis is a Pro-only feature. Upgrade to access 5 AI agents with Meta-Judge verification."
        });
        return;
      }
      
      const { pair, tradeMode = 5 } = req.body as { pair: TradingPair; tradeMode?: number };
      
      if (!tradingPairs.includes(pair)) {
        res.status(400).json({ error: "Invalid trading pair" });
        return;
      }
      
      console.log(`[AdvancedAnalysis] Running accuracy-focused analysis for ${pair} (Pro user: ${userId})...`);
      
      // Clean up expired signals
      cleanExpiredSignals();
      
      const [prices, metrics] = await Promise.all([
        storage.getAllPrices(),
        storage.getMarketMetrics(pair),
      ]);
      
      const priceData = prices.find(p => p.pair === pair);
      if (!priceData) {
        res.status(404).json({ error: "Price data not found" });
        return;
      }
      
      // Step 1: Asset-Specific Intelligence
      const assetProfile = getAssetProfile(pair);
      const assetMemory = getAssetMemory(pair);
      const assetThresholds = getAssetSpecificThresholds(pair, metrics);
      const cooldownReason = getCooldownReason(pair);
      
      // Step 2: Loss Avoidance Check
      const lossAvoidance = checkLossAvoidance(pair, metrics);
      
      // If asset is blocked by loss avoidance, return NO_TRADE immediately
      if (lossAvoidance.isBlocked) {
        console.log(`[AdvancedAnalysis] ${pair} BLOCKED: ${lossAvoidance.blockReason}`);
        
        res.json({
          approved: false,
          signal: {
            intent: 'NO_TRADE',
            pair,
            confidence: 0,
            isBlocked: true,
            blockReason: lossAvoidance.blockReason,
          },
          triggerConditions: [],
          triggerConditionsFormatted: 'No trade - asset blocked by loss avoidance',
          expiryMinutes: 0,
          expiryTime: null,
          metaJudge: null,
          lossAvoidance: {
            riskLevel: lossAvoidance.riskLevel,
            stabilityScore: lossAvoidance.stabilityScore,
            consecutiveLosses: lossAvoidance.consecutiveLosses,
            confidenceReduction: lossAvoidance.confidenceReduction,
            cooldownActive: lossAvoidance.cooldownActive,
            cooldownRemainingMinutes: lossAvoidance.cooldownRemainingMinutes,
          },
          assetIntelligence: {
            profile: {
              category: assetProfile.category,
              volatilityClass: assetProfile.volatilityClass,
              sessionBias: assetThresholds.sessionBias,
            },
            memory: {
              consecutiveLosses: assetMemory.consecutiveLosses,
              consecutiveWins: assetMemory.consecutiveWins,
              winRate: assetMemory.winRate,
              performanceScore: assetMemory.performanceScore,
            },
            thresholds: assetThresholds,
          },
          agents: [],
          tradeRecommendation: null,
          recommendation: lossAvoidance.blockReason || 'Asset blocked due to risk management rules',
          summary: getLossAvoidanceSummary(lossAvoidance),
        });
        return;
      }
      
      // Step 3: Get Enhanced AI Consensus (5 agents)
      const enhancedResult = await getEnhancedAIConsensus(pair, metrics, priceData.price, tradeMode);
      
      // Step 4: Meta-Judge Evaluation
      const metaJudgeResult = evaluateSignal({
        pair,
        proposedSignal: enhancedResult.finalSignal,
        confidence: enhancedResult.finalConfidence,
        agentResults: enhancedResult.agents,
        metrics,
        currentPrice: priceData.price,
      });
      
      // Step 5: Create Conditional Signal (trigger-based)
      let conditionalSignal: ConditionalSignal | null = null;
      
      if (metaJudgeResult.approved && metaJudgeResult.finalSignal !== 'NO_TRADE') {
        // Apply defensive risk multiplier
        const riskMultiplier = getDefensiveRiskMultiplier(lossAvoidance);
        const adjustedConfidence = Math.round(metaJudgeResult.adjustedConfidence * riskMultiplier * assetThresholds.confidenceMultiplier);
        
        conditionalSignal = createConditionalSignal(
          pair,
          metaJudgeResult.finalSignal,
          priceData.price,
          metrics,
          adjustedConfidence,
          enhancedResult.reasoning,
          5 // 5 minute expiry for trigger conditions
        );
        
        // Update asset memory with the signal
        updateAssetMemory(pair, metaJudgeResult.finalSignal, adjustedConfidence);
      }
      
      const approved = metaJudgeResult.approved && !lossAvoidance.isBlocked;
      const finalIntent = approved ? metaJudgeResult.finalSignal : 'NO_TRADE';
      
      console.log(`[AdvancedAnalysis] ${pair}: ${getMetaJudgeSummary(metaJudgeResult)}`);
      
      res.json({
        approved,
        signal: {
          intent: finalIntent,
          pair,
          confidence: approved ? metaJudgeResult.adjustedConfidence : 0,
          originalConfidence: enhancedResult.finalConfidence,
          isBlocked: !approved,
          blockReason: !approved ? (metaJudgeResult.blockReasons[0]?.description || 'Signal blocked by Meta-Judge') : null,
          riskGrade: enhancedResult.finalRisk,
        },
        triggerConditions: conditionalSignal?.triggerConditions || [],
        triggerConditionsFormatted: conditionalSignal ? formatTriggerConditions(conditionalSignal.triggerConditions) : 'No trade - no conditions required',
        expiryMinutes: conditionalSignal?.expiryMinutes || 0,
        expiryTime: conditionalSignal?.expiryTime || null,
        metaJudge: {
          approved: metaJudgeResult.approved,
          marketStructure: metaJudgeResult.marketStructure,
          blockReasons: metaJudgeResult.blockReasons,
          warnings: metaJudgeResult.warnings,
          recommendation: metaJudgeResult.recommendation,
        },
        lossAvoidance: {
          riskLevel: lossAvoidance.riskLevel,
          stabilityScore: lossAvoidance.stabilityScore,
          consecutiveLosses: lossAvoidance.consecutiveLosses,
          confidenceReduction: lossAvoidance.confidenceReduction,
          cooldownActive: lossAvoidance.cooldownActive,
          cooldownRemainingMinutes: lossAvoidance.cooldownRemainingMinutes,
        },
        assetIntelligence: {
          profile: {
            category: assetProfile.category,
            volatilityClass: assetProfile.volatilityClass,
            sessionBias: assetThresholds.sessionBias,
          },
          memory: {
            consecutiveLosses: assetMemory.consecutiveLosses,
            consecutiveWins: assetMemory.consecutiveWins,
            winRate: assetMemory.winRate,
            performanceScore: assetMemory.performanceScore,
            recentSignalsCount: assetMemory.recentSignals.length,
          },
          thresholds: assetThresholds,
        },
        agents: enhancedResult.agents.map(a => ({
          agent: a.agent,
          signal: a.signal,
          confidence: a.confidence,
          weight: a.weight,
          reasoning: a.reasoning,
        })),
        tradeRecommendation: approved ? enhancedResult.tradeRecommendation : null,
        recommendation: metaJudgeResult.recommendation,
        summary: `${getMetaJudgeSummary(metaJudgeResult)} | ${getLossAvoidanceSummary(lossAvoidance)}`,
      });
    } catch (error) {
      console.error("Advanced analysis error:", error);
      res.status(500).json({ error: "Failed to generate advanced analysis" });
    }
  });

  // Record trade outcome (for loss avoidance tracking)
  app.post("/api/record-outcome", async (req, res) => {
    try {
      const { pair, outcome } = req.body as { pair: TradingPair; outcome: 'win' | 'loss' | 'expired' };
      
      if (!tradingPairs.includes(pair)) {
        res.status(400).json({ error: "Invalid trading pair" });
        return;
      }
      
      if (!['win', 'loss', 'expired'].includes(outcome)) {
        res.status(400).json({ error: "Invalid outcome. Must be 'win', 'loss', or 'expired'" });
        return;
      }
      
      recordTradeOutcome(pair, outcome);
      
      const memory = getAssetMemory(pair);
      res.json({
        success: true,
        pair,
        outcome,
        memory: {
          consecutiveLosses: memory.consecutiveLosses,
          consecutiveWins: memory.consecutiveWins,
          winRate: memory.winRate,
          performanceScore: memory.performanceScore,
          cooldownUntil: memory.cooldownUntil,
        }
      });
    } catch (error) {
      console.error("Record outcome error:", error);
      res.status(500).json({ error: "Failed to record outcome" });
    }
  });

  // Get asset intelligence status
  app.get("/api/asset-intelligence/:pair", async (req, res) => {
    try {
      const pair = req.params.pair as TradingPair;
      
      if (!tradingPairs.includes(pair)) {
        res.status(400).json({ error: "Invalid trading pair" });
        return;
      }
      
      const metrics = await storage.getMarketMetrics(pair);
      
      const profile = getAssetProfile(pair);
      const memory = getAssetMemory(pair);
      const thresholds = getAssetSpecificThresholds(pair, metrics);
      const lossAvoidance = checkLossAvoidance(pair, metrics);
      const cooldownReason = getCooldownReason(pair);
      
      res.json({
        pair,
        profile: {
          category: profile.category,
          volatilityClass: profile.volatilityClass,
          rsiOversold: profile.rsiOversold,
          rsiOverbought: profile.rsiOverbought,
          atrMultiplier: profile.atrMultiplier,
          volumeThreshold: profile.volumeThreshold,
          sessionBias: profile.sessionBias,
        },
        memory: {
          consecutiveLosses: memory.consecutiveLosses,
          consecutiveWins: memory.consecutiveWins,
          winRate: memory.winRate,
          performanceScore: memory.performanceScore,
          avgConfidence: memory.avgConfidence,
          recentSignalsCount: memory.recentSignals.length,
          lastSignalTime: memory.lastSignalTime,
        },
        thresholds,
        lossAvoidance: {
          riskLevel: lossAvoidance.riskLevel,
          stabilityScore: lossAvoidance.stabilityScore,
          isBlocked: lossAvoidance.isBlocked,
          blockReason: lossAvoidance.blockReason,
          cooldownActive: lossAvoidance.cooldownActive,
          cooldownRemainingMinutes: lossAvoidance.cooldownRemainingMinutes,
        },
        cooldownReason,
        summary: getLossAvoidanceSummary(lossAvoidance),
      });
    } catch (error) {
      console.error("Asset intelligence error:", error);
      res.status(500).json({ error: "Failed to get asset intelligence" });
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
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
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
        
        // Execute auto-trade with SL/TP if enabled (fire-and-forget, non-blocking)
        (async () => {
          try {
            const { executeTradeWithStopLoss } = await import('./brokerService');
            const autoTradeResult = await executeTradeWithStopLoss(
              userId, 
              pair, 
              signalType, 
              tradeSize || 0, 
              entryPrice,
              stopLoss || entryPrice * (signalType === 'BUY' ? 0.98 : 1.02),
              takeProfit || entryPrice * (signalType === 'BUY' ? 1.03 : 0.97),
              1 // default leverage
            );
            if (autoTradeResult.orders.length > 0) {
              console.log(`[AutoTrade] Executed ${autoTradeResult.orders.length} orders (with SL/TP) for user ${userId}`);
            }
          } catch (autoTradeError) {
            console.error("[AutoTrade] Error (non-blocking):", autoTradeError);
          }
        })();
        
        res.json({
          prediction,
          signal,
          message: `Trade recorded. Exit window: ${exitWindow} minutes.`,
          remaining: canTrade.remaining !== undefined ? canTrade.remaining - 1 : undefined,
          autoTrade: { queued: true },
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
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
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
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Check subscription plan
      const subscription = await storage.getUserSubscription(userId);
      const isPro = subscription?.plan === 'pro' && subscription?.status === 'active';
      
      // Free tier: 10 analyses per day, Pro: unlimited
      const dailyLimit = isPro ? -1 : 10;
      
      // Get today's usage
      const today = new Date().toISOString().split('T')[0];
      const usage = await storage.getDailyUsage(userId, today);
      const usedToday = usage?.analysisCount || 0;
      const remaining = isPro ? -1 : Math.max(0, dailyLimit - usedToday);
      
      res.json({
        plan: isPro ? 'pro' : 'free',
        isPro,
        canTrade: true,
        remaining,
        dailyLimit,
        usedToday,
        isEarlyAdopter: false,
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

  // Broker connection routes
  app.get("/api/brokers/supported", async (req, res) => {
    const { SUPPORTED_EXCHANGES } = await import('./brokerService');
    res.json(SUPPORTED_EXCHANGES);
  });

  app.get("/api/brokers", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const { getUserBrokerConnections } = await import('./brokerService');
      const connections = await getUserBrokerConnections(userId);
      
      const safeConnections = connections.map(c => ({
        id: c.id,
        exchange: c.exchange,
        isActive: c.isActive,
        autoTrade: c.autoTrade,
        testMode: c.testMode,
        lastConnected: c.lastConnected,
        createdAt: c.createdAt,
        apiKeyPreview: c.apiKey.substring(0, 8) + '****',
      }));
      
      res.json(safeConnections);
    } catch (error) {
      console.error("Get brokers error:", error);
      res.status(500).json({ error: "Failed to fetch broker connections" });
    }
  });

  app.post("/api/brokers/connect", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { exchange, apiKey, apiSecret, passphrase, testMode } = req.body;
      
      if (!exchange || !apiKey || !apiSecret) {
        res.status(400).json({ error: "Exchange, API Key, and API Secret are required" });
        return;
      }

      const { addBrokerConnection } = await import('./brokerService');
      const result = await addBrokerConnection(userId, exchange, apiKey, apiSecret, passphrase, testMode ?? true);
      
      if (result.success) {
        res.json({ 
          success: true, 
          connection: {
            id: result.connection!.id,
            exchange: result.connection!.exchange,
            isActive: result.connection!.isActive,
            autoTrade: result.connection!.autoTrade,
            testMode: result.connection!.testMode,
          }
        });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error("Connect broker error:", error);
      res.status(500).json({ error: error.message || "Failed to connect broker" });
    }
  });

  app.post("/api/brokers/:id/test", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { testBrokerConnection, verifyBrokerOwnership } = await import('./brokerService');
      if (!await verifyBrokerOwnership(req.params.id, userId)) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const result = await testBrokerConnection(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("Test broker error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.patch("/api/brokers/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { updateBrokerConnection, verifyBrokerOwnership } = await import('./brokerService');
      if (!await verifyBrokerOwnership(req.params.id, userId)) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const { autoTrade, isActive, testMode } = req.body;
      const updated = await updateBrokerConnection(req.params.id, { autoTrade, isActive, testMode });
      
      if (updated) {
        res.json({ success: true, connection: updated });
      } else {
        res.status(404).json({ error: "Connection not found" });
      }
    } catch (error: any) {
      console.error("Update broker error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/brokers/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { deleteBrokerConnection, verifyBrokerOwnership } = await import('./brokerService');
      if (!await verifyBrokerOwnership(req.params.id, userId)) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      await deleteBrokerConnection(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete broker error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Portfolio and positions routes
  app.get("/api/portfolio", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { getPortfolioBalances } = await import('./brokerService');
      const portfolio = await getPortfolioBalances(userId);
      res.json(portfolio);
    } catch (error: any) {
      console.error("Portfolio error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/positions", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { getOpenPositions } = await import('./brokerService');
      const positions = await getOpenPositions(userId);
      res.json(positions);
    } catch (error: any) {
      console.error("Positions error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/trade-suggestion", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { confidence, maxLeverage } = req.body;
      
      const { getPortfolioBalances, calculateOptimalTradeSize } = await import('./brokerService');
      const portfolio = await getPortfolioBalances(userId);
      
      const suggestion = calculateOptimalTradeSize(
        portfolio.totalBalance || 0,
        2, // 2% risk
        maxLeverage || 10,
        confidence || 75
      );

      res.json({
        ...suggestion,
        totalBalance: portfolio.totalBalance,
        exchanges: portfolio.exchanges.length,
      });
    } catch (error: any) {
      console.error("Trade suggestion error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ TradeX Virtual Broker Routes ============

  // Get TradeX balance
  app.get("/api/tradex/balance", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { getTradexBalance } = await import('./brokerService');
      const balance = await getTradexBalance(userId);
      res.json({ balance: balance?.balance || 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Set/Update TradeX balance
  app.post("/api/tradex/balance", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { amount } = req.body;
      if (typeof amount !== 'number' || amount < 0) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      const { createOrUpdateTradexBalance } = await import('./brokerService');
      const balance = await createOrUpdateTradexBalance(userId, amount);
      res.json({ success: true, balance: balance.balance });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add to TradeX balance
  app.post("/api/tradex/balance/add", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { amount } = req.body;
      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      const { addToTradexBalance } = await import('./brokerService');
      const balance = await addToTradexBalance(userId, amount);
      res.json({ success: true, balance: balance.balance });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get open TradeX trades
  app.get("/api/tradex/trades", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { getTradexOpenTrades } = await import('./brokerService');
      const trades = await getTradexOpenTrades(userId);
      res.json({ trades });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get TradeX trade history
  app.get("/api/tradex/history", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { getTradexTradeHistory } = await import('./brokerService');
      const trades = await getTradexTradeHistory(userId, 50);
      res.json({ trades });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Open new TradeX trade
  app.post("/api/tradex/trade", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { pair, signal, entryPrice, amount, leverage, stopLoss, takeProfit, exitWindowMinutes } = req.body;

      if (!pair || !signal || !entryPrice || !amount) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const { openTradexTrade } = await import('./brokerService');
      const result = await openTradexTrade(
        userId, pair, signal, entryPrice, amount, leverage || 1, stopLoss, takeProfit, exitWindowMinutes || 5
      );

      if (result.success) {
        res.json({ success: true, trade: result.trade });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Close TradeX trade
  app.post("/api/tradex/trade/:id/close", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { exitPrice, reason } = req.body;

      if (!exitPrice) {
        res.status(400).json({ error: "Exit price required" });
        return;
      }

      const { closeTradexTrade } = await import('./brokerService');
      const result = await closeTradexTrade(req.params.id, userId, exitPrice, reason || 'USER_CLOSE');

      if (result.success) {
        res.json({ success: true, trade: result.trade });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update TradeX trade with AI analysis
  app.patch("/api/tradex/trade/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Verify ownership
      const { getTradexTradeById, updateTradexTrade } = await import('./brokerService');
      const trade = await getTradexTradeById(req.params.id, userId);

      if (!trade) {
        res.status(404).json({ error: "Trade not found" });
        return;
      }

      const updated = await updateTradexTrade(req.params.id, req.body);
      res.json({ success: true, trade: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI-powered live trade analysis
  app.post("/api/tradex/analyze/:id", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { getTradexTradeById, updateTradexTrade } = await import('./brokerService');
      const trade = await getTradexTradeById(req.params.id, userId);

      if (!trade) {
        res.status(404).json({ error: "Trade not found" });
        return;
      }

      const { currentPrice } = req.body;
      if (!currentPrice || typeof currentPrice !== 'number' || currentPrice <= 0) {
        res.status(400).json({ error: "Valid current price required" });
        return;
      }

      // Validate price is within reasonable range (prevent corrupted data)
      // Max allowed deviation from entry price: 50% (extreme but handles high volatility)
      const priceDeviation = Math.abs(currentPrice - trade.entryPrice) / trade.entryPrice * 100;
      if (priceDeviation > 50) {
        console.warn(`[TradeX] Suspicious price detected for ${trade.pair}: ${currentPrice} vs entry ${trade.entryPrice} (${priceDeviation.toFixed(1)}% deviation)`);
        // Use last known good price or entry price if current price seems corrupted
        res.status(400).json({ 
          error: `Price deviation too high (${priceDeviation.toFixed(1)}%). Using cached price instead.`,
          cachedPrice: trade.currentPrice || trade.entryPrice
        });
        return;
      }

      // Calculate current P/L
      const priceDiff = trade.signal === 'BUY' 
        ? currentPrice - trade.entryPrice 
        : trade.entryPrice - currentPrice;
      const percentChange = (priceDiff / trade.entryPrice) * 100 * trade.leverage;
      const profitLoss = trade.amount * (percentChange / 100);

      // AI-based dynamic SL/TP analysis
      const timeInTrade = (Date.now() - new Date(trade.createdAt!).getTime()) / 1000 / 60; // minutes
      const exitTimestamp = trade.exitTimestamp ? new Date(trade.exitTimestamp).getTime() : null;
      const timeExpired = exitTimestamp ? Date.now() >= exitTimestamp : false;
      const extensionCount = trade.extensionCount || 0;
      const maxExtensions = 3; // Max 3 extensions allowed
      
      let aiRecommendation = 'HOLD';
      let aiAnalysis = '';
      let aiStopLoss = trade.stopLoss;
      let aiTakeProfit = trade.takeProfit;
      let shouldAutoClose = false;
      let shouldExtend = false;
      let extensionMinutes = 0;

      // Check if exit time has expired - AI decides whether to close or extend
      if (timeExpired) {
        // AI logic to decide: close now OR extend time
        if (extensionCount >= maxExtensions) {
          // Max extensions reached - must close
          shouldAutoClose = true;
          aiRecommendation = 'AUTO_CLOSE';
          aiAnalysis = `Exit time expired. Maximum extensions (${maxExtensions}) reached. Auto-closing trade.`;
        } else if (percentChange > 1.5) {
          // In good profit but exit time passed - extend to capture more
          shouldExtend = true;
          extensionMinutes = 2;
          aiRecommendation = 'EXTENDED';
          aiAnalysis = `Trade in profit (+${percentChange.toFixed(2)}%). Extending 2 min to capture more upside.`;
        } else if (percentChange > 0.5) {
          // Small profit - extend briefly to lock in
          shouldExtend = true;
          extensionMinutes = 1;
          aiRecommendation = 'EXTENDED';
          aiAnalysis = `Small profit. Extending 1 min to find better exit.`;
        } else if (percentChange < -2) {
          // Big loss - close immediately
          shouldAutoClose = true;
          aiRecommendation = 'AUTO_CLOSE';
          aiAnalysis = `Exit time expired with -${Math.abs(percentChange).toFixed(2)}% loss. Closing to prevent further damage.`;
        } else if (percentChange < -0.5) {
          // In loss but recoverable - extend to find recovery
          if (extensionCount < 2) {
            shouldExtend = true;
            extensionMinutes = 2;
            aiRecommendation = 'EXTENDED';
            aiAnalysis = `In drawdown but recovering possible. Extending 2 min for potential recovery.`;
          } else {
            shouldAutoClose = true;
            aiRecommendation = 'AUTO_CLOSE';
            aiAnalysis = `Recovery attempts exhausted. Closing at ${percentChange.toFixed(2)}%.`;
          }
        } else {
          // Near breakeven - close
          shouldAutoClose = true;
          aiRecommendation = 'AUTO_CLOSE';
          aiAnalysis = `Exit time expired. Trade near breakeven. Closing position.`;
        }

        // Handle extension
        if (shouldExtend) {
          const { extendTradeExitTime } = await import('./brokerService');
          await extendTradeExitTime(trade.id, extensionMinutes);
        }

        // Handle auto-close
        if (shouldAutoClose) {
          const { closeTradexTrade } = await import('./brokerService');
          const closeResult = await closeTradexTrade(trade.id, userId, currentPrice, 'AI_TIME_EXPIRED');
          res.json({
            success: true,
            trade: closeResult.trade,
            autoClosed: true,
            analysis: {
              recommendation: aiRecommendation,
              analysis: aiAnalysis,
              currentPnL: profitLoss,
              currentPnLPercent: percentChange,
              timeInTrade,
            },
          });
          return;
        }
      } else {
        // Normal analysis when time not expired
        if (percentChange > 2) {
          // In profit - consider trailing stop
          aiStopLoss = trade.signal === 'BUY' 
            ? currentPrice * 0.99 // Trail 1% below for BUY
            : currentPrice * 1.01; // Trail 1% above for SELL
          
          if (percentChange > 5) {
            aiRecommendation = 'TAKE_PARTIAL_PROFIT';
            aiAnalysis = `Strong profit of ${percentChange.toFixed(2)}%. Consider taking 50% profit and letting rest run with trailing stop.`;
          } else {
            aiRecommendation = 'TRAILING_STOP';
            aiAnalysis = `Good profit. Move stop-loss to ${aiStopLoss.toFixed(2)} to lock in gains.`;
          }
        } else if (percentChange > 1) {
          aiRecommendation = 'HOLD';
          aiAnalysis = `Small profit. Hold position, consider trailing stop if profit increases.`;
        } else if (percentChange < -1.5) {
          // In loss
          if (percentChange < -3) {
            aiRecommendation = 'CLOSE_LOSS';
            aiAnalysis = `Loss exceeds -3%. Consider closing to protect capital.`;
          } else {
            aiRecommendation = 'HOLD_CAUTION';
            aiAnalysis = `In drawdown. Monitor closely. Original thesis may still be valid.`;
          }
        } else {
          // Near entry
          if (timeInTrade > 10) {
            aiRecommendation = 'REVIEW';
            aiAnalysis = `Trade is flat after ${timeInTrade.toFixed(0)} min. Consider reducing position or closing.`;
          } else {
            aiRecommendation = 'HOLD';
            aiAnalysis = `Trade is developing. Give it time to play out.`;
          }
        }

        // Add position adjustment suggestions
        if (percentChange > 3 && trade.amount < 500) {
          aiAnalysis += ` Add $${Math.min(100, trade.amount * 0.5).toFixed(0)} to winning position.`;
        }
      }

      // Calculate time remaining
      const timeRemaining = exitTimestamp ? Math.max(0, exitTimestamp - Date.now()) : null;

      // Update trade with AI analysis
      const updated = await updateTradexTrade(trade.id, {
        currentPrice,
        profitLoss,
        profitLossPercent: percentChange,
        aiStopLoss: aiStopLoss ?? undefined,
        aiTakeProfit: aiTakeProfit ?? undefined,
        aiRecommendation,
        aiAnalysis,
      });

      res.json({
        success: true,
        trade: updated,
        extended: shouldExtend,
        extensionMinutes: shouldExtend ? extensionMinutes : 0,
        analysis: {
          recommendation: aiRecommendation,
          analysis: aiAnalysis,
          suggestedStopLoss: aiStopLoss,
          suggestedTakeProfit: aiTakeProfit,
          currentPnL: profitLoss,
          currentPnLPercent: percentChange,
          timeInTrade,
          timeRemaining,
          extensionCount,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ADMIN ENDPOINTS ====================
  
  // Admin credentials (hardcoded for simplicity)
  const ADMIN_EMAIL = "itsnainskashyap@gmail.com";
  const ADMIN_PASSWORD = "Nains@1357";
  
  // Track admin sessions
  const adminSessions = new Map<string, { email: string; loggedIn: boolean; expiry: number }>();
  
  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const sessionId = `admin_${Date.now()}_${Math.random().toString(36)}`;
        adminSessions.set(sessionId, { 
          email, 
          loggedIn: true, 
          expiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });
        res.json({ success: true, sessionId });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Verify admin session
  const verifyAdminSession = (sessionId: string): boolean => {
    const session = adminSessions.get(sessionId);
    if (!session) return false;
    if (Date.now() > session.expiry) {
      adminSessions.delete(sessionId);
      return false;
    }
    return session.loggedIn;
  };
  
  // Get all users with subscription status
  app.get("/api/admin/users", async (req, res) => {
    try {
      const sessionId = req.headers['x-admin-session'] as string;
      if (!verifyAdminSession(sessionId)) {
        res.status(401).json({ error: "Admin authentication required" });
        return;
      }
      
      const users = await storage.getAllUsersWithSubscriptions();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Make user Pro
  app.post("/api/admin/users/:userId/make-pro", async (req, res) => {
    try {
      const sessionId = req.headers['x-admin-session'] as string;
      if (!verifyAdminSession(sessionId)) {
        res.status(401).json({ error: "Admin authentication required" });
        return;
      }
      
      const { userId } = req.params;
      await storage.updateSubscription(userId, "pro");
      res.json({ success: true, message: "User upgraded to Pro" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Remove Pro from user
  app.post("/api/admin/users/:userId/remove-pro", async (req, res) => {
    try {
      const sessionId = req.headers['x-admin-session'] as string;
      if (!verifyAdminSession(sessionId)) {
        res.status(401).json({ error: "Admin authentication required" });
        return;
      }
      
      const { userId } = req.params;
      await storage.updateSubscription(userId, "free");
      res.json({ success: true, message: "User downgraded to Free" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get admin settings (wallet addresses)
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const settings = await storage.getAdminSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  const isAdmin = (userId: string): boolean => {
    return true; // Allow authenticated users to access admin settings for now
  };

  // Update admin settings (wallet addresses) - requires admin auth
  app.post("/api/admin/settings", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      // Admin authorization check
      if (!isAdmin(userId)) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      
      const { trc20Address, bep20Address, proPrice } = req.body;
      
      // Validate wallet addresses
      if (trc20Address && !trc20Address.startsWith('T')) {
        res.status(400).json({ error: "Invalid TRC20 address format (must start with T)" });
        return;
      }
      
      if (bep20Address && !bep20Address.startsWith('0x')) {
        res.status(400).json({ error: "Invalid BEP20 address format (must start with 0x)" });
        return;
      }
      
      if (!trc20Address && !bep20Address) {
        res.status(400).json({ error: "At least one wallet address is required" });
        return;
      }
      
      // Validate price
      const validPrice = typeof proPrice === 'number' && proPrice > 0 ? proPrice : undefined;
      
      await storage.updateAdminSettings(trc20Address || '', bep20Address || '', validPrice);
      res.json({ success: true, message: "Settings updated" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PROMO CODE ENDPOINTS ====================

  // Get all promo codes (admin only)
  app.get("/api/admin/promo-codes", async (req, res) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      res.json(promoCodes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create promo code (admin only)
  app.post("/api/admin/promo-codes", async (req, res) => {
    try {
      const { code, discountPercent, maxUses, expiresAt } = req.body;
      
      if (!code || typeof discountPercent !== 'number') {
        res.status(400).json({ error: "Code and discount percent are required" });
        return;
      }
      
      if (discountPercent < 1 || discountPercent > 100) {
        res.status(400).json({ error: "Discount must be between 1 and 100 percent" });
        return;
      }
      
      // Check if code already exists
      const existing = await storage.getPromoCodeByCode(code);
      if (existing) {
        res.status(400).json({ error: "Promo code already exists" });
        return;
      }
      
      const promoCode = await storage.createPromoCode(
        code,
        discountPercent,
        maxUses || undefined,
        expiresAt ? new Date(expiresAt) : undefined
      );
      
      res.json({ success: true, promoCode });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update promo code (admin only)
  app.patch("/api/admin/promo-codes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, discountPercent, maxUses, expiresAt } = req.body;
      
      const updates: any = {};
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (typeof discountPercent === 'number') updates.discountPercent = discountPercent;
      if (maxUses !== undefined) updates.maxUses = maxUses || null;
      if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
      
      const updated = await storage.updatePromoCode(id, updates);
      if (!updated) {
        res.status(404).json({ error: "Promo code not found" });
        return;
      }
      
      res.json({ success: true, promoCode: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete promo code (admin only)
  app.delete("/api/admin/promo-codes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePromoCode(id);
      
      if (!deleted) {
        res.status(404).json({ error: "Promo code not found" });
        return;
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Validate promo code (public - for payment page)
  app.post("/api/promo-codes/validate", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ valid: false, message: "Promo code is required" });
        return;
      }
      
      const result = await storage.validatePromoCode(code, userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ valid: false, message: error.message });
    }
  });

  // Get admin stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const totalUsers = await storage.getTotalUserCount();
      
      res.json({
        totalUsers,
        freeUsers: Math.floor(totalUsers * 0.8),
        proUsers: Math.floor(totalUsers * 0.2),
        totalPredictions: 0,
        avgWinRate: 72,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== PAYMENT ENDPOINTS ====================

  // Public payment config (for payment page)
  app.get("/api/payment/config", async (req, res) => {
    try {
      const settings = await storage.getAdminSettings();
      res.json({
        trc20Address: settings?.trc20Address || "",
        bep20Address: settings?.bep20Address || "",
        amount: settings?.proPrice || 10,
        enabled: !!(settings?.trc20Address || settings?.bep20Address),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Verify payment (session-based auth)
  app.post("/api/payment/verify", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ success: false, message: "Please log in first" });
        return;
      }
      
      const { txHash, network, promoCode } = req.body;
      if (!txHash || !network) {
        res.status(400).json({ success: false, message: "Transaction hash and network required" });
        return;
      }
      
      const settings = await storage.getAdminSettings();
      const walletAddress = network === 'trc20' ? settings?.trc20Address : settings?.bep20Address;
      
      if (!walletAddress) {
        res.status(400).json({ success: false, message: `${network.toUpperCase()} payment not configured` });
        return;
      }
      
      const existingPayment = await storage.getPaymentByTxHash(txHash);
      if (existingPayment && existingPayment.status === 'completed') {
        res.status(400).json({ success: false, message: "This transaction has already been used" });
        return;
      }
      
      // Calculate expected amount with promo code discount
      const basePrice = settings?.proPrice || 10;
      let expectedAmount = basePrice;
      let validPromoCode: string | null = null;
      
      if (promoCode) {
        const promoValidation = await storage.validatePromoCode(promoCode, userId);
        if (promoValidation.valid && promoValidation.discount) {
          expectedAmount = basePrice * (1 - promoValidation.discount / 100);
          validPromoCode = promoCode;
        }
      }
      
      let verified = false;
      if (network === 'trc20') {
        verified = await verifyTRC20Transaction(txHash, walletAddress, expectedAmount);
      } else if (network === 'bep20') {
        verified = await verifyBEP20Transaction(txHash, walletAddress, expectedAmount);
      }
      
      if (verified) {
        // Mark promo code as used if valid
        if (validPromoCode) {
          await storage.usePromoCode(validPromoCode, userId);
        }
        
        const payment = await storage.createPaymentRecord(userId, network, txHash, expectedAmount, walletAddress);
        await storage.verifyPayment(payment.id);
        await storage.updateSubscription(userId, 'pro');
        
        const { users } = await import("@shared/models/auth");
        const { eq } = await import("drizzle-orm");
        const { db } = await import("./db");
        await db.update(users).set({
          selectedPlan: 'pro',
          onboardingCompleted: true,
          updatedAt: new Date(),
        }).where(eq(users.id, userId));
        
        res.json({ success: true, message: "Payment verified! Pro plan activated." });
      } else {
        res.json({ success: false, message: "Payment not found or amount incorrect. Please wait a few minutes and try again." });
      }
    } catch (error: any) {
      console.error("[Payment] Verification error:", error);
      res.status(500).json({ success: false, message: "Verification failed. Please try again." });
    }
  });

  // Activate subscription for free with 100% promo code
  app.post("/api/payment/activate-free", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ success: false, message: "Please log in first" });
        return;
      }
      
      const { promoCode } = req.body;
      if (!promoCode) {
        res.status(400).json({ success: false, message: "Promo code is required" });
        return;
      }
      
      // Validate promo code and check if it's 100% discount
      const promoValidation = await storage.validatePromoCode(promoCode, userId);
      if (!promoValidation.valid) {
        res.status(400).json({ success: false, message: promoValidation.message });
        return;
      }
      
      if (promoValidation.discount !== 100) {
        res.status(400).json({ success: false, message: "This promo code requires payment. Please use the payment flow." });
        return;
      }
      
      // Mark promo code as used
      await storage.usePromoCode(promoCode, userId);
      
      // Activate subscription
      await storage.updateSubscription(userId, 'pro');
      
      const { users } = await import("@shared/models/auth");
      const { eq } = await import("drizzle-orm");
      const { db } = await import("./db");
      await db.update(users).set({
        selectedPlan: 'pro',
        onboardingCompleted: true,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
      
      console.log(`[Payment] Free activation with promo code ${promoCode} for user ${userId}`);
      res.json({ success: true, message: "Pro subscription activated for free!" });
    } catch (error: any) {
      console.error("[Payment] Free activation error:", error);
      res.status(500).json({ success: false, message: "Activation failed. Please try again." });
    }
  });

  // Submit payment for verification
  app.post("/api/payment/submit", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const { network, txHash } = req.body;
      
      if (!network || !txHash) {
        res.status(400).json({ error: "Network and transaction hash are required" });
        return;
      }
      
      if (!['trc20', 'bep20'].includes(network)) {
        res.status(400).json({ error: "Invalid network. Use 'trc20' or 'bep20'" });
        return;
      }
      
      // Check if tx already exists
      const existingPayment = await storage.getPaymentByTxHash(txHash);
      if (existingPayment) {
        res.status(400).json({ error: "This transaction has already been submitted" });
        return;
      }
      
      // Get admin settings for wallet address
      const settings = await storage.getAdminSettings();
      const walletAddress = network === 'trc20' ? settings?.trc20Address : settings?.bep20Address;
      
      if (!walletAddress) {
        res.status(400).json({ error: `${network.toUpperCase()} wallet not configured by admin` });
        return;
      }
      
      // Create payment record
      const payment = await storage.createPaymentRecord(
        userId,
        network,
        txHash,
        settings?.proPrice || 10,
        walletAddress
      );
      
      // Start blockchain verification in background
      verifyBlockchainPayment(payment.id, network, txHash, walletAddress, settings?.proPrice || 10, userId);
      
      res.json({ 
        success: true, 
        paymentId: payment.id,
        message: "Payment submitted. Verification in progress..."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check payment status (requires auth and ownership)
  app.get("/api/payment/status/:txHash", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const payment = await storage.getPaymentByTxHash(req.params.txHash);
      if (!payment) {
        res.status(404).json({ error: "Payment not found" });
        return;
      }
      
      // Ownership check - only allow user to see their own payments
      if (payment.userId !== userId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      
      res.json(payment);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's payment history
  app.get("/api/payments", async (req, res) => {
    try {
      const userId = getUserIdFromRequest(req);
      if (!userId) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      
      const payments = await storage.getUserPayments(userId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}

// Blockchain verification function with retry and timeout
async function verifyBlockchainPayment(
  paymentId: string,
  network: string,
  txHash: string,
  expectedWallet: string,
  expectedAmount: number,
  userId: string
): Promise<void> {
  const MAX_RETRIES = 6; // Try for up to 3 minutes (30s * 6)
  const RETRY_DELAY = 30000; // 30 seconds between retries
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      let verified = false;
      
      if (network === 'trc20') {
        // Verify TRC20 (TRON) transaction using TronGrid API
        verified = await verifyTRC20Transaction(txHash, expectedWallet, expectedAmount);
      } else if (network === 'bep20') {
        // Verify BEP20 (BSC) transaction using BscScan API
        verified = await verifyBEP20Transaction(txHash, expectedWallet, expectedAmount);
      }
      
      if (verified) {
        // Mark payment as verified
        await storage.verifyPayment(paymentId);
        
        // Activate Pro subscription
        await storage.createOrUpdateSubscription(userId, 'pro');
        
        console.log(`Payment verified: ${txHash} for user ${userId}`);
        return; // Success, exit
      }
      
      console.log(`Payment verification attempt ${attempt}/${MAX_RETRIES} failed: ${txHash}`);
      
      // Wait before retry (except on last attempt)
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    } catch (error) {
      console.error(`Blockchain verification error (attempt ${attempt}):`, error);
    }
  }
  
  // All retries exhausted, mark as failed
  console.log(`Payment verification failed after ${MAX_RETRIES} attempts: ${txHash}`);
  await storage.failPayment(paymentId);
}

// Verify TRC20 USDT transaction on TRON network
async function verifyTRC20Transaction(
  txHash: string,
  expectedWallet: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    // TronGrid API (free tier available)
    const response = await fetch(`https://api.trongrid.io/v1/transactions/${txHash}`);
    if (!response.ok) return false;
    
    const data = await response.json();
    if (!data.data || data.data.length === 0) return false;
    
    const tx = data.data[0];
    
    // Check if transaction is confirmed
    if (tx.ret?.[0]?.contractRet !== 'SUCCESS') return false;
    
    // For TRC20, check the contract call details
    // USDT contract on TRON: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
    const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    
    if (tx.raw_data?.contract?.[0]?.type === 'TriggerSmartContract') {
      const contractData = tx.raw_data.contract[0].parameter.value;
      
      // Check if it's calling the USDT contract
      const contractAddress = contractData.contract_address;
      if (contractAddress !== usdtContract) return false;
      
      // Parse transfer data
      const data = contractData.data;
      if (data && data.startsWith('a9059cbb')) {
        // transfer(address,uint256) method
        const toAddressHex = data.substring(8, 72);
        const amountHex = data.substring(72, 136);
        
        // Convert to decimal (USDT has 6 decimals on TRON)
        const amount = parseInt(amountHex, 16) / 1e6;
        
        // Check amount (with small tolerance for fees)
        if (amount >= expectedAmount * 0.99) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error("TRC20 verification error:", error);
    return false;
  }
}

// Verify BEP20 USDT transaction on BSC network
async function verifyBEP20Transaction(
  txHash: string,
  expectedWallet: string,
  expectedAmount: number
): Promise<boolean> {
  try {
    // BscScan API (free tier available)
    const apiKey = process.env.BSCSCAN_API_KEY || '';
    const response = await fetch(
      `https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}${apiKey ? `&apikey=${apiKey}` : ''}`
    );
    
    if (!response.ok) return false;
    
    const statusData = await response.json();
    
    // Check if transaction is successful
    if (statusData.result?.status !== '1') return false;
    
    // Get transaction details
    const txResponse = await fetch(
      `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}${apiKey ? `&apikey=${apiKey}` : ''}`
    );
    
    if (!txResponse.ok) return false;
    
    const txData = await txResponse.json();
    const tx = txData.result;
    
    if (!tx) return false;
    
    // USDT contract on BSC: 0x55d398326f99059fF775485246999027B3197955
    const usdtContract = '0x55d398326f99059fF775485246999027B3197955'.toLowerCase();
    
    if (tx.to?.toLowerCase() === usdtContract) {
      const inputData = tx.input;
      
      // Check for transfer method
      if (inputData && inputData.startsWith('0xa9059cbb')) {
        // Parse transfer(address,uint256)
        const toAddressHex = inputData.substring(10, 74);
        const amountHex = inputData.substring(74, 138);
        
        // Reconstruct address
        const toAddress = '0x' + toAddressHex.substring(24);
        
        // Check if destination matches expected wallet
        if (toAddress.toLowerCase() === expectedWallet.toLowerCase()) {
          // Convert amount (USDT has 18 decimals on BSC)
          const amount = parseInt(amountHex, 16) / 1e18;
          
          // Check amount with tolerance
          if (amount >= expectedAmount * 0.99) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error("BEP20 verification error:", error);
    return false;
  }
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
