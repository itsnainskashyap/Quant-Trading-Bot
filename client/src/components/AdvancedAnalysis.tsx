import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Brain, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Minus, Target, Zap, Activity } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TradingPair } from "@shared/schema";

interface TriggerCondition {
  type: string;
  targetPrice?: number;
  description: string;
}

interface AdvancedAnalysisResult {
  approved: boolean;
  signal: {
    intent: 'BUY' | 'SELL' | 'NO_TRADE';
    pair: string;
    confidence: number;
    originalConfidence?: number;
    isBlocked: boolean;
    blockReason: string | null;
    riskGrade?: string;
  };
  triggerConditions: TriggerCondition[];
  triggerConditionsFormatted: string;
  expiryMinutes: number;
  expiryTime: number | null;
  metaJudge: {
    approved: boolean;
    marketStructure: {
      regime: string;
      quality: string;
      volatilityState: string;
      trendStrength: string;
    };
    blockReasons: Array<{ code: string; severity: string; description: string }>;
    warnings: string[];
    recommendation: string;
  } | null;
  lossAvoidance: {
    riskLevel: string;
    stabilityScore: number;
    consecutiveLosses: number;
    confidenceReduction: number;
    cooldownActive: boolean;
    cooldownRemainingMinutes: number;
  };
  assetIntelligence: {
    profile: {
      category: string;
      volatilityClass: string;
      sessionBias: string;
    };
    memory: {
      consecutiveLosses: number;
      consecutiveWins: number;
      winRate: number;
      performanceScore: number;
      recentSignalsCount: number;
    };
    thresholds: {
      adjustedRsiOversold: number;
      adjustedRsiOverbought: number;
      confidenceMultiplier: number;
      volatilityAdjustment: number;
      sessionBias: string;
    };
  };
  agents: Array<{
    agent: string;
    signal: string;
    confidence: number;
    weight: number;
    reasoning: string;
  }>;
  tradeRecommendation: {
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
    maxLossPercent: number;
  } | null;
  recommendation: string;
  summary: string;
}

interface AdvancedAnalysisProps {
  pair: TradingPair;
  tradeMode?: number;
}

export function AdvancedAnalysis({ pair, tradeMode = 5 }: AdvancedAnalysisProps) {
  const [analysisResult, setAnalysisResult] = useState<AdvancedAnalysisResult | null>(null);

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/advanced-analysis', { pair, tradeMode });
      return await response.json() as AdvancedAnalysisResult;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
    },
  });

  const recordOutcomeMutation = useMutation({
    mutationFn: async (outcome: 'win' | 'loss' | 'expired') => {
      const response = await apiRequest('POST', '/api/record-outcome', { pair, outcome });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/asset-intelligence', pair] });
    },
  });

  const getSignalColor = (intent: string) => {
    switch (intent) {
      case 'BUY': return 'text-emerald-400';
      case 'SELL': return 'text-red-400';
      default: return 'text-amber-400';
    }
  };

  const getSignalBg = (intent: string) => {
    switch (intent) {
      case 'BUY': return 'bg-emerald-500/20 border-emerald-500/30';
      case 'SELL': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-amber-500/20 border-amber-500/30';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'safe': return 'text-emerald-400 bg-emerald-500/20';
      case 'caution': return 'text-amber-400 bg-amber-500/20';
      case 'danger': return 'text-orange-400 bg-orange-500/20';
      case 'blocked': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#12121a] border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              Advanced Accuracy Analysis
            </CardTitle>
            <Button
              onClick={() => analysisMutation.mutate()}
              disabled={analysisMutation.isPending}
              size="sm"
              data-testid="button-run-analysis"
            >
              {analysisMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Multi-layer accuracy system: Asset Intelligence + Meta-Judge + Loss Avoidance
          </p>
        </CardHeader>

        {analysisResult && (
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg border ${getSignalBg(analysisResult.signal.intent)}`} data-testid="analysis-signal-result">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-3">
                  {analysisResult.approved ? (
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                  <span className={`text-2xl font-bold ${getSignalColor(analysisResult.signal.intent)}`}>
                    {analysisResult.signal.intent}
                  </span>
                  {analysisResult.signal.confidence > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {analysisResult.signal.confidence}% confidence
                    </Badge>
                  )}
                </div>
                <Badge className={analysisResult.approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                  {analysisResult.approved ? 'APPROVED' : 'BLOCKED'}
                </Badge>
              </div>

              {analysisResult.signal.blockReason && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-red-500/10 rounded">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-300">{analysisResult.signal.blockReason}</span>
                </div>
              )}
            </div>

            {analysisResult.triggerConditions.length > 0 && (
              <Card className="bg-[#0a0a0f] border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    Trigger Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysisResult.triggerConditions.map((condition, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm" data-testid={`trigger-condition-${i}`}>
                        <span className="text-blue-400 font-mono">{i + 1}.</span>
                        <span className="text-gray-300">{condition.description}</span>
                      </div>
                    ))}
                  </div>
                  {analysisResult.expiryMinutes > 0 && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      Expires in {analysisResult.expiryMinutes} minutes
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {analysisResult.metaJudge && (
              <Card className="bg-[#0a0a0f] border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    Meta-Judge Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="p-2 bg-[#12121a] rounded">
                      <div className="text-xs text-gray-500">Regime</div>
                      <div className="text-sm font-medium">{analysisResult.metaJudge.marketStructure.regime}</div>
                    </div>
                    <div className="p-2 bg-[#12121a] rounded">
                      <div className="text-xs text-gray-500">Quality</div>
                      <div className="text-sm font-medium">{analysisResult.metaJudge.marketStructure.quality}</div>
                    </div>
                    <div className="p-2 bg-[#12121a] rounded">
                      <div className="text-xs text-gray-500">Volatility</div>
                      <div className="text-sm font-medium">{analysisResult.metaJudge.marketStructure.volatilityState}</div>
                    </div>
                    <div className="p-2 bg-[#12121a] rounded">
                      <div className="text-xs text-gray-500">Trend</div>
                      <div className="text-sm font-medium">{analysisResult.metaJudge.marketStructure.trendStrength}</div>
                    </div>
                  </div>

                  {analysisResult.metaJudge.blockReasons.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Block Reasons:</div>
                      {analysisResult.metaJudge.blockReasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-red-500/10 rounded text-sm" data-testid={`block-reason-${i}`}>
                          <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-red-300">{reason.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {analysisResult.metaJudge.warnings.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Warnings:</div>
                      {analysisResult.metaJudge.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-amber-500/10 rounded text-sm" data-testid={`warning-${i}`}>
                          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <span className="text-amber-300">{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 bg-[#12121a] rounded">
                    <div className="text-xs text-gray-500 mb-1">Recommendation:</div>
                    <div className="text-sm">{analysisResult.metaJudge.recommendation}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#0a0a0f] border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Asset Intelligence & Loss Avoidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-2 bg-[#12121a] rounded">
                    <div className="text-xs text-gray-500">Risk Level</div>
                    <Badge className={`mt-1 ${getRiskLevelColor(analysisResult.lossAvoidance.riskLevel)}`}>
                      {analysisResult.lossAvoidance.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="p-2 bg-[#12121a] rounded">
                    <div className="text-xs text-gray-500">Stability Score</div>
                    <div className="text-lg font-bold">{analysisResult.lossAvoidance.stabilityScore}%</div>
                  </div>
                  <div className="p-2 bg-[#12121a] rounded">
                    <div className="text-xs text-gray-500">Consecutive Losses</div>
                    <div className={`text-lg font-bold ${analysisResult.lossAvoidance.consecutiveLosses >= 2 ? 'text-red-400' : ''}`}>
                      {analysisResult.lossAvoidance.consecutiveLosses}
                    </div>
                  </div>
                  <div className="p-2 bg-[#12121a] rounded">
                    <div className="text-xs text-gray-500">Win Rate</div>
                    <div className="text-lg font-bold">{analysisResult.assetIntelligence.memory.winRate.toFixed(0)}%</div>
                  </div>
                  <div className="p-2 bg-[#12121a] rounded">
                    <div className="text-xs text-gray-500">Performance Score</div>
                    <div className="text-lg font-bold">{analysisResult.assetIntelligence.memory.performanceScore}</div>
                  </div>
                  <div className="p-2 bg-[#12121a] rounded">
                    <div className="text-xs text-gray-500">Asset Category</div>
                    <div className="text-sm font-medium capitalize">{analysisResult.assetIntelligence.profile.category}</div>
                  </div>
                </div>

                {analysisResult.lossAvoidance.cooldownActive && (
                  <div className="mt-3 p-2 bg-red-500/10 rounded flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-300">
                      Cooldown active: {analysisResult.lossAvoidance.cooldownRemainingMinutes} minutes remaining
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#0a0a0f] border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  AI Agent Votes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.agents.map((agent, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#12121a] rounded" data-testid={`agent-vote-${agent.agent.toLowerCase()}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{agent.agent}</span>
                        <Badge variant="outline" className="text-xs">
                          {agent.weight}x
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.signal === 'BUY' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                        {agent.signal === 'SELL' && <TrendingDown className="w-4 h-4 text-red-400" />}
                        {agent.signal === 'NO_TRADE' && <Minus className="w-4 h-4 text-amber-400" />}
                        <span className={`text-sm font-medium ${getSignalColor(agent.signal)}`}>
                          {agent.signal}
                        </span>
                        <span className="text-xs text-gray-500">
                          {agent.confidence}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {analysisResult.tradeRecommendation && (
              <Card className="bg-[#0a0a0f] border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    Trade Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-2 bg-[#12121a] rounded">
                      <div className="text-xs text-gray-500">Entry</div>
                      <div className="text-sm font-mono">${analysisResult.tradeRecommendation.entryPrice.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-[#12121a] rounded">
                      <div className="text-xs text-gray-500">Stop Loss</div>
                      <div className="text-sm font-mono text-red-400">${analysisResult.tradeRecommendation.stopLoss.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-[#12121a] rounded">
                      <div className="text-xs text-gray-500">Take Profit</div>
                      <div className="text-sm font-mono text-emerald-400">${analysisResult.tradeRecommendation.takeProfit.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-[#12121a] rounded">
                      <div className="text-xs text-gray-500">Risk/Reward</div>
                      <div className="text-sm font-medium">1:{analysisResult.tradeRecommendation.riskRewardRatio}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => recordOutcomeMutation.mutate('win')}
                disabled={recordOutcomeMutation.isPending}
                className="text-emerald-400 border-emerald-500/30"
                data-testid="button-record-win"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Record Win
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => recordOutcomeMutation.mutate('loss')}
                disabled={recordOutcomeMutation.isPending}
                className="text-red-400 border-red-500/30"
                data-testid="button-record-loss"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Record Loss
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => recordOutcomeMutation.mutate('expired')}
                disabled={recordOutcomeMutation.isPending}
                className="text-gray-400 border-gray-500/30"
                data-testid="button-record-expired"
              >
                <Clock className="w-4 h-4 mr-1" />
                Expired
              </Button>
            </div>
          </CardContent>
        )}

        {!analysisResult && !analysisMutation.isPending && (
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Click "Run Analysis" to get accuracy-focused trading signals</p>
              <p className="text-sm mt-1">NO TRADE is preferred over false signals</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
