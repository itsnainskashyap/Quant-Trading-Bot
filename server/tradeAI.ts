import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { getAllOpenTradexTrades, updateTradexTrade, closeTradexTradeBySystem, extendTradeExitTime } from "./brokerService";
import { storage } from "./storage";
import type { TradexTrade } from "@shared/models/trading";
import type { PriceData } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});
const genAI = new GoogleGenAI({ 
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL }
});

export interface AITradeDecision {
  action: "HOLD" | "EXTEND" | "CLOSE_PROFIT" | "CLOSE_LOSS" | "TRAILING_STOP" | "ADD_POSITION";
  reason: string;
  confidence: number;
  extensionMinutes?: number;
  targetPrice?: number;
  newStopLoss?: number;
  agent: string;
}

export interface MultiAgentConsensus {
  finalAction: string;
  finalReason: string;
  confidence: number;
  agents: {
    name: string;
    decision: AITradeDecision;
  }[];
  consensus: boolean;
}

async function getRiskAIDecision(
  trade: TradexTrade,
  currentPrice: number,
  pnlPercent: number,
  timeRemaining: number,
  extensionCount: number
): Promise<AITradeDecision> {
  const prompt = `You are a RISK MANAGEMENT AI for crypto trading. Analyze this trade and decide if we should protect capital.

TRADE DATA:
- Pair: ${trade.pair}
- Signal: ${trade.signal} (${trade.signal === 'BUY' ? 'LONG' : 'SHORT'})
- Entry Price: $${trade.entryPrice}
- Current Price: $${currentPrice}
- Amount: $${trade.amount}
- Leverage: ${trade.leverage}x
- Stop Loss: $${trade.stopLoss || 'Not set'}
- Take Profit: $${trade.takeProfit || 'Not set'}
- P/L: ${pnlPercent.toFixed(2)}%
- Time Remaining: ${timeRemaining} seconds
- Extensions Used: ${extensionCount}/3

YOUR FOCUS: Capital protection over profit maximization.
- Maximum acceptable loss: 2%
- If loss > 2%, recommend CLOSE_LOSS
- If profit > 1.5% and declining, recommend TRAILING_STOP
- If near stop loss, recommend CLOSE_LOSS early

Respond in JSON format:
{
  "action": "HOLD" | "CLOSE_LOSS" | "TRAILING_STOP" | "EXTEND",
  "reason": "Brief explanation",
  "confidence": 0-100,
  "newStopLoss": optional new stop loss price
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      action: result.action || "HOLD",
      reason: result.reason || "Risk analysis complete",
      confidence: result.confidence || 50,
      newStopLoss: result.newStopLoss,
      agent: "Risk AI (GPT-4o)"
    };
  } catch (error) {
    console.error("[RiskAI] Error:", error);
    return {
      action: pnlPercent < -2 ? "CLOSE_LOSS" : "HOLD",
      reason: "Fallback risk decision",
      confidence: 60,
      agent: "Risk AI (Fallback)"
    };
  }
}

async function getExitAIDecision(
  trade: TradexTrade,
  currentPrice: number,
  pnlPercent: number,
  timeRemaining: number,
  extensionCount: number
): Promise<AITradeDecision> {
  const prompt = `You are an EXIT STRATEGY AI for crypto trading. Decide the optimal exit timing.

TRADE DATA:
- Pair: ${trade.pair}
- Direction: ${trade.signal === 'BUY' ? 'LONG' : 'SHORT'}
- Entry: $${trade.entryPrice}
- Current: $${currentPrice}
- P/L: ${pnlPercent.toFixed(2)}%
- Time Left: ${timeRemaining} seconds (${(timeRemaining/60).toFixed(1)} min)
- Extensions: ${extensionCount}/3 used
- Trade Duration: ${Math.floor((Date.now() - new Date(trade.createdAt || Date.now()).getTime()) / 60000)} minutes

EXIT RULES:
- Time expired & profit > 1.5%: CLOSE_PROFIT (lock gains)
- Time expired & small profit (0.5-1.5%): EXTEND 1 min if extensions left
- Time expired & in loss but < 2%: EXTEND 2 min for recovery if extensions left
- Time expired & loss > 2%: CLOSE_LOSS immediately
- Time expired & no extensions left: CLOSE at current price
- Profit > 2%: Consider TRAILING_STOP

Respond in JSON:
{
  "action": "HOLD" | "EXTEND" | "CLOSE_PROFIT" | "CLOSE_LOSS" | "TRAILING_STOP",
  "reason": "Brief explanation",
  "confidence": 0-100,
  "extensionMinutes": 1 or 2 (if extending)
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          action: result.action || "HOLD",
          reason: result.reason || "Exit analysis complete",
          confidence: result.confidence || 50,
          extensionMinutes: result.extensionMinutes,
          agent: "Exit AI (Claude)"
        };
      }
    }
    throw new Error("No valid JSON");
  } catch (error) {
    console.error("[ExitAI] Error:", error);
    if (timeRemaining <= 0 && extensionCount < 3) {
      if (pnlPercent > 1.5) {
        return { action: "CLOSE_PROFIT", reason: "Lock in profit", confidence: 80, agent: "Exit AI (Fallback)" };
      } else if (pnlPercent > 0.5) {
        return { action: "EXTEND", reason: "Small profit - extend for better exit", confidence: 70, extensionMinutes: 1, agent: "Exit AI (Fallback)" };
      } else if (pnlPercent > -2) {
        return { action: "EXTEND", reason: "Recovery potential", confidence: 60, extensionMinutes: 2, agent: "Exit AI (Fallback)" };
      }
    }
    return { action: "HOLD", reason: "Monitoring", confidence: 50, agent: "Exit AI (Fallback)" };
  }
}

async function getMomentumAIDecision(
  trade: TradexTrade,
  currentPrice: number,
  pnlPercent: number
): Promise<AITradeDecision> {
  const prompt = `You are a MOMENTUM AI analyzing price action for a crypto trade.

TRADE:
- Pair: ${trade.pair}
- Direction: ${trade.signal === 'BUY' ? 'LONG (expecting price UP)' : 'SHORT (expecting price DOWN)'}
- Entry: $${trade.entryPrice}
- Current: $${currentPrice}
- P/L: ${pnlPercent.toFixed(2)}%

Analyze momentum direction:
- Is price moving in favor of the trade?
- Should we hold for more profit or exit now?
- Is there reversal risk?

Respond ONLY with JSON:
{"action": "HOLD" | "CLOSE_PROFIT" | "CLOSE_LOSS" | "TRAILING_STOP", "reason": "brief", "confidence": 0-100}`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        action: parsed.action || "HOLD",
        reason: parsed.reason || "Momentum analysis",
        confidence: parsed.confidence || 50,
        agent: "Momentum AI (Gemini)"
      };
    }
    throw new Error("No JSON");
  } catch (error) {
    console.error("[MomentumAI] Error:", error);
    return {
      action: "HOLD",
      reason: "Momentum check pending",
      confidence: 50,
      agent: "Momentum AI (Fallback)"
    };
  }
}

export async function getMultiAgentTradeDecision(
  trade: TradexTrade,
  currentPrice: number
): Promise<MultiAgentConsensus> {
  const entryPrice = trade.entryPrice;
  const isLong = trade.signal === 'BUY';
  const pnlPercent = isLong 
    ? ((currentPrice - entryPrice) / entryPrice) * 100 * (trade.leverage || 1)
    : ((entryPrice - currentPrice) / entryPrice) * 100 * (trade.leverage || 1);
  
  const exitTimestamp = trade.exitTimestamp ? new Date(trade.exitTimestamp).getTime() : null;
  const timeRemaining = exitTimestamp ? Math.floor((exitTimestamp - Date.now()) / 1000) : 300;
  const extensionCount = trade.extensionCount || 0;

  console.log(`[TradeAI] Analyzing trade ${trade.id}: P/L ${pnlPercent.toFixed(2)}%, Time remaining: ${timeRemaining}s, Extensions: ${extensionCount}`);

  const [riskDecision, exitDecision, momentumDecision] = await Promise.all([
    getRiskAIDecision(trade, currentPrice, pnlPercent, timeRemaining, extensionCount),
    getExitAIDecision(trade, currentPrice, pnlPercent, timeRemaining, extensionCount),
    getMomentumAIDecision(trade, currentPrice, pnlPercent)
  ]);

  const agents = [
    { name: "Risk AI", decision: riskDecision },
    { name: "Exit AI", decision: exitDecision },
    { name: "Momentum AI", decision: momentumDecision }
  ];

  const actionCounts: Record<string, number> = {};
  const actionReasons: Record<string, string[]> = {};
  let totalConfidence = 0;

  for (const agent of agents) {
    const action = agent.decision.action;
    actionCounts[action] = (actionCounts[action] || 0) + 1;
    actionReasons[action] = actionReasons[action] || [];
    actionReasons[action].push(`${agent.name}: ${agent.decision.reason}`);
    totalConfidence += agent.decision.confidence;
  }

  let finalAction = "HOLD";
  let maxCount = 0;
  for (const [action, count] of Object.entries(actionCounts)) {
    if (count > maxCount) {
      maxCount = count;
      finalAction = action;
    }
  }

  if (actionCounts["CLOSE_LOSS"] >= 2) {
    finalAction = "CLOSE_LOSS";
  } else if (actionCounts["CLOSE_PROFIT"] >= 2) {
    finalAction = "CLOSE_PROFIT";
  }

  if (timeRemaining <= 0 && extensionCount >= 3) {
    finalAction = pnlPercent > 0 ? "CLOSE_PROFIT" : "CLOSE_LOSS";
  }

  const consensus = maxCount >= 2;
  const avgConfidence = Math.round(totalConfidence / agents.length);
  const finalReason = actionReasons[finalAction]?.join(" | ") || "Multi-agent consensus";

  console.log(`[TradeAI] Decision: ${finalAction} (Consensus: ${consensus}, Confidence: ${avgConfidence}%)`);

  return {
    finalAction,
    finalReason,
    confidence: avgConfidence,
    agents,
    consensus
  };
}

export async function processOpenTrades(): Promise<void> {
  const allTrades = await getAllOpenTradexTrades();
  
  if (allTrades.length === 0) {
    return;
  }

  console.log(`[TradeMonitor] Processing ${allTrades.length} open trades...`);

  for (const trade of allTrades) {
    try {
      const prices = await storage.getAllPrices();
      const priceData = prices.find((p: PriceData) => p.pair === trade.pair);
      
      if (!priceData?.price) {
        console.log(`[TradeMonitor] No price for ${trade.pair}, skipping`);
        continue;
      }

      const currentPrice = priceData.price;
      const exitTimestamp = trade.exitTimestamp ? new Date(trade.exitTimestamp).getTime() : null;
      const isExpired = exitTimestamp ? Date.now() >= exitTimestamp : false;
      
      if (!isExpired) {
        continue;
      }

      console.log(`[TradeMonitor] Trade ${trade.id} expired, getting AI decision...`);
      
      const decision = await getMultiAgentTradeDecision(trade, currentPrice);
      
      if (decision.finalAction === "EXTEND" && (trade.extensionCount || 0) < 3) {
        const extendMinutes = 2;
        
        await extendTradeExitTime(trade.id, extendMinutes);
        await updateTradexTrade(trade.id, {
          aiRecommendation: "EXTENDED",
          aiAnalysis: decision.finalReason
        });
        
        console.log(`[TradeMonitor] Extended trade ${trade.id} by ${extendMinutes} min (extension ${(trade.extensionCount || 0) + 1}/3)`);
        
      } else if (decision.finalAction === "CLOSE_PROFIT" || decision.finalAction === "CLOSE_LOSS" || decision.finalAction === "TRAILING_STOP") {
        await closeTradexTradeBySystem(
          trade.id, 
          currentPrice, 
          `AI Auto-Close: ${decision.finalAction} - ${decision.finalReason}`
        );
        
      } else if ((trade.extensionCount || 0) >= 3) {
        const isLong = trade.signal === 'BUY';
        const pnl = isLong 
          ? (currentPrice - trade.entryPrice) * trade.amount / trade.entryPrice * (trade.leverage || 1)
          : (trade.entryPrice - currentPrice) * trade.amount / trade.entryPrice * (trade.leverage || 1);
        
        await closeTradexTradeBySystem(
          trade.id, 
          currentPrice, 
          `AI Auto-Close: Max extensions reached - ${pnl > 0 ? 'Profit secured' : 'Loss minimized'}`
        );
      }
      
    } catch (error) {
      console.error(`[TradeMonitor] Error processing trade ${trade.id}:`, error);
    }
  }
}

let monitorInterval: NodeJS.Timeout | null = null;

export function startTradeMonitor(): void {
  if (monitorInterval) {
    console.log("[TradeMonitor] Already running");
    return;
  }

  console.log("[TradeMonitor] Starting server-side trade monitor (every 10 seconds)...");
  
  monitorInterval = setInterval(async () => {
    try {
      await processOpenTrades();
    } catch (error) {
      console.error("[TradeMonitor] Error in monitor loop:", error);
    }
  }, 10000);
  
  processOpenTrades().catch(console.error);
}

export function stopTradeMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log("[TradeMonitor] Stopped");
  }
}
