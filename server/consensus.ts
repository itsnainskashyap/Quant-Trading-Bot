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
  const fundingBias = metrics.fundingRate > 0 ? "LONGS PAYING" : "SHORTS PAYING";
  
  const timeframeSettings = {
    1: { name: "SCALP (1 min)", style: "Momentum-based quick entry/exit" },
    3: { name: "SHORT (3 min)", style: "Short-term swing trading" },
    5: { name: "MEDIUM (5 min)", style: "Balanced multi-indicator approach" },
    10: { name: "LONG (10 min)", style: "Trend following with confirmation" },
  };
  const settings = timeframeSettings[tradeMode as keyof typeof timeframeSettings] || timeframeSettings[5];
  
  // Format RSI interpretation
  const rsi = metrics.rsi ?? 50;
  const rsiZone = rsi < 20 ? "EXTREMELY OVERSOLD" : rsi < 30 ? "OVERSOLD" : rsi < 40 ? "SLIGHTLY OVERSOLD" :
                  rsi > 80 ? "EXTREMELY OVERBOUGHT" : rsi > 70 ? "OVERBOUGHT" : rsi > 60 ? "SLIGHTLY OVERBOUGHT" : "NEUTRAL";
  
  // Format Stochastic
  const stochK = metrics.stochasticK ?? 50;
  const stochD = metrics.stochasticD ?? 50;
  const stochZone = stochK < 20 ? "OVERSOLD" : stochK > 80 ? "OVERBOUGHT" : "NEUTRAL";
  const stochCross = stochK > stochD ? "BULLISH K>D" : stochK < stochD ? "BEARISH K<D" : "NEUTRAL";
  
  // Format Williams %R
  const willR = metrics.williamsR ?? -50;
  const willZone = willR < -80 ? "OVERSOLD" : willR > -20 ? "OVERBOUGHT" : "NEUTRAL";
  
  // Format ADX trend strength
  const adx = metrics.adx ?? 25;
  const trendStr = adx > 50 ? "VERY STRONG TREND" : adx > 40 ? "STRONG TREND" : adx > 25 ? "MODERATE TREND" : adx > 15 ? "WEAK TREND" : "NO TREND";
  
  // Moving average analysis
  const priceVsSMA20 = metrics.sma20 ? ((price - metrics.sma20) / metrics.sma20 * 100).toFixed(2) : "N/A";
  const priceVsSMA50 = metrics.sma50 ? ((price - metrics.sma50) / metrics.sma50 * 100).toFixed(2) : "N/A";
  const priceVsSMA200 = metrics.sma200 ? ((price - metrics.sma200) / metrics.sma200 * 100).toFixed(2) : "N/A";
  
  // Support/Resistance analysis
  const distSupport = metrics.distanceToSupport?.toFixed(2) ?? "N/A";
  const distResist = metrics.distanceToResistance?.toFixed(2) ?? "N/A";
  
  // Confluence analysis
  const bullishCount = metrics.bullishSignals?.length ?? 0;
  const bearishCount = metrics.bearishSignals?.length ?? 0;
  const confluenceNet = metrics.confluenceScore ?? 0;
  const confluenceDir = confluenceNet > 2 ? "BULLISH" : confluenceNet < -2 ? "BEARISH" : "MIXED";
  
  return `You are an ELITE cryptocurrency trader performing institutional-grade analysis for a ${settings.name} trade.
Strategy: ${settings.style}

═══════════════════════════════════════════════════════════════
ASSET: ${pair} | CURRENT PRICE: $${price.toLocaleString()} | TIMEFRAME: ${tradeMode} MIN
═══════════════════════════════════════════════════════════════

╔══════════════════════════════════════════════════════════════╗
║                  MOMENTUM OSCILLATORS                         ║
╚══════════════════════════════════════════════════════════════╝
RSI (14):        ${rsi.toFixed(1)} → ${rsiZone}
Stochastic:      K=${stochK.toFixed(1)} D=${stochD.toFixed(1)} → ${stochZone} | ${stochCross}
Williams %R:     ${willR.toFixed(1)} → ${willZone}
Momentum:        ${metrics.momentum?.toFixed(2) ?? 0}%
ROC (12):        ${metrics.roc?.toFixed(2) ?? 0}%

╔══════════════════════════════════════════════════════════════╗
║                    TREND INDICATORS                           ║
╚══════════════════════════════════════════════════════════════╝
ADX:             ${adx.toFixed(1)} → ${trendStr}
MA Trend:        ${metrics.maTrend ?? 'NEUTRAL'}
MACD:            ${metrics.macdTrend ?? 'NEUTRAL'} | Histogram: ${metrics.macdHistogram?.toFixed(2) ?? 0}
MACD Crossover:  ${metrics.macdCrossover ?? 'NONE'}
Golden Cross:    ${metrics.goldenCross ? 'YES ✓' : 'NO'}
Death Cross:     ${metrics.deathCross ? 'YES ✓' : 'NO'}

╔══════════════════════════════════════════════════════════════╗
║                  MOVING AVERAGES                              ║
╚══════════════════════════════════════════════════════════════╝
Price vs SMA20:  ${priceVsSMA20}% (${Number(priceVsSMA20) > 0 ? 'ABOVE' : 'BELOW'})
Price vs SMA50:  ${priceVsSMA50}% (${Number(priceVsSMA50) > 0 ? 'ABOVE' : 'BELOW'})
Price vs SMA200: ${priceVsSMA200}% (${Number(priceVsSMA200) > 0 ? 'ABOVE' : 'BELOW'})
EMA 12/26/50:    ${metrics.ema12?.toFixed(2) ?? 'N/A'} / ${metrics.ema26?.toFixed(2) ?? 'N/A'} / ${metrics.ema50?.toFixed(2) ?? 'N/A'}

╔══════════════════════════════════════════════════════════════╗
║                  VOLATILITY & BANDS                           ║
╚══════════════════════════════════════════════════════════════╝
Bollinger:       ${metrics.bollingerPosition ?? 'NEUTRAL'}
BB Width:        ${metrics.bollingerWidth?.toFixed(2) ?? 'N/A'}%
BB Squeeze:      ${metrics.bollingerSqueeze ? 'YES - Breakout imminent!' : 'NO'}
ATR:             $${metrics.atr?.toFixed(2) ?? 'N/A'} (${metrics.atrPercent?.toFixed(2) ?? 'N/A'}%)
Volatility:      ${metrics.volatility < 1.5 ? 'LOW' : metrics.volatility < 3 ? 'MEDIUM' : 'HIGH'}

╔══════════════════════════════════════════════════════════════╗
║               SUPPORT & RESISTANCE                            ║
╚══════════════════════════════════════════════════════════════╝
Nearest Support:     $${metrics.nearestSupport?.toFixed(2) ?? 'N/A'} (${distSupport}% away)
Nearest Resistance:  $${metrics.nearestResistance?.toFixed(2) ?? 'N/A'} (${distResist}% away)

╔══════════════════════════════════════════════════════════════╗
║                  ORDER FLOW & VOLUME                          ║
╚══════════════════════════════════════════════════════════════╝
Volume Delta:    ${metrics.volumeDelta?.toFixed(2)}% → ${volumeTrend}
Volume Trend:    ${metrics.volumeTrend ?? 'STABLE'}
Volume Confirm:  ${metrics.volumeConfirmation ? 'YES ✓' : 'NO'}
Order Book:      ${metrics.orderBookImbalance?.toFixed(2)}% → ${orderBookSide}
Funding Rate:    ${(metrics.fundingRate * 100).toFixed(4)}% → ${fundingBias}
Open Interest:   $${(metrics.openInterest / 1000000000).toFixed(2)}B

╔══════════════════════════════════════════════════════════════╗
║              CONFLUENCE ANALYSIS (PRE-CALCULATED)             ║
╚══════════════════════════════════════════════════════════════╝
Bullish Signals: ${bullishCount} ${metrics.bullishSignals?.slice(0, 5).join(', ') ?? ''}
Bearish Signals: ${bearishCount} ${metrics.bearishSignals?.slice(0, 5).join(', ') ?? ''}
Net Confluence:  ${confluenceNet > 0 ? '+' : ''}${confluenceNet} → ${confluenceDir}
Signal Strength: ${metrics.technicalStrength ?? 50}%
Reliability:     ${metrics.reliability ?? 50}%
Overall Signal:  ${metrics.overallTechnicalSignal ?? 'NEUTRAL'}

═══════════════════════════════════════════════════════════════
              PROFESSIONAL TRADING METHODOLOGY
═══════════════════════════════════════════════════════════════

CRITICAL: CAPITAL PROTECTION IS PRIORITY #1
- False signals cause losses - accuracy is more important than frequency
- A missed trade costs nothing, a wrong trade costs money
- Only signal when you have HIGH conviction with multiple confirmations

MULTI-FACTOR CONFLUENCE REQUIREMENT (Need 4+ for actionable signal):
1. RSI Confirmation: <30 for BUY, >70 for SELL (with divergence preferred)
2. Stochastic Agreement: K/D crossover in oversold/overbought zone
3. MACD Alignment: Signal line crossover + histogram momentum
4. ADX Trend Strength: >25 confirms trend, >40 strong trend
5. Price vs Moving Averages: Clear trend bias from SMA20/50/200
6. Volume Confirmation: Delta supporting the direction
7. Bollinger Position: Near band + squeeze for breakout
8. Support/Resistance: Bounce off key level or breakout

STRICT SIGNAL RULES:
BUY ONLY IF ALL:
  - RSI < 35 OR showing bullish divergence
  - Stochastic K crossing above D below 30
  - MACD histogram turning positive OR bullish crossover
  - Price at/near support OR breaking resistance with volume
  - ADX > 20 (trend exists)
  - Volume confirms buying pressure

SELL ONLY IF ALL:
  - RSI > 65 OR showing bearish divergence
  - Stochastic K crossing below D above 70
  - MACD histogram turning negative OR bearish crossover
  - Price at/near resistance OR breaking support with volume
  - ADX > 20 (trend exists)
  - Volume confirms selling pressure

NO_TRADE (PREFER THIS when uncertain):
  - Indicators conflict or mixed signals
  - ADX < 20 (no trend / choppy market)
  - RSI between 40-60 (neutral zone)
  - Low volume / no confirmation
  - Price in middle of range (no edge)
  - ANY doubt = NO_TRADE

CONFIDENCE CALIBRATION (be conservative):
- 80-90: Perfect alignment, 6+ confluent factors, strong trend
- 70-79: Good alignment, 4-5 confluent factors
- 60-69: Acceptable alignment, 3-4 factors, proceed with caution
- Below 60: DO NOT SIGNAL - default to NO_TRADE

Respond in EXACT JSON format:
{
  "signal": "BUY" | "SELL" | "NO_TRADE",
  "confidence": 60-90 (be conservative - accuracy over frequency),
  "risk": "LOW" | "MEDIUM" | "HIGH",
  "holdMinutes": ${tradeMode},
  "technicalScore": 0-100,
  "sentimentScore": 0-100,
  "indicatorsAligned": count of aligned indicators (1-8),
  "psychology": "Brief market sentiment assessment",
  "reasoning": "Explain: Which 4+ factors align? Why is confidence at this level? Key indicator values."
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

  // Check for direct BUY vs SELL conflict first
  const hasBuy = signalCounts["BUY"] > 0;
  const hasSell = signalCounts["SELL"] > 0;
  const signalMismatch = hasBuy && hasSell;

  if (signalMismatch) {
    // Count which direction is stronger
    if (signalCounts["BUY"] > signalCounts["SELL"]) {
      finalSignal = "BUY";
      warnings.push("Mixed signals - going with majority BUY consensus");
    } else if (signalCounts["SELL"] > signalCounts["BUY"]) {
      finalSignal = "SELL";
      warnings.push("Mixed signals - going with majority SELL consensus");
    } else {
      // Exactly equal - use confidence to decide
      const buyConf = successfulResults.filter(r => r.signal === "BUY").reduce((s, r) => s + r.confidence, 0);
      const sellConf = successfulResults.filter(r => r.signal === "SELL").reduce((s, r) => s + r.confidence, 0);
      if (buyConf >= sellConf) {
        finalSignal = "BUY";
        warnings.push("Tie-breaker: BUY wins on confidence");
      } else {
        finalSignal = "SELL";
        warnings.push("Tie-breaker: SELL wins on confidence");
      }
    }
  }

  // If only 1 provider has direction, still use it (less conservative)
  if (agreementCount === 1 && finalSignal !== "NO_TRADE") {
    warnings.push("Single provider conviction - moderate position size recommended");
  }

  // Only block if VERY low confidence (below 40%)
  if (avgConfidence < 40 && finalSignal !== "NO_TRADE") {
    finalSignal = "NO_TRADE";
    hasConsensus = false;
    warnings.push(`Very low confidence ${Math.round(avgConfidence)}% - no clear edge`);
  } else if (avgConfidence < 55 && finalSignal !== "NO_TRADE") {
    warnings.push(`Confidence ${Math.round(avgConfidence)}% - smaller position recommended`);
  }

  // Only block if ALL providers flag HIGH risk
  if (highRiskCount >= 3) {
    warnings.push("All providers flagged high risk - use tight stop-loss");
    // Don't block - still allow signal but with warning
  } else if (highRiskCount >= 2) {
    warnings.push("Elevated risk detected - use smaller position size");
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
