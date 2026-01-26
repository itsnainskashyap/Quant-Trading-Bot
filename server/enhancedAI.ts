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
  const rsi = metrics.rsi ?? 50;
  const stochK = metrics.stochasticK ?? 50;
  const adx = metrics.adx ?? 25;
  
  return `You are a PROFESSIONAL TECHNICAL ANALYSIS AI. CAPITAL PROTECTION > PROFITS.

ASSET: ${pair} | PRICE: $${price} | TIMEFRAME: ${tradeMode} MIN

TECHNICAL INDICATORS:
- RSI (14): ${rsi.toFixed(1)} | Zone: ${rsi < 30 ? 'OVERSOLD' : rsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL'}
- Stochastic: K=${stochK.toFixed(1)} D=${metrics.stochasticD?.toFixed(1) || 50} | Zone: ${stochK < 20 ? 'OVERSOLD' : stochK > 80 ? 'OVERBOUGHT' : 'NEUTRAL'}
- MACD: ${metrics.macdTrend || 'NEUTRAL'} | Histogram: ${metrics.macdHistogram?.toFixed(3) || 0} | Crossover: ${metrics.macdCrossover || 'NONE'}
- ADX: ${adx.toFixed(1)} | Trend: ${adx > 40 ? 'STRONG' : adx > 25 ? 'MODERATE' : 'WEAK/NO TREND'}
- Bollinger: ${metrics.bollingerPosition || 'NEUTRAL'} | Squeeze: ${metrics.bollingerSqueeze ? 'YES - Breakout imminent' : 'NO'}
- Moving Averages: ${metrics.maTrend || 'NEUTRAL'} | Golden Cross: ${metrics.goldenCross ? 'YES' : 'NO'} | Death Cross: ${metrics.deathCross ? 'YES' : 'NO'}
- Support: $${metrics.nearestSupport?.toFixed(2) || 'N/A'} (${metrics.distanceToSupport?.toFixed(2) || 0}% away)
- Resistance: $${metrics.nearestResistance?.toFixed(2) || 'N/A'} (${metrics.distanceToResistance?.toFixed(2) || 0}% away)

STRICT RULES:
- BUY: RSI <35 + MACD bullish + Stoch oversold + ADX >20 + Price near support
- SELL: RSI >65 + MACD bearish + Stoch overbought + ADX >20 + Price near resistance
- NO_TRADE: Mixed signals, ADX <20, RSI 40-60, or any uncertainty

CONFIDENCE GUIDE: 80-90 (perfect setup), 70-79 (good), 65-69 (acceptable), <65 (NO_TRADE)

Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 60-90 (be conservative),
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "Which indicators aligned? Why this confidence level?",
  "keyLevels": ["support level", "resistance level"],
  "patternDetected": "specific pattern or NONE"
}`;
}

function buildFundamentalPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  const volumeDelta = metrics.volumeDelta ?? 0;
  const orderBookImbalance = metrics.orderBookImbalance ?? 0;
  const fundingRate = metrics.fundingRate ?? 0;
  
  return `You are a PROFESSIONAL ORDER FLOW ANALYST. ACCURACY > ACTIVITY.

ASSET: ${pair} | PRICE: $${price}

ORDER FLOW & MARKET STRUCTURE:
- Volume Delta: ${volumeDelta.toFixed(2)}% | Direction: ${volumeDelta > 5 ? 'STRONG BUYING' : volumeDelta < -5 ? 'STRONG SELLING' : 'BALANCED'}
- Volume Trend: ${metrics.volumeTrend || 'STABLE'} | Confirmation: ${metrics.volumeConfirmation ? 'YES' : 'NO'}
- Order Book: ${orderBookImbalance.toFixed(2)}% | Bias: ${orderBookImbalance > 10 ? 'BUYERS DOMINATING' : orderBookImbalance < -10 ? 'SELLERS DOMINATING' : 'BALANCED'}
- Open Interest: $${(metrics.openInterest / 1e9).toFixed(2)}B
- Funding Rate: ${(fundingRate * 100).toFixed(4)}% | ${fundingRate > 0.01 ? 'LONGS OVERLEVERAGED' : fundingRate < -0.01 ? 'SHORTS OVERLEVERAGED' : 'NEUTRAL'}
- ATR: ${metrics.atrPercent?.toFixed(2) || 0}% | Volatility: ${metrics.volatility < 2 ? 'LOW' : metrics.volatility < 4 ? 'MEDIUM' : 'HIGH'}

STRICT RULES:
- BUY: Strong buying pressure (volume delta >5%) + buyers dominating + positive order flow
- SELL: Strong selling pressure (volume delta <-5%) + sellers dominating + negative order flow
- NO_TRADE: Balanced order flow, low volume, mixed signals

CONFIDENCE GUIDE: Only 70+ if clear directional order flow with volume confirmation

Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 60-90 (require clear order flow),
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "Order flow analysis - what is the money doing?",
  "marketSentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "volumeAnalysis": "Volume confirms direction?",
  "orderFlowBias": "BUYERS" | "SELLERS" | "BALANCED"
}`;
}

function buildPsychologyPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  const rsi = metrics.rsi || 50;
  const fundingRate = metrics.fundingRate ?? 0;
  const fearGreed = rsi < 25 ? "EXTREME_FEAR" : rsi < 35 ? "FEAR" : rsi > 75 ? "EXTREME_GREED" : rsi > 65 ? "GREED" : "NEUTRAL";
  const fearGreedScore = rsi;
  
  return `You are a PROFESSIONAL MARKET PSYCHOLOGY ANALYST. Trade against the crowd at extremes.

ASSET: ${pair} | PRICE: $${price}

SENTIMENT INDICATORS:
- Fear/Greed Index: ${fearGreedScore.toFixed(0)} | State: ${fearGreed}
- RSI (Crowd Emotion): ${rsi.toFixed(1)} | ${rsi < 30 ? 'CROWD PANIC - Contrarian BUY zone' : rsi > 70 ? 'CROWD EUPHORIA - Contrarian SELL zone' : 'NEUTRAL'}
- Funding Rate: ${(fundingRate * 100).toFixed(4)}% | ${fundingRate > 0.02 ? 'EXTREME GREED - Longs overleveraged' : fundingRate < -0.02 ? 'EXTREME FEAR - Shorts overleveraged' : 'NEUTRAL'}
- Volume Behavior: ${metrics.volumeTrend || 'STABLE'}
- Bollinger: ${metrics.bollingerPosition || 'NEUTRAL'} | ${metrics.bollingerPosition === 'BELOW_LOWER' ? 'Oversold sentiment' : metrics.bollingerPosition === 'ABOVE_UPPER' ? 'Overbought sentiment' : 'Neutral'}

CONTRARIAN TRADING RULES:
- BUY: Extreme fear (RSI <25) + panic selling + funding negative = crowd is wrong, BUY
- SELL: Extreme greed (RSI >75) + euphoric buying + funding very positive = crowd is wrong, SELL
- NO_TRADE: Neutral sentiment (RSI 35-65), no crowd extreme

CRITICAL: Only trade against crowd at TRUE EXTREMES. Neutral = NO_TRADE.

Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 60-90 (only high when extreme sentiment),
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "What is the crowd doing wrong? Why fade them?",
  "fearGreedScore": ${fearGreedScore.toFixed(0)},
  "marketMood": "EUPHORIC" | "OPTIMISTIC" | "NEUTRAL" | "FEARFUL" | "PANIC",
  "crowdBehavior": "What mistake is the crowd making?",
  "contraindicator": "Specific contrarian signal or NONE"
}`;
}

function buildPatternPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  const bullishCount = metrics.bullishSignals?.length ?? 0;
  const bearishCount = metrics.bearishSignals?.length ?? 0;
  const confluenceScore = metrics.confluenceScore ?? 0;
  
  return `You are a PROFESSIONAL PATTERN RECOGNITION AI. Only trade clear, high-probability patterns.

ASSET: ${pair} | PRICE: $${price}

PATTERN & PRICE ACTION DATA:
- Momentum: ${metrics.momentum?.toFixed(2) || 0}% | Direction: ${(metrics.momentum ?? 0) > 1 ? 'BULLISH' : (metrics.momentum ?? 0) < -1 ? 'BEARISH' : 'FLAT'}
- Bollinger: ${metrics.bollingerPosition || 'NEUTRAL'} | Width: ${metrics.bollingerWidth?.toFixed(2) || 0}% | Squeeze: ${metrics.bollingerSqueeze ? 'YES' : 'NO'}
- MACD Crossover: ${metrics.macdCrossover || 'NONE'}
- Distance to Support: ${metrics.distanceToSupport?.toFixed(2) || 0}%
- Distance to Resistance: ${metrics.distanceToResistance?.toFixed(2) || 0}%

CONFLUENCE ANALYSIS:
- Bullish Patterns: ${bullishCount} (${metrics.bullishSignals?.slice(0,4).join(', ') || 'None'})
- Bearish Patterns: ${bearishCount} (${metrics.bearishSignals?.slice(0,4).join(', ') || 'None'})
- Net Confluence: ${confluenceScore} | Direction: ${confluenceScore > 3 ? 'BULLISH' : confluenceScore < -3 ? 'BEARISH' : 'MIXED'}

PATTERN TRADING RULES:
- BUY: 4+ bullish patterns + confluence >3 + near support + breakout confirmation
- SELL: 4+ bearish patterns + confluence <-3 + near resistance + breakdown confirmation
- NO_TRADE: Mixed patterns, weak confluence, no clear setup

HIGH-PROBABILITY PATTERNS ONLY: Double bottom, triple bottom, bull flag, inverse H&S for BUY.
Double top, triple top, bear flag, H&S for SELL. Ignore weak/unclear patterns.

Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 60-90 (only high for clear patterns),
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "What pattern is forming? Entry/exit levels?",
  "patternsDetected": ["specific patterns only"],
  "patternStrength": 0-100 (based on pattern clarity),
  "patternPrediction": "Price target based on pattern"
}`;
}

function buildSmartMoneyPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  const openInterest = metrics.openInterest ?? 0;
  const orderBookImbalance = metrics.orderBookImbalance ?? 0;
  const volumeDelta = metrics.volumeDelta ?? 0;
  const fundingRate = metrics.fundingRate ?? 0;
  
  return `You are a PROFESSIONAL INSTITUTIONAL FLOW ANALYST. Follow the smart money.

ASSET: ${pair} | PRICE: $${price}

INSTITUTIONAL & WHALE INDICATORS:
- Open Interest: $${(openInterest / 1e9).toFixed(2)}B | ${openInterest > 20e9 ? 'HIGH INSTITUTIONAL ACTIVITY' : 'NORMAL'}
- Order Book Imbalance: ${orderBookImbalance.toFixed(2)}% | ${Math.abs(orderBookImbalance) > 15 ? 'LARGE ORDERS DETECTED' : 'NORMAL'}
- Volume Delta: ${volumeDelta.toFixed(2)}% | ${Math.abs(volumeDelta) > 10 ? 'SIGNIFICANT ACCUMULATION/DISTRIBUTION' : 'NORMAL'}
- Funding Rate: ${(fundingRate * 100).toFixed(4)}% | ${fundingRate > 0.03 ? 'RETAIL LONGS EXTREME' : fundingRate < -0.03 ? 'RETAIL SHORTS EXTREME' : 'NEUTRAL'}
- Volume Confirmation: ${metrics.volumeConfirmation ? 'YES - Institutions confirming move' : 'NO'}
- ADX: ${metrics.adx?.toFixed(1) || 25} | Trend: ${(metrics.adx ?? 25) > 30 ? 'Institutions riding trend' : 'Weak trend'}

SMART MONEY RULES:
- BUY: Institutions accumulating (positive volume delta + order book buyers + low funding)
- SELL: Institutions distributing (negative volume delta + order book sellers + high funding)
- NO_TRADE: No clear institutional activity, mixed signals, retail-dominated

FOLLOW SMART MONEY: They have better information. Trade WITH them, not against.

Respond in JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 60-90 (only high when clear institutional flow),
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "insight": "What are institutions doing? Accumulating or distributing?",
  "institutionalFlow": "ACCUMULATING" | "DISTRIBUTING" | "NEUTRAL",
  "whaleActivity": "What are large players doing?",
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
