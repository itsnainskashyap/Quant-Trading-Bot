import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { PriceDisplay } from "@/components/PriceDisplay";
import { SignalCard } from "@/components/SignalCard";
import { MarketMetrics } from "@/components/MarketMetrics";
import { ModelScores } from "@/components/ModelScores";
import { LLMExplanation } from "@/components/LLMExplanation";
import { CapitalProtection } from "@/components/CapitalProtection";
import { SignalHistory } from "@/components/SignalHistory";
import { Disclaimer } from "@/components/Disclaimer";
import { AIConsensus } from "@/components/AIConsensus";
import { TradingViewChart } from "@/components/TradingViewChart";
import { PredictionHistory } from "@/components/PredictionHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { 
  TradingSignal, 
  PriceData, 
  MarketMetrics as MarketMetricsType,
  SignalHistory as SignalHistoryType,
  TradingPair,
  ConsensusResult
} from "@shared/schema";

interface DashboardData {
  prices: PriceData[];
  signal: TradingSignal | null;
  metrics: MarketMetricsType;
  history: SignalHistoryType[];
  protection: {
    tradesRemaining: number;
    maxTrades: number;
    drawdownPercent: number;
    isVolatilityHigh: boolean;
    isNewsPause: boolean;
  };
  isDataFeedHealthy: boolean;
}

export default function Dashboard() {
  const [selectedPair, setSelectedPair] = useState<TradingPair>("BTC-USDT");
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [explanation, setExplanation] = useState<{ reasoning: string; warnings: string[] }>({
    reasoning: "",
    warnings: [],
  });
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
  const [isConsensusLoading, setIsConsensusLoading] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard', selectedPair],
    refetchInterval: 5000,
  });

  const takeTradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/predictions/take', { pair: selectedPair });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Recorded",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record trade",
        variant: "destructive",
      });
    },
  });

  const explainMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/explain', { pair: selectedPair });
      return response.json();
    },
    onSuccess: (result) => {
      setExplanation({
        reasoning: result.reasoning,
        warnings: result.warnings || [],
      });
      setIsExplanationLoading(false);
    },
    onError: () => {
      setExplanation({
        reasoning: "Unable to generate explanation at this time. Please try again.",
        warnings: ["LLM service temporarily unavailable"],
      });
      setIsExplanationLoading(false);
    },
  });

  const consensusMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/consensus', { pair: selectedPair });
      return response.json();
    },
    onSuccess: (result) => {
      setConsensus(result.consensus);
      setExplanation({
        reasoning: result.explanation,
        warnings: result.consensus.warnings || [],
      });
      setIsConsensusLoading(false);
    },
    onError: () => {
      setConsensus(null);
      setIsConsensusLoading(false);
    },
  });

  const handleMultiAIAnalysis = useCallback(() => {
    setIsConsensusLoading(true);
    consensusMutation.mutate();
  }, [consensusMutation]);

  useEffect(() => {
    if (data?.signal) {
      setExplanation({
        reasoning: data.signal.reasoning,
        warnings: data.signal.warnings,
      });
    }
  }, [data?.signal]);

  const handleRefreshExplanation = useCallback(() => {
    setIsExplanationLoading(true);
    explainMutation.mutate();
  }, [explainMutation]);

  const selectedPrice = data?.prices.find(p => p.pair === selectedPair);
  const selectedMetrics = data?.metrics;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header isDataFeedHealthy={true} />
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
              <Skeleton className="h-80" />
              <Skeleton className="h-40" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard">
      <Header isDataFeedHealthy={data?.isDataFeedHealthy ?? true} />
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Market Overview</h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => refetch()}
                disabled={isRefetching}
                data-testid="button-refresh-data"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.prices.map((price) => (
                <PriceDisplay
                  key={price.pair}
                  data={price}
                  isSelected={price.pair === selectedPair}
                  onClick={() => setSelectedPair(price.pair)}
                />
              ))}
            </div>
            
            <TradingViewChart pair={selectedPair} />
            
            <SignalCard 
              signal={data?.signal ?? null} 
              isLoading={isRefetching}
            />
            
            {data?.signal && data.signal.signal !== "NO_TRADE" && (
              <Card className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Execute This Trade</h3>
                    <p className="text-xs text-muted-foreground">
                      Record this signal and track profit/loss after exit window
                    </p>
                  </div>
                  <Button
                    onClick={() => takeTradeMutation.mutate()}
                    disabled={takeTradeMutation.isPending}
                    className={`${data.signal.signal === 'BUY' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}`}
                    data-testid="button-take-trade"
                  >
                    <TrendingUp className={`w-4 h-4 mr-2 ${takeTradeMutation.isPending ? 'animate-spin' : ''}`} />
                    {takeTradeMutation.isPending ? 'Recording...' : `Take ${data.signal.signal} Trade`}
                  </Button>
                </div>
              </Card>
            )}
            
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium">AI-Powered Analysis</h3>
                  <p className="text-xs text-muted-foreground">
                    Get consensus from 3 world-class AI providers
                  </p>
                </div>
                <Button
                  onClick={handleMultiAIAnalysis}
                  disabled={isConsensusLoading}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  data-testid="button-multi-ai-analysis"
                >
                  <Sparkles className={`w-4 h-4 mr-2 ${isConsensusLoading ? 'animate-spin' : ''}`} />
                  {isConsensusLoading ? 'Analyzing...' : 'Multi-AI Analysis'}
                </Button>
              </div>
              
              <AIConsensus consensus={consensus} isLoading={isConsensusLoading} />
            </Card>
            
            <LLMExplanation
              reasoning={explanation.reasoning || "Analyzing market conditions..."}
              warnings={explanation.warnings}
              isLoading={isExplanationLoading}
              onRefresh={handleRefreshExplanation}
            />
            
            <Disclaimer />
          </div>
          
          <div className="space-y-6">
            {selectedMetrics && data?.signal && (
              <MarketMetrics 
                metrics={selectedMetrics} 
                regime={data.signal.marketRegime}
              />
            )}
            
            <ModelScores scores={data?.signal?.modelScores || []} />
            
            {data?.protection && (
              <CapitalProtection
                tradesRemaining={data.protection.tradesRemaining}
                maxTrades={data.protection.maxTrades}
                drawdownPercent={data.protection.drawdownPercent}
                isVolatilityHigh={data.protection.isVolatilityHigh}
                isNewsPause={data.protection.isNewsPause}
              />
            )}
            
            {data?.history && (
              <SignalHistory history={data.history} />
            )}
            
            <PredictionHistory />
          </div>
        </div>
      </main>
    </div>
  );
}
