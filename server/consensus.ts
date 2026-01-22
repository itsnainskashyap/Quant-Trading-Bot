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
}

function buildAnalysisPrompt(pair: TradingPair, metrics: MarketMetrics, price: number): string {
  return `You are an expert cryptocurrency trading analyst. Analyze the following market data and provide a trading recommendation.

TRADING PAIR: ${pair}
CURRENT PRICE: $${price.toLocaleString()}

MARKET METRICS:
- Volume Delta: ${(metrics.volumeDelta * 100).toFixed(2)}% (positive = buying pressure, negative = selling pressure)
- Order Book Imbalance: ${(metrics.orderBookImbalance * 100).toFixed(2)}% (positive = more bids, negative = more asks)
- Volatility Index: ${metrics.volatility.toFixed(2)} (0-100, higher = more volatile)
- Average True Range: $${metrics.atr.toFixed(2)}
- Funding Rate: ${(metrics.fundingRate * 100).toFixed(4)}%
- Open Interest: $${metrics.openInterest.toLocaleString()}

IMPORTANT RULES:
1. CAPITAL PROTECTION IS PRIORITY #1 - prefer NO_TRADE over uncertain signals
2. Only recommend BUY/SELL with high confidence (>75%)
3. If volatility is HIGH or signals are mixed, recommend NO_TRADE
4. Consider market regime carefully

Respond in this EXACT JSON format only:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 0-100,
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "reasoning": "brief explanation (max 100 words)"
}`;
}

async function analyzeWithOpenAI(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: buildAnalysisPrompt(pair, metrics, price) }],
      temperature: 0.1,
      max_tokens: 500,
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
      success: false,
    };
  }
}

async function analyzeWithAnthropic(pair: TradingPair, metrics: MarketMetrics, price: number): Promise<AIAnalysisResult> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
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
      success: false,
    };
  }
}

function calculateConsensus(results: AIAnalysisResult[]): ConsensusResult {
  const totalProviders = results.length;
  const successfulResults = results.filter(r => r.success);
  
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

  return {
    consensusSignal: finalSignal,
    consensusConfidence: finalConfidence,
    consensusRisk: finalRisk,
    agreementLevel: Math.round(agreementLevel),
    providers: results,
    hasConsensus,
    reasoning: reasonings || "No clear consensus - protecting capital",
    warnings,
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
    .map(p => `**${p.provider}**: ${p.signal} (${p.confidence}% confidence, ${p.riskLevel} risk)`)
    .join("\n");

  let explanation = `## Multi-AI Consensus Analysis\n\n`;
  explanation += `**Consensus Decision**: ${consensus.consensusSignal}\n`;
  explanation += `**Agreement Level**: ${consensus.agreementLevel}% (${consensus.hasConsensus ? "Strong" : "Weak"})\n`;
  explanation += `**Combined Confidence**: ${consensus.consensusConfidence}%\n`;
  explanation += `**Risk Assessment**: ${consensus.consensusRisk}\n\n`;
  
  explanation += `### Individual AI Analysis:\n${providerSummary}\n\n`;
  
  if (consensus.warnings.length > 0) {
    explanation += `### Safety Warnings:\n`;
    consensus.warnings.forEach(w => {
      explanation += `- ${w}\n`;
    });
    explanation += "\n";
  }

  explanation += `### Combined Reasoning:\n${consensus.reasoning}\n\n`;
  
  explanation += `*This analysis uses OpenAI GPT-5.1, Anthropic Claude, and Google Gemini in consensus mode for maximum signal quality and capital protection.*`;

  return explanation;
}
