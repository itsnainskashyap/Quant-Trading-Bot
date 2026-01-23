import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import type { TradingPair, SignalType, RiskGrade, MarketMetrics } from "@shared/schema";

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

export interface AIAnalysisResult {
  provider: string;
  signal: SignalType;
  confidence: number;
  reasoning: string;
  riskLevel: RiskGrade;
  success: boolean;
  holdDuration: number;
  technicalScore: number;
  sentimentScore: number;
  psychologyInsight: string;
}

export interface ConsensusResult {
  consensusSignal: SignalType;
  consensusConfidence: number;
  consensusRisk: RiskGrade;
  agreementLevel: number;
  providers: AIAnalysisResult[];
  hasConsensus: boolean;
  reasoning: string;
  warnings: string[];
  holdDuration: number;
  technicalAnalysis: {
    trend: string;
    momentum: string;
    support: number;
    resistance: number;
  };
  sentimentAnalysis: {
    buyerStrength: number;
    sellerStrength: number;
    dominantSide: string;
    psychologyNote: string;
  };
}

function buildAnalysisPrompt(pair: TradingPair, metrics: MarketMetrics, price: number, tradeMode: number = 5): string {
  const volumeTrend = metrics.volumeDelta > 0 ? "BUYING PRESSURE" : "SELLING PRESSURE";
  const orderBookSide = metrics.orderBookImbalance > 0 ? "BUYERS DOMINATING" : "SELLERS DOMINATING";
  const fundingBias = metrics.fundingRate > 0 ? "LONGS PAYING (bullish crowded)" : "SHORTS PAYING (bearish crowded)";
  
  // Timeframe-specific settings
  const timeframeSettings = {
    1: { name: "SCALP (1 min)", riskPct: 1.0, minConfidence: 70, description: "Very short scalp trade - need strong momentum" },
    3: { name: "SHORT (3 min)", riskPct: 1.5, minConfidence: 65, description: "Short-term swing - moderate momentum required" },
    5: { name: "MEDIUM (5 min)", riskPct: 2.0, minConfidence: 60, description: "Standard trade duration - balanced approach" },
    10: { name: "LONG (10 min)", riskPct: 2.5, minConfidence: 55, description: "Longer hold - trend following approach" },
  };
  const settings = timeframeSettings[tradeMode as keyof typeof timeframeSettings] || timeframeSettings[5];
  
  const rsi = metrics.rsi ?? 50;
  const rsiSignal = rsi < 25 ? "EXTREMELY OVERSOLD - Strong buy zone" :
                    rsi < 35 ? "OVERSOLD - Potential bounce" :
                    rsi > 75 ? "EXTREMELY OVERBOUGHT - Strong sell zone" :
                    rsi > 65 ? "OVERBOUGHT - Potential pullback" : "NEUTRAL";
  
  const macdSignal = metrics.macdTrend === 'BULLISH' ? "BULLISH momentum" : 
                     metrics.macdTrend === 'BEARISH' ? "BEARISH momentum" : "No clear momentum";
  
  const bbSignal = metrics.bollingerPosition === 'BELOW_LOWER' ? "BELOW LOWER BAND - Oversold" :
                   metrics.bollingerPosition === 'ABOVE_UPPER' ? "ABOVE UPPER BAND - Overbought" : "Within bands";
  
  return `You are a cryptocurrency trading analyst analyzing for a ${settings.name} trade.
${settings.description}. Risk per trade: ${settings.riskPct}%. Minimum confidence required: ${settings.minConfidence}%.

=== PAIR: ${pair} | PRICE: $${price.toLocaleString()} | TIMEFRAME: ${tradeMode} MINUTE ===

=== MULTI-INDICATOR TECHNICAL ANALYSIS ===
RSI (14): ${rsi.toFixed(1)} → ${rsiSignal}
MACD: ${macdSignal}
Bollinger: ${bbSignal}
ATR: $${metrics.atr?.toFixed(2) || 'N/A'} (Volatility: ${metrics.volatility < 2 ? "LOW" : metrics.volatility < 4 ? "MEDIUM" : "HIGH"})
SMA 20/50: ${metrics.sma20?.toFixed(2)} / ${metrics.sma50?.toFixed(2)}
Technical Signal: ${metrics.overallTechnicalSignal || 'NEUTRAL'}
Technical Strength: ${metrics.technicalStrength || 50}%

=== ORDER FLOW & VOLUME ===
Volume Delta: ${metrics.volumeDelta?.toFixed(2)}% → ${volumeTrend}
Order Book: ${metrics.orderBookImbalance?.toFixed(2)}% → ${orderBookSide}
Funding Rate: ${(metrics.fundingRate * 100).toFixed(4)}% → ${fundingBias}

=== TRADING CRITERIA (You must make a decision) ===
For BUY signal (any 3+ of these):
• RSI < 45 or showing bullish divergence
• Price near lower Bollinger Band or bouncing from support
• MACD above signal line or showing bullish crossover
• Order book slightly favoring buyers
• Positive volume trend
• Any bullish momentum signs

For SELL signal (any 3+ of these):
• RSI > 55 or showing bearish divergence  
• Price near upper Bollinger Band or rejected from resistance
• MACD below signal line or showing bearish crossover
• Order book slightly favoring sellers
• Negative volume trend
• Any bearish momentum signs

=== IMPORTANT RULES FOR ${tradeMode} MINUTE TRADE ===
1. YOU MUST MAKE A DECISION - analyze the data and pick a direction
2. NO_TRADE only when indicators are completely mixed (close to 50/50)
3. Be decisive - even slight directional bias should result in BUY or SELL
4. For ${tradeMode}min trades: ${tradeMode === 1 ? 'Favor momentum and recent price action' : tradeMode === 3 ? 'Look for short-term patterns' : tradeMode === 5 ? 'Balance multiple indicators' : 'Follow the dominant trend'}
5. Confidence should reflect how clear the direction is (60-85% is normal)
6. Risk is LOW if volatility is low, MEDIUM normally, HIGH only in extreme conditions

Respond in EXACT JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "holdMinutes": ${tradeMode},
  "technicalScore": 0-100,
  "sentimentScore": 0-100,
  "indicatorsAligned": number of indicators that agree (0-8),
  "psychology": "1 line market psychology",
  "reasoning": "Write 2-3 short sentences: 1) Key indicator readings (RSI=X, MACD=Y), 2) Why signal given or why NO_TRADE. Be specific with numbers."
}`;
}

async function analyzeWithOpenAI(pair: TradingPair, metrics: MarketMetrics, price: number, tradeMode: number = 5): Promise<AIAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildAnalysisPrompt(pair, metrics, price, tradeMode) }],
      temperature: 0.1,
      max_completion_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      provider: "OpenAI GPT-4o",
      signal: parsed.signal as SignalType,
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      reasoning: parsed.reasoning,
      riskLevel: parsed.risk as RiskGrade,
      holdDuration: Math.min(10, Math.max(1, parsed.holdMinutes || 5)),
      technicalScore: Math.min(100, Math.max(0, parsed.technicalScore || 50)),
      sentimentScore: Math.min(100, Math.max(0, parsed.sentimentScore || 50)),
      psychologyInsight: parsed.psychology || "Market participants are cautious",
      success: true,
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    return {
      provider: "OpenAI GPT-4o",
      signal: "NO_TRADE",
      confidence: 0,
      reasoning: "Analysis failed - defaulting to safe position",
      riskLevel: "HIGH",
      holdDuration: 0,
      technicalScore: 0,
      sentimentScore: 0,
      psychologyInsight: "Unable to analyze market sentiment",
      success: false,
    };
  }
}

async function analyzeWithAnthropic(pair: TradingPair, metrics: MarketMetrics, price: number, tradeMode: number = 5): Promise<AIAnalysisResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: buildAnalysisPrompt(pair, metrics, price, tradeMode) }],
    });

    const content = message.content[0];
    const text = content.type === "text" ? content.text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      provider: "Anthropic Claude",
      signal: parsed.signal as SignalType,
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      reasoning: parsed.reasoning,
      riskLevel: parsed.risk as RiskGrade,
      holdDuration: Math.min(10, Math.max(1, parsed.holdMinutes || 5)),
      technicalScore: Math.min(100, Math.max(0, parsed.technicalScore || 50)),
      sentimentScore: Math.min(100, Math.max(0, parsed.sentimentScore || 50)),
      psychologyInsight: parsed.psychology || "Market participants are cautious",
      success: true,
    };
  } catch (error) {
    console.error("Anthropic analysis failed:", error);
    return {
      provider: "Anthropic Claude",
      signal: "NO_TRADE",
      confidence: 0,
      reasoning: "Analysis failed - defaulting to safe position",
      riskLevel: "HIGH",
      holdDuration: 0,
      technicalScore: 0,
      sentimentScore: 0,
      psychologyInsight: "Unable to analyze market sentiment",
      success: false,
    };
  }
}

async function analyzeWithGemini(pair: TradingPair, metrics: MarketMetrics, price: number, tradeMode: number = 5): Promise<AIAnalysisResult> {
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildAnalysisPrompt(pair, metrics, price, tradeMode),
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      provider: "Google Gemini",
      signal: parsed.signal as SignalType,
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      reasoning: parsed.reasoning,
      riskLevel: parsed.risk as RiskGrade,
      holdDuration: Math.min(10, Math.max(1, parsed.holdMinutes || 5)),
      technicalScore: Math.min(100, Math.max(0, parsed.technicalScore || 50)),
      sentimentScore: Math.min(100, Math.max(0, parsed.sentimentScore || 50)),
      psychologyInsight: parsed.psychology || "Market participants are cautious",
      success: true,
    };
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      provider: "Google Gemini",
      signal: "NO_TRADE",
      confidence: 0,
      reasoning: "Analysis failed - defaulting to safe position",
      riskLevel: "HIGH",
      holdDuration: 0,
      technicalScore: 0,
      sentimentScore: 0,
      psychologyInsight: "Unable to analyze market sentiment",
      success: false,
    };
  }
}

function calculateConsensus(results: AIAnalysisResult[]): ConsensusResult {
  const totalProviders = results.length;
  const successfulResults = results.filter(r => r.success);
  
  const defaultTechnical = { trend: "NEUTRAL", momentum: "WEAK", support: 0, resistance: 0 };
  const defaultSentiment = { buyerStrength: 50, sellerStrength: 50, dominantSide: "NEUTRAL", psychologyNote: "Unable to determine market psychology" };

  if (successfulResults.length === 0) {
    return {
      consensusSignal: "NO_TRADE",
      consensusConfidence: 0,
      consensusRisk: "HIGH",
      agreementLevel: 0,
      providers: results,
      hasConsensus: false,
      reasoning: "All AI providers failed to analyze - staying safe with NO_TRADE",
      warnings: ["All AI analysis failed", "System defaulting to capital protection mode"],
      holdDuration: 0,
      technicalAnalysis: defaultTechnical,
      sentimentAnalysis: defaultSentiment,
    };
  }

  if (successfulResults.length < 2) {
    return {
      consensusSignal: "NO_TRADE",
      consensusConfidence: 0,
      consensusRisk: "HIGH",
      agreementLevel: Math.round((successfulResults.length / totalProviders) * 100),
      providers: results,
      hasConsensus: false,
      reasoning: "Insufficient provider responses (need at least 2/3) - staying safe with NO_TRADE",
      warnings: ["Only 1 AI provider responded", "Quorum not met - defaulting to capital protection"],
      holdDuration: 0,
      technicalAnalysis: defaultTechnical,
      sentimentAnalysis: defaultSentiment,
    };
  }

  const signalCounts: Record<SignalType, number> = { BUY: 0, SELL: 0, NO_TRADE: 0 };
  let totalConfidence = 0;
  let highRiskCount = 0;

  for (const result of successfulResults) {
    signalCounts[result.signal]++;
    totalConfidence += result.confidence;
    if (result.riskLevel === "HIGH") highRiskCount++;
  }

  const dominantSignal = Object.entries(signalCounts).reduce((a, b) => 
    a[1] > b[1] ? a : b
  )[0] as SignalType;

  const agreementCount = signalCounts[dominantSignal];
  const agreementLevel = (agreementCount / totalProviders) * 100;
  const avgConfidence = totalConfidence / successfulResults.length;

  const warnings: string[] = [];
  let finalSignal: SignalType = dominantSignal;
  let hasConsensus = true;

  // Need at least 2/3 providers to agree for a signal
  if (agreementCount < 2 && finalSignal !== "NO_TRADE") {
    // Check if there's no direct conflict (BUY vs SELL)
    const hasBuy = signalCounts["BUY"] > 0;
    const hasSell = signalCounts["SELL"] > 0;
    
    if (hasBuy && hasSell) {
      // Direct conflict - stay out
      finalSignal = "NO_TRADE";
      hasConsensus = false;
      warnings.push("BUY/SELL conflict between providers - staying out");
    } else if (agreementCount === 1) {
      // Only 1 provider has a direction, others say NO_TRADE
      // Keep the directional signal but add warning
      warnings.push("Only 1 provider gave directional signal - lower conviction");
    }
  }

  // Require 55%+ average confidence for actionable signals (relaxed from 60%)
  if (avgConfidence < 55 && finalSignal !== "NO_TRADE") {
    warnings.push(`Confidence at ${Math.round(avgConfidence)}% - borderline setup`);
    // Only block if very low confidence
    if (avgConfidence < 45) {
      finalSignal = "NO_TRADE";
      hasConsensus = false;
    }
  }

  // Only block if ALL providers flag HIGH risk
  if (highRiskCount >= 3) {
    finalSignal = "NO_TRADE";
    hasConsensus = false;
    warnings.push("All providers flagged high risk - capital protection engaged");
  } else if (highRiskCount >= 2) {
    warnings.push("Elevated risk detected - use smaller position size");
  }
  
  // Check for direct BUY vs SELL conflict
  const signalMismatch = signalCounts["BUY"] > 0 && signalCounts["SELL"] > 0;

  if (signalMismatch) {
    finalSignal = "NO_TRADE";
    hasConsensus = false;
    warnings.push("CRITICAL: Conflicting BUY/SELL signals detected - staying out");
  }

  const riskCounts: Record<RiskGrade, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  successfulResults.forEach(r => riskCounts[r.riskLevel]++);
  const dominantRisk = Object.entries(riskCounts).reduce((a, b) => 
    a[1] > b[1] ? a : b
  )[0] as RiskGrade;

  const finalRisk = highRiskCount > 0 ? "HIGH" : dominantRisk;

  const reasonings = successfulResults
    .filter(r => r.signal === finalSignal || finalSignal === "NO_TRADE")
    .map(r => `${r.provider}: ${r.reasoning}`)
    .join(" | ");

  // Always show actual confidence, even for NO_TRADE (so users know how close it was)
  const finalConfidence = Math.round(avgConfidence);

  const avgHoldDuration = Math.round(
    successfulResults.reduce((sum, r) => sum + r.holdDuration, 0) / successfulResults.length
  );
  
  const avgTechnicalScore = Math.round(
    successfulResults.reduce((sum, r) => sum + r.technicalScore, 0) / successfulResults.length
  );
  
  const avgSentimentScore = Math.round(
    successfulResults.reduce((sum, r) => sum + r.sentimentScore, 0) / successfulResults.length
  );

  const psychologyInsights = successfulResults
    .map(r => r.psychologyInsight)
    .filter(p => p && p.length > 0);

  const trend = avgTechnicalScore > 60 ? "BULLISH" : avgTechnicalScore < 40 ? "BEARISH" : "NEUTRAL";
  const momentum = avgTechnicalScore > 70 ? "STRONG" : avgTechnicalScore > 50 ? "MODERATE" : "WEAK";
  const dominantSide = avgSentimentScore > 55 ? "BUYERS" : avgSentimentScore < 45 ? "SELLERS" : "NEUTRAL";

  return {
    consensusSignal: finalSignal,
    consensusConfidence: finalConfidence,
    consensusRisk: finalRisk,
    agreementLevel: Math.round(agreementLevel),
    providers: results,
    hasConsensus,
    reasoning: reasonings || "No clear consensus - protecting capital",
    warnings,
    holdDuration: hasConsensus ? avgHoldDuration : 0,
    technicalAnalysis: {
      trend,
      momentum,
      support: 0,
      resistance: 0,
    },
    sentimentAnalysis: {
      buyerStrength: avgSentimentScore,
      sellerStrength: 100 - avgSentimentScore,
      dominantSide,
      psychologyNote: psychologyInsights[0] || "Market participants are evaluating their positions",
    },
  };
}

export async function getMultiAIConsensus(
  pair: TradingPair,
  metrics: MarketMetrics,
  price: number,
  tradeMode: number = 5
): Promise<ConsensusResult> {
  console.log(`[Consensus] Starting ${tradeMode} minute analysis for ${pair}`);
  const [openaiResult, anthropicResult, geminiResult] = await Promise.all([
    analyzeWithOpenAI(pair, metrics, price, tradeMode),
    analyzeWithAnthropic(pair, metrics, price, tradeMode),
    analyzeWithGemini(pair, metrics, price, tradeMode),
  ]);

  return calculateConsensus([openaiResult, anthropicResult, geminiResult]);
}

export function generateConsensusExplanation(consensus: ConsensusResult): string {
  const successfulProviders = consensus.providers.filter(p => p.success);
  
  // Build concise analysis summary
  let explanation = `Signal: ${consensus.consensusSignal} | Confidence: ${consensus.consensusConfidence}% | Risk: ${consensus.consensusRisk}`;
  
  if (consensus.holdDuration > 0) {
    explanation += ` | Hold: ${consensus.holdDuration} min`;
  }
  
  explanation += `\n\nTechnical: ${consensus.technicalAnalysis.trend} trend, ${consensus.technicalAnalysis.momentum} momentum`;
  explanation += `\nSentiment: ${consensus.sentimentAnalysis.dominantSide} (Buyers ${consensus.sentimentAnalysis.buyerStrength}% vs Sellers ${consensus.sentimentAnalysis.sellerStrength}%)`;
  
  if (consensus.sentimentAnalysis.psychologyNote) {
    explanation += `\n\n${consensus.sentimentAnalysis.psychologyNote}`;
  }
  
  // Add provider votes
  if (successfulProviders.length > 0) {
    explanation += `\n\nAI Votes: `;
    explanation += successfulProviders
      .map(p => {
        const shortName = p.provider.includes("OpenAI") ? "GPT-4o" : 
                          p.provider.includes("Anthropic") ? "Claude" : "Gemini";
        return `${shortName}=${p.signal}(${p.confidence}%)`;
      })
      .join(" | ");
  }
  
  // Add warnings if any
  if (consensus.warnings.length > 0) {
    explanation += `\n\nWarnings: ${consensus.warnings.join(", ")}`;
  }
  
  // Add main reasoning
  if (consensus.reasoning && consensus.reasoning !== "No clear consensus - protecting capital") {
    explanation += `\n\nAnalysis: ${consensus.reasoning}`;
  }

  return explanation;
}
