import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { TradingPair, MarketMetrics, SignalType, RiskGrade } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface AIAgentResult {
  agent: string;
  provider: string;
  signal: SignalType;
  confidence: number;
  reasoning: string;
  riskLevel: RiskGrade;
  success: boolean;
  specializedInsight: string;
  weight: number;
}

export interface EnhancedConsensusResult {
  finalSignal: SignalType;
  finalConfidence: number;
  finalRisk: RiskGrade;
  agreementLevel: number;
  hasStrongConsensus: boolean;
  agents: AIAgentResult[];
  reasoning: string;
  warnings: string[];
  holdDuration: number;
  technicalAnalysis: {
    trend: string;
    momentum: string;
    support: number;
    resistance: number;
    keyLevels: string[];
  };
  fundamentalAnalysis: {
    marketSentiment: string;
    volumeAnalysis: string;
    orderFlowBias: string;
  };
  psychologyAnalysis: {
    fearGreedIndex: number;
    marketMood: string;
    crowdBehavior: string;
    contraindicator: string;
  };
  patternAnalysis: {
    detectedPatterns: string[];
    patternStrength: number;
    patternPrediction: string;
  };
  smartMoneyAnalysis: {
    institutionalFlow: string;
    whaleActivity: string;
    marketMakerBehavior: string;
  };
  tradeRecommendation: {
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
    riskRewardRatio: number;
    maxLossPercent: number;
  };
}

function buildTechnicalPrompt(pair: TradingPair, metrics: MarketMetrics, price: number, tradeMode: number): string {
  return `You are a TECHNICAL ANALYSIS AI specializing in chart patterns and indicators.

ASSET: ${pair} | PRICE: $${price} | TIMEFRAME: ${tradeMode} MIN

TECHNICAL DATA:
- RSI: ${metrics.rsi?.toFixed(1) || 'N/A'} | Signal: ${metrics.rsiSignal || 'NEUTRAL'}
- MACD: ${metrics.macdTrend || 'NEUTRAL'} | Histogram: ${metrics.macdHistogram?.toFixed(2) || 0}
- Stochastic: K=${metrics.stochasticK?.toFixed(1) || 50} D=${metrics.stochasticD?.toFixed(1) || 50}
- ADX: ${metrics.adx?.toFixed(1) || 25} | Trend: ${metrics.trendStrength || 'MODERATE'}
- Bollinger: ${metrics.bollingerPosition || 'NEUTRAL'} | Squeeze: ${metrics.bollingerSqueeze ? 'YES' : 'NO'}
- SMA20/50/200 vs Price: ${metrics.maTrend || 'NEUTRAL'}
- Golden Cross: ${metrics.goldenCross ? 'YES' : 'NO'} | Death Cross: ${metrics.deathCross ? 'NO' : 'NO'}
- Support: $${metrics.nearestSupport?.toFixed(2) || 'N/A'} | Resistance: $${metrics.nearestResistance?.toFixed(2) || 'N/A'}

Analyze PURELY from technical perspective. Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 50-95,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "Key technical factors for this signal",
  "keyLevels": ["level1", "level2"],
  "patternDetected": "pattern name or NONE"
}`;
}

function buildFundamentalPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  return `You are a FUNDAMENTAL ANALYSIS AI focusing on market structure and order flow.

ASSET: ${pair} | PRICE: $${price}

MARKET DATA:
- Volume Delta: ${metrics.volumeDelta?.toFixed(2)}% | Trend: ${metrics.volumeTrend || 'STABLE'}
- Order Book Imbalance: ${metrics.orderBookImbalance?.toFixed(2)}%
- Open Interest: $${(metrics.openInterest / 1e9).toFixed(2)}B
- Funding Rate: ${(metrics.fundingRate * 100).toFixed(4)}%
- ATR: ${metrics.atrPercent?.toFixed(2)}% | Volatility: ${metrics.volatility?.toFixed(2)}

Analyze market structure and order flow. Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 50-95,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "Key fundamental factors",
  "marketSentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "volumeAnalysis": "brief volume insight",
  "orderFlowBias": "BUYERS" | "SELLERS" | "BALANCED"
}`;
}

function buildPsychologyPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  const rsi = metrics.rsi || 50;
  const fearGreed = rsi < 30 ? "EXTREME_FEAR" : rsi < 40 ? "FEAR" : rsi > 70 ? "EXTREME_GREED" : rsi > 60 ? "GREED" : "NEUTRAL";
  
  return `You are a MARKET PSYCHOLOGY AI analyzing trader sentiment and crowd behavior.

ASSET: ${pair} | PRICE: $${price}

PSYCHOLOGY INDICATORS:
- RSI-Based Fear/Greed: ${fearGreed} (RSI: ${rsi.toFixed(1)})
- Funding Rate Sentiment: ${metrics.fundingRate > 0 ? 'LONGS PAYING (bullish crowd)' : 'SHORTS PAYING (bearish crowd)'}
- Volume Behavior: ${metrics.volumeTrend || 'STABLE'}
- Bollinger Position: ${metrics.bollingerPosition || 'NEUTRAL'}

Analyze trader psychology and potential reversals. Consider:
- Contrarian signals (extreme readings often reverse)
- Crowd behavior patterns
- Emotional market states

Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 50-95,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "Psychology-based analysis",
  "fearGreedScore": 0-100,
  "marketMood": "EUPHORIC" | "OPTIMISTIC" | "NEUTRAL" | "FEARFUL" | "PANIC",
  "crowdBehavior": "brief crowd analysis",
  "contraindicator": "any contrarian signal"
}`;
}

function buildPatternPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  return `You are a PATTERN RECOGNITION AI specialized in chart patterns and price action.

ASSET: ${pair} | PRICE: $${price}

PATTERN DATA:
- Recent Price Action: ${metrics.momentum?.toFixed(2) || 0}% momentum
- Bollinger Position: ${metrics.bollingerPosition || 'NEUTRAL'} (Width: ${metrics.bollingerWidth?.toFixed(2) || 'N/A'}%)
- MACD Crossover: ${metrics.macdCrossover || 'NONE'}
- Distance to Support: ${metrics.distanceToSupport?.toFixed(2) || 'N/A'}%
- Distance to Resistance: ${metrics.distanceToResistance?.toFixed(2) || 'N/A'}%
- Confluence Score: ${metrics.confluenceScore || 0}
- Bullish Signals: ${metrics.bullishSignals?.join(', ') || 'None'}
- Bearish Signals: ${metrics.bearishSignals?.join(', ') || 'None'}

Identify chart patterns and predict next move. Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 50-95,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "Pattern-based prediction",
  "patternsDetected": ["pattern1", "pattern2"],
  "patternStrength": 0-100,
  "patternPrediction": "expected outcome from patterns"
}`;
}

function buildSmartMoneyPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  return `You are a SMART MONEY AI analyzing institutional and whale activity.

ASSET: ${pair} | PRICE: $${price}

SMART MONEY INDICATORS:
- Open Interest: $${(metrics.openInterest / 1e9).toFixed(2)}B
- Order Book Imbalance: ${metrics.orderBookImbalance?.toFixed(2)}%
- Volume Delta: ${metrics.volumeDelta?.toFixed(2)}%
- Funding Rate: ${(metrics.fundingRate * 100).toFixed(4)}%
- Volume Confirmation: ${metrics.volumeConfirmation ? 'YES' : 'NO'}
- ADX (Trend Strength): ${metrics.adx?.toFixed(1) || 25}

Analyze what smart money (institutions, whales) is doing. Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 50-95,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "Smart money analysis",
  "institutionalFlow": "ACCUMULATING" | "DISTRIBUTING" | "NEUTRAL",
  "whaleActivity": "brief whale behavior",
  "marketMakerBehavior": "market maker strategy detected"
}`;
}

async function runTechnicalAgent(pair: TradingPair, metrics: MarketMetrics, price: number, tradeMode: number): Promise<AIAgentResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildTechnicalPrompt(pair, metrics, price, tradeMode) }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      agent: "Technical Analyst",
      provider: "OpenAI GPT-4o",
      signal: result.signal || "NO_TRADE",
      confidence: Math.min(95, Math.max(50, result.confidence || 50)),
      reasoning: result.insight || "Technical analysis complete",
      riskLevel: result.risk || "MEDIUM",
      success: true,
      specializedInsight: `Patterns: ${result.patternDetected || 'None'} | Levels: ${result.keyLevels?.join(', ') || 'N/A'}`,
      weight: 1.2,
    };
  } catch (error) {
    console.error("[TechnicalAgent] Error:", error);
    return { agent: "Technical Analyst", provider: "OpenAI", signal: "NO_TRADE", confidence: 0, reasoning: "Analysis failed", riskLevel: "HIGH", success: false, specializedInsight: "", weight: 1.2 };
  }
}

async function runFundamentalAgent(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAgentResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [{ role: "user", content: buildFundamentalPrompt(pair, metrics, price) }],
    });

    const content = message.content[0];
    const text = content.type === "text" ? content.text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      agent: "Fundamental Analyst",
      provider: "Anthropic Claude",
      signal: result.signal || "NO_TRADE",
      confidence: Math.min(95, Math.max(50, result.confidence || 50)),
      reasoning: result.insight || "Fundamental analysis complete",
      riskLevel: result.risk || "MEDIUM",
      success: true,
      specializedInsight: `Sentiment: ${result.marketSentiment || 'N/A'} | Flow: ${result.orderFlowBias || 'N/A'}`,
      weight: 1.0,
    };
  } catch (error) {
    console.error("[FundamentalAgent] Error:", error);
    return { agent: "Fundamental Analyst", provider: "Anthropic", signal: "NO_TRADE", confidence: 0, reasoning: "Analysis failed", riskLevel: "HIGH", success: false, specializedInsight: "", weight: 1.0 };
  }
}

async function runPsychologyAgent(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAgentResult> {
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildPsychologyPrompt(pair, metrics, price),
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      agent: "Psychology Analyst",
      provider: "Google Gemini",
      signal: result.signal || "NO_TRADE",
      confidence: Math.min(95, Math.max(50, result.confidence || 50)),
      reasoning: result.insight || "Psychology analysis complete",
      riskLevel: result.risk || "MEDIUM",
      success: true,
      specializedInsight: `Mood: ${result.marketMood || 'N/A'} | F&G: ${result.fearGreedScore || 50}`,
      weight: 0.8,
    };
  } catch (error) {
    console.error("[PsychologyAgent] Error:", error);
    return { agent: "Psychology Analyst", provider: "Gemini", signal: "NO_TRADE", confidence: 0, reasoning: "Analysis failed", riskLevel: "HIGH", success: false, specializedInsight: "", weight: 0.8 };
  }
}

async function runPatternAgent(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAgentResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildPatternPrompt(pair, metrics, price) }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      agent: "Pattern Recognition",
      provider: "OpenAI GPT-4o",
      signal: result.signal || "NO_TRADE",
      confidence: Math.min(95, Math.max(50, result.confidence || 50)),
      reasoning: result.insight || "Pattern analysis complete",
      riskLevel: result.risk || "MEDIUM",
      success: true,
      specializedInsight: `Patterns: ${result.patternsDetected?.join(', ') || 'None'} | Strength: ${result.patternStrength || 0}%`,
      weight: 1.1,
    };
  } catch (error) {
    console.error("[PatternAgent] Error:", error);
    return { agent: "Pattern Recognition", provider: "OpenAI", signal: "NO_TRADE", confidence: 0, reasoning: "Analysis failed", riskLevel: "HIGH", success: false, specializedInsight: "", weight: 1.1 };
  }
}

async function runSmartMoneyAgent(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAgentResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [{ role: "user", content: buildSmartMoneyPrompt(pair, metrics, price) }],
    });

    const content = message.content[0];
    const text = content.type === "text" ? content.text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      agent: "Smart Money Tracker",
      provider: "Anthropic Claude",
      signal: result.signal || "NO_TRADE",
      confidence: Math.min(95, Math.max(50, result.confidence || 50)),
      reasoning: result.insight || "Smart money analysis complete",
      riskLevel: result.risk || "MEDIUM",
      success: true,
      specializedInsight: `Flow: ${result.institutionalFlow || 'N/A'} | Whales: ${result.whaleActivity || 'N/A'}`,
      weight: 1.3,
    };
  } catch (error) {
    console.error("[SmartMoneyAgent] Error:", error);
    return { agent: "Smart Money Tracker", provider: "Anthropic", signal: "NO_TRADE", confidence: 0, reasoning: "Analysis failed", riskLevel: "HIGH", success: false, specializedInsight: "", weight: 1.3 };
  }
}

function calculateWeightedConsensus(agents: AIAgentResult[], price: number, metrics: MarketMetrics): EnhancedConsensusResult {
  const successfulAgents = agents.filter(a => a.success);
  
  if (successfulAgents.length < 3) {
    return {
      finalSignal: "NO_TRADE",
      finalConfidence: 0,
      finalRisk: "HIGH",
      agreementLevel: 0,
      hasStrongConsensus: false,
      agents,
      reasoning: "Insufficient AI agents responded - staying safe",
      warnings: ["Less than 3 agents responded successfully"],
      holdDuration: 0,
      technicalAnalysis: { trend: "UNKNOWN", momentum: "UNKNOWN", support: 0, resistance: 0, keyLevels: [] },
      fundamentalAnalysis: { marketSentiment: "UNKNOWN", volumeAnalysis: "N/A", orderFlowBias: "UNKNOWN" },
      psychologyAnalysis: { fearGreedIndex: 50, marketMood: "UNKNOWN", crowdBehavior: "N/A", contraindicator: "N/A" },
      patternAnalysis: { detectedPatterns: [], patternStrength: 0, patternPrediction: "N/A" },
      smartMoneyAnalysis: { institutionalFlow: "UNKNOWN", whaleActivity: "N/A", marketMakerBehavior: "N/A" },
      tradeRecommendation: { entryPrice: price, stopLoss: 0, takeProfit: 0, positionSize: 0, riskRewardRatio: 0, maxLossPercent: 0 },
    };
  }

  const signalScores: Record<SignalType, number> = { BUY: 0, SELL: 0, NO_TRADE: 0 };
  let totalWeight = 0;
  let totalConfidence = 0;
  let highRiskCount = 0;

  for (const agent of successfulAgents) {
    const weightedScore = agent.confidence * agent.weight;
    signalScores[agent.signal] += weightedScore;
    totalWeight += agent.weight;
    totalConfidence += agent.confidence;
    if (agent.riskLevel === "HIGH") highRiskCount++;
  }

  const normalizedScores = {
    BUY: signalScores.BUY / totalWeight,
    SELL: signalScores.SELL / totalWeight,
    NO_TRADE: signalScores.NO_TRADE / totalWeight,
  };

  let finalSignal: SignalType = "NO_TRADE";
  let maxScore = 0;
  for (const [signal, score] of Object.entries(normalizedScores)) {
    if (score > maxScore) {
      maxScore = score;
      finalSignal = signal as SignalType;
    }
  }

  const buyCount = successfulAgents.filter(a => a.signal === "BUY").length;
  const sellCount = successfulAgents.filter(a => a.signal === "SELL").length;
  
  if (buyCount > 0 && sellCount > 0 && Math.abs(buyCount - sellCount) <= 1) {
    finalSignal = buyCount > sellCount ? "BUY" : (sellCount > buyCount ? "SELL" : "NO_TRADE");
  }

  const avgConfidence = totalConfidence / successfulAgents.length;
  const agreementLevel = (Math.max(buyCount, sellCount, successfulAgents.length - buyCount - sellCount) / successfulAgents.length) * 100;
  const hasStrongConsensus = agreementLevel >= 60 && avgConfidence >= 60;

  const warnings: string[] = [];
  if (buyCount > 0 && sellCount > 0) {
    warnings.push(`Mixed signals: ${buyCount} BUY vs ${sellCount} SELL`);
  }
  if (highRiskCount >= 3) {
    warnings.push("Multiple agents flagged high risk");
  }
  if (avgConfidence < 60) {
    warnings.push(`Lower confidence: ${avgConfidence.toFixed(0)}%`);
  }

  const riskCounts: Record<RiskGrade, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  successfulAgents.forEach(a => riskCounts[a.riskLevel]++);
  const finalRisk = highRiskCount >= 2 ? "HIGH" : (riskCounts.LOW >= 3 ? "LOW" : "MEDIUM");

  const atr = metrics.atr || price * 0.02;
  const stopLossDistance = atr * 1.5;
  const takeProfitDistance = atr * 2.5;
  
  const stopLoss = finalSignal === "BUY" ? price - stopLossDistance : price + stopLossDistance;
  const takeProfit = finalSignal === "BUY" ? price + takeProfitDistance : price - takeProfitDistance;
  const riskRewardRatio = takeProfitDistance / stopLossDistance;

  return {
    finalSignal,
    finalConfidence: Math.round(avgConfidence),
    finalRisk,
    agreementLevel: Math.round(agreementLevel),
    hasStrongConsensus,
    agents,
    reasoning: successfulAgents.map(a => `${a.agent}: ${a.reasoning}`).join(" | "),
    warnings,
    holdDuration: 5,
    technicalAnalysis: {
      trend: metrics.maTrend || "NEUTRAL",
      momentum: metrics.trendStrength || "MODERATE",
      support: metrics.nearestSupport || price * 0.98,
      resistance: metrics.nearestResistance || price * 1.02,
      keyLevels: [],
    },
    fundamentalAnalysis: {
      marketSentiment: metrics.volumeDelta && metrics.volumeDelta > 0 ? "BULLISH" : "BEARISH",
      volumeAnalysis: metrics.volumeTrend || "STABLE",
      orderFlowBias: metrics.orderBookImbalance && metrics.orderBookImbalance > 0 ? "BUYERS" : "SELLERS",
    },
    psychologyAnalysis: {
      fearGreedIndex: metrics.rsi || 50,
      marketMood: (metrics.rsi || 50) > 70 ? "EUPHORIC" : (metrics.rsi || 50) < 30 ? "FEARFUL" : "NEUTRAL",
      crowdBehavior: metrics.fundingRate > 0 ? "Longs dominant" : "Shorts dominant",
      contraindicator: (metrics.rsi || 50) > 80 || (metrics.rsi || 50) < 20 ? "Extreme reading - reversal possible" : "No contrarian signal",
    },
    patternAnalysis: {
      detectedPatterns: metrics.bullishSignals || [],
      patternStrength: metrics.technicalStrength || 50,
      patternPrediction: metrics.overallTechnicalSignal || "NEUTRAL",
    },
    smartMoneyAnalysis: {
      institutionalFlow: metrics.volumeDelta && metrics.volumeDelta > 5 ? "ACCUMULATING" : "NEUTRAL",
      whaleActivity: `OI: $${(metrics.openInterest / 1e9).toFixed(2)}B`,
      marketMakerBehavior: metrics.bollingerSqueeze ? "Preparing for breakout" : "Normal market making",
    },
    tradeRecommendation: {
      entryPrice: price,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit: Math.round(takeProfit * 100) / 100,
      positionSize: 0,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
      maxLossPercent: 2,
    },
  };
}

export async function getEnhancedAIConsensus(
  pair: TradingPair,
  metrics: MarketMetrics,
  price: number,
  tradeMode: number = 5
): Promise<EnhancedConsensusResult> {
  console.log(`[EnhancedAI] Running 5 specialized agents for ${pair}...`);

  const [technical, fundamental, psychology, pattern, smartMoney] = await Promise.all([
    runTechnicalAgent(pair, metrics, price, tradeMode),
    runFundamentalAgent(pair, metrics, price),
    runPsychologyAgent(pair, metrics, price),
    runPatternAgent(pair, metrics, price),
    runSmartMoneyAgent(pair, metrics, price),
  ]);

  const agents = [technical, fundamental, psychology, pattern, smartMoney];
  console.log(`[EnhancedAI] Agents completed: ${agents.filter(a => a.success).length}/5 successful`);

  return calculateWeightedConsensus(agents, price, metrics);
}
