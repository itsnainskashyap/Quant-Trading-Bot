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

function buildAnalysisPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  const volumeTrend = metrics.volumeDelta > 0 ? "BUYING PRESSURE" : "SELLING PRESSURE";
  const orderBookSide = metrics.orderBookImbalance > 0 ? "BUYERS DOMINATING" : "SELLERS DOMINATING";
  const fundingBias = metrics.fundingRate > 0 ? "LONGS PAYING (bullish crowded)" : "SHORTS PAYING (bearish crowded)";
  
  return `You are an elite cryptocurrency trading analyst specializing in 1-MINUTE SCALPING. The last 1-minute candle just closed. Analyze ALL factors for the NEXT candle prediction.

=== CURRENT MARKET STATE ===
PAIR: ${pair}
PRICE AT CANDLE CLOSE: $${price.toLocaleString()}

=== TECHNICAL ANALYSIS DATA ===
- ATR (Volatility): $${metrics.atr.toFixed(2)} (${metrics.volatility < 2 ? "LOW" : metrics.volatility < 4 ? "MEDIUM" : "HIGH"} volatility)
- Volatility Index: ${metrics.volatility.toFixed(2)}/10

=== VOLUME & ORDER FLOW ANALYSIS ===
- Volume Delta: ${metrics.volumeDelta.toFixed(2)}% → ${volumeTrend}
- Order Book Imbalance: ${metrics.orderBookImbalance.toFixed(2)}% → ${orderBookSide}
- Open Interest: $${(metrics.openInterest / 1e9).toFixed(2)}B (${metrics.openInterest > 15e9 ? "HIGH leverage" : "NORMAL leverage"})

=== SENTIMENT & PSYCHOLOGY ANALYSIS ===
- Funding Rate: ${(metrics.fundingRate * 100).toFixed(4)}% → ${fundingBias}
- Last Volume Aggression: ${Math.abs(metrics.volumeDelta) > 10 ? "AGGRESSIVE" : Math.abs(metrics.volumeDelta) > 5 ? "MODERATE" : "PASSIVE"} ${metrics.volumeDelta > 0 ? "buyers" : "sellers"}
- Crowd Psychology: ${metrics.fundingRate > 0.0005 ? "Over-leveraged longs (squeeze risk)" : metrics.fundingRate < -0.0005 ? "Over-leveraged shorts (squeeze risk)" : "Balanced positioning"}

=== YOUR ANALYSIS TASKS ===
1. TECHNICAL: Analyze price action, support/resistance from ATR
2. SENTIMENT: Who won the last candle? Buyers or sellers? What's their next move?
3. PSYCHOLOGY: Retail traders ka behavior dekho - are they chasing? Are they scared?
4. TIMING: Kitne minutes tak trade hold karna chahiye? (1-15 mins based on volatility)

=== CRITICAL RULES ===
- CAPITAL PROTECTION FIRST - prefer NO_TRADE over 50/50 trades
- Only BUY/SELL with >70% confidence
- If volatility HIGH or signals conflict → NO_TRADE
- Consider stop-loss hunting by market makers

Respond in this EXACT JSON format:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "holdMinutes": 1-15,
  "technicalScore": 0-100,
  "sentimentScore": 0-100,
  "psychology": "1 line - what retail traders are thinking/feeling right now",
  "reasoning": "2-3 lines explaining your signal with technical + sentiment factors"
}`;
}

async function analyzeWithOpenAI(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: buildAnalysisPrompt(pair, metrics, price) }],
      temperature: 0.1,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      provider: "OpenAI GPT-5.1",
      signal: parsed.signal as SignalType,
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      reasoning: parsed.reasoning,
      riskLevel: parsed.risk as RiskGrade,
      holdDuration: Math.min(15, Math.max(1, parsed.holdMinutes || 5)),
      technicalScore: Math.min(100, Math.max(0, parsed.technicalScore || 50)),
      sentimentScore: Math.min(100, Math.max(0, parsed.sentimentScore || 50)),
      psychologyInsight: parsed.psychology || "Market participants are cautious",
      success: true,
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    return {
      provider: "OpenAI GPT-5.1",
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

async function analyzeWithAnthropic(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAnalysisResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: buildAnalysisPrompt(pair, metrics, price) }],
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
      holdDuration: Math.min(15, Math.max(1, parsed.holdMinutes || 5)),
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

async function analyzeWithGemini(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAnalysisResult> {
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildAnalysisPrompt(pair, metrics, price),
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
      holdDuration: Math.min(15, Math.max(1, parsed.holdMinutes || 5)),
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

  if (agreementCount < 2) {
    finalSignal = "NO_TRADE";
    hasConsensus = false;
    warnings.push("AI providers disagree - avoiding risky position");
  }

  if (avgConfidence < 70 && finalSignal !== "NO_TRADE") {
    finalSignal = "NO_TRADE";
    hasConsensus = false;
    warnings.push("Average confidence too low for safe trade");
  }

  if (highRiskCount >= 2) {
    finalSignal = "NO_TRADE";
    hasConsensus = false;
    warnings.push("Multiple providers flagged high risk - capital protection engaged");
  }

  const signalMismatch = successfulResults.some(r => 
    (r.signal === "BUY" && successfulResults.some(o => o.signal === "SELL")) ||
    (r.signal === "SELL" && successfulResults.some(o => o.signal === "BUY"))
  );

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

  const finalConfidence = hasConsensus 
    ? Math.round(avgConfidence) 
    : 0;

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
  price: number
): Promise<ConsensusResult> {
  const [openaiResult, anthropicResult, geminiResult] = await Promise.all([
    analyzeWithOpenAI(pair, metrics, price),
    analyzeWithAnthropic(pair, metrics, price),
    analyzeWithGemini(pair, metrics, price),
  ]);

  return calculateConsensus([openaiResult, anthropicResult, geminiResult]);
}

export function generateConsensusExplanation(consensus: ConsensusResult): string {
  const providerSummary = consensus.providers
    .filter(p => p.success)
    .map(p => `**${p.provider}**: ${p.signal} (${p.confidence}% confidence, Hold: ${p.holdDuration} min)`)
    .join("\n");

  let explanation = `## Multi-AI Consensus Analysis\n\n`;
  explanation += `**Signal**: ${consensus.consensusSignal}\n`;
  explanation += `**Confidence**: ${consensus.consensusConfidence}%\n`;
  explanation += `**Hold Duration**: ${consensus.holdDuration} minutes\n`;
  explanation += `**Risk Level**: ${consensus.consensusRisk}\n\n`;
  
  explanation += `### Technical Analysis\n`;
  explanation += `- Trend: ${consensus.technicalAnalysis.trend}\n`;
  explanation += `- Momentum: ${consensus.technicalAnalysis.momentum}\n\n`;
  
  explanation += `### Sentiment Analysis\n`;
  explanation += `- Buyer Strength: ${consensus.sentimentAnalysis.buyerStrength}%\n`;
  explanation += `- Seller Strength: ${consensus.sentimentAnalysis.sellerStrength}%\n`;
  explanation += `- Dominant Side: ${consensus.sentimentAnalysis.dominantSide}\n\n`;
  
  explanation += `### Market Psychology\n`;
  explanation += `${consensus.sentimentAnalysis.psychologyNote}\n\n`;

  explanation += `### AI Provider Breakdown:\n${providerSummary}\n\n`;
  
  if (consensus.warnings.length > 0) {
    explanation += `### Safety Warnings:\n`;
    consensus.warnings.forEach(w => {
      explanation += `- ${w}\n`;
    });
    explanation += "\n";
  }

  explanation += `### Reasoning:\n${consensus.reasoning}\n\n`;
  
  explanation += `*Analysis from OpenAI GPT-5.1, Anthropic Claude, and Google Gemini consensus.*`;

  return explanation;
}
