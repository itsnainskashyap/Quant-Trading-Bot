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
  
  const rsi = metrics.rsi ?? 50;
  const rsiSignal = rsi < 25 ? "EXTREMELY OVERSOLD - Strong buy zone" :
                    rsi < 35 ? "OVERSOLD - Potential bounce" :
                    rsi > 75 ? "EXTREMELY OVERBOUGHT - Strong sell zone" :
                    rsi > 65 ? "OVERBOUGHT - Potential pullback" : "NEUTRAL";
  
  const macdSignal = metrics.macdTrend === 'BULLISH' ? "BULLISH momentum" : 
                     metrics.macdTrend === 'BEARISH' ? "BEARISH momentum" : "No clear momentum";
  
  const bbSignal = metrics.bollingerPosition === 'BELOW_LOWER' ? "BELOW LOWER BAND - Oversold" :
                   metrics.bollingerPosition === 'ABOVE_UPPER' ? "ABOVE UPPER BAND - Overbought" : "Within bands";
  
  return `You are an ULTRA-CONSERVATIVE cryptocurrency trading analyst. Your #1 priority is CAPITAL PRESERVATION. You only recommend trades with EXTREME confidence and multiple confirmations.

=== PAIR: ${pair} | PRICE: $${price.toLocaleString()} ===

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

=== STRICT ENTRY CRITERIA (ALL must be met for BUY/SELL) ===
For BUY signal, you need:
✓ RSI < 35 (oversold zone)
✓ Price at or below lower Bollinger Band
✓ MACD showing bullish momentum or crossover
✓ Order book favoring buyers (>15%)
✓ Volume confirming move
✓ Volatility not extreme

For SELL signal, you need:
✓ RSI > 65 (overbought zone)
✓ Price at or above upper Bollinger Band
✓ MACD showing bearish momentum or crossover
✓ Order book favoring sellers
✓ Volume confirming move
✓ Volatility not extreme

=== CRITICAL RULES ===
1. DEFAULT TO NO_TRADE - Only signal when 5+ indicators align
2. Never chase - wait for pullbacks
3. High volatility (ATR > 3%) = ALWAYS NO_TRADE
4. Conflicting signals = ALWAYS NO_TRADE
5. Confidence below 75% = ALWAYS NO_TRADE
6. Capital protection is more important than profit

Respond in EXACT JSON:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "holdMinutes": 3-10,
  "technicalScore": 0-100,
  "sentimentScore": 0-100,
  "indicatorsAligned": number of indicators that agree (0-8),
  "psychology": "1 line market psychology",
  "reasoning": "Explain which indicators aligned and why this is a high-probability setup (or why NO_TRADE)"
}`;
}

async function analyzeWithOpenAI(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildAnalysisPrompt(pair, metrics, price) }],
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
      holdDuration: Math.min(10, Math.max(3, parsed.holdMinutes || 5)),
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
      holdDuration: Math.min(10, Math.max(3, parsed.holdMinutes || 5)),
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
      holdDuration: Math.min(10, Math.max(3, parsed.holdMinutes || 5)),
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

  if (avgConfidence < 75 && finalSignal !== "NO_TRADE") {
    finalSignal = "NO_TRADE";
    hasConsensus = false;
    warnings.push("Average confidence below 75% - insufficient certainty for trade");
  }

  if (highRiskCount >= 1) {
    finalSignal = "NO_TRADE";
    hasConsensus = false;
    warnings.push("At least one provider flagged high risk - capital protection engaged");
  }
  
  const minConfidence = Math.min(...successfulResults.map(r => r.confidence));
  if (minConfidence < 65 && finalSignal !== "NO_TRADE") {
    finalSignal = "NO_TRADE";
    hasConsensus = false;
    warnings.push("One provider has low confidence - waiting for better setup");
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
