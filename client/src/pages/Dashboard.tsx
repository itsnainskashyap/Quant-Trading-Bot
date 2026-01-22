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
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { 
  TradingSignal, 
  PriceData, 
  MarketMetrics as MarketMetricsType,
  SignalHistory as SignalHistoryType,
  TradingPair 
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

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard', selectedPair],
    refetchInterval: 5000,
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
            
            <SignalCard 
              signal={data?.signal ?? null} 
              isLoading={isRefetching}
            />
            
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
          </div>
        </div>
      </main>
    </div>
  );
}
