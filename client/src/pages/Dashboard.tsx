import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown,
  RefreshCw, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2,
  LogOut,
  User,
  History
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TradingViewChart } from "@/components/TradingViewChart";
import type { TradingPair, ConsensusResult } from "@shared/schema";

const BitcoinIcon = () => (
  <svg viewBox="0 0 32 32" className="w-8 h-8">
    <circle cx="16" cy="16" r="16" fill="#F7931A"/>
    <path fill="#FFFFFF" d="M22.5 14.2c.3-2-1.2-3.1-3.4-3.8l.7-2.8-1.7-.4-.7 2.8c-.4-.1-.9-.2-1.4-.4l.7-2.8-1.7-.4-.7 2.8c-.4-.1-.7-.2-1-.2l-2.4-.6-.4 1.8s1.3.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1-.1 0-.1 0-.2 0l-1.1 4.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.3.6c.4.1.8.2 1.2.3l-.7 2.9 1.7.4.7-2.8c.5.1.9.2 1.4.4l-.7 2.8 1.7.4.7-2.9c3 .6 5.2.3 6.1-2.4.8-2.1-.0-3.4-1.6-4.2 1.1-.3 2-1.1 2.2-2.7zm-4 5.5c-.5 2.1-4.2 1-5.4.7l1-3.9c1.2.3 5 .9 4.4 3.2zm.6-5.6c-.5 1.9-3.5.9-4.5.7l.9-3.5c1 .2 4.1.7 3.6 2.8z"/>
  </svg>
);

const EthereumIcon = () => (
  <svg viewBox="0 0 32 32" className="w-8 h-8">
    <circle cx="16" cy="16" r="16" fill="#627EEA"/>
    <path fill="#FFFFFF" fillOpacity="0.6" d="M16 4v8.9l7.5 3.3z"/>
    <path fill="#FFFFFF" d="M16 4L8.5 16.2l7.5-3.3z"/>
    <path fill="#FFFFFF" fillOpacity="0.6" d="M16 21.9v6.1l7.5-10.4z"/>
    <path fill="#FFFFFF" d="M16 28v-6.1l-7.5-4.3z"/>
    <path fill="#FFFFFF" fillOpacity="0.2" d="M16 20.4l7.5-4.2-7.5-3.3z"/>
    <path fill="#FFFFFF" fillOpacity="0.6" d="M8.5 16.2l7.5 4.2v-7.5z"/>
  </svg>
);

interface PriceData {
  pair: TradingPair;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: string;
}

interface DashboardData {
  prices: PriceData[];
  isDataFeedHealthy: boolean;
}

interface AnalysisResult {
  signal: 'BUY' | 'SELL' | 'SKIP';
  confidence: number;
  reasoning: string;
  holdTime: number;
  entryPrice: number;
  consensus?: ConsensusResult;
}

interface SubscriptionData {
  plan: string;
  remaining: number;
  dailyLimit: number;
  isEarlyAdopter: boolean;
}

export default function Dashboard() {
  const [selectedPair, setSelectedPair] = useState<TradingPair>("BTC-USDT");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard', selectedPair],
    refetchInterval: 10000,
  });

  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: ['/api/subscription'],
    enabled: !!user,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/consensus', { pair: selectedPair });
      return response.json();
    },
    onSuccess: (result) => {
      const consensus = result.consensus as ConsensusResult;
      setAnalysis({
        signal: consensus.consensusSignal === 'NO_TRADE' ? 'SKIP' : consensus.consensusSignal,
        confidence: consensus.consensusConfidence,
        reasoning: result.explanation,
        holdTime: 15,
        entryPrice: data?.prices.find(p => p.pair === selectedPair)?.price || 0,
        consensus,
      });
      setIsAnalyzing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze. Please try again.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    },
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
      setAnalysis(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record trade",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    analyzeMutation.mutate();
  };

  const selectedPrice = data?.prices.find(p => p.pair === selectedPair);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-6xl mx-auto p-6">
          <Skeleton className="h-16 mb-6 bg-white/5" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-24 bg-white/5" />
              <Skeleton className="h-80 bg-white/5" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 bg-white/5" />
              <Skeleton className="h-32 bg-white/5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" data-testid="dashboard">
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">TradeX</span>
          </div>
          
          <div className="flex items-center gap-4">
            {subscription && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <div className={`w-2 h-2 rounded-full ${subscription.plan === 'pro' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                <span className="text-xs text-gray-300">
                  {subscription.plan === 'pro' ? 'Pro' : `${subscription.remaining}/${subscription.dailyLimit} signals`}
                </span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-white/5"
              asChild
            >
              <a href="/profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </a>
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-white/5"
              asChild
            >
              <a href="/api/logout">
                <LogOut className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-300">Select Coin</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-gray-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {data?.prices.map((price) => (
              <button
                key={price.pair}
                onClick={() => {
                  setSelectedPair(price.pair);
                  setAnalysis(null);
                }}
                className={`p-4 rounded-xl border transition-all text-left ${
                  selectedPair === price.pair
                    ? 'bg-blue-500/10 border-blue-500/50'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
                data-testid={`button-select-${price.pair.toLowerCase()}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {price.pair === 'BTC-USDT' ? <BitcoinIcon /> : <EthereumIcon />}
                    <div>
                      <div className="font-semibold">{price.pair.split('-')[0]}</div>
                      <div className="text-xs text-gray-500">{price.pair}</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${price.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {price.change24h >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(price.change24h).toFixed(2)}%
                  </div>
                </div>
                <div className="font-mono text-2xl font-bold">
                  ${price.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#12121a] border-white/10 overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedPair === 'BTC-USDT' ? <BitcoinIcon /> : <EthereumIcon />}
                    <span className="font-semibold">{selectedPair} Chart</span>
                  </div>
                  <div className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs">Live</div>
                </div>
                <div className="h-[400px]">
                  <TradingViewChart pair={selectedPair} />
                </div>
              </CardContent>
            </Card>

            {!analysis && !isAnalyzing && (
              <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                  <h3 className="text-xl font-semibold mb-2">Get AI Analysis</h3>
                  <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                    Our AI will analyze the {selectedPair} chart and tell you whether to BUY, SELL, or SKIP this trade.
                  </p>
                  <Button
                    size="lg"
                    onClick={handleAnalyze}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-full px-8"
                    data-testid="button-analyze"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Analyze Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && (
              <Card className="bg-[#12121a] border-white/10">
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Analyzing Chart...</h3>
                  <p className="text-gray-400 text-sm">AI is reading market patterns</p>
                </CardContent>
              </Card>
            )}

            {analysis && (
              <Card className="bg-[#12121a] border-white/10 overflow-hidden">
                <CardContent className="p-0">
                  <div className={`p-6 ${
                    analysis.signal === 'BUY' ? 'bg-emerald-500/10' :
                    analysis.signal === 'SELL' ? 'bg-red-500/10' :
                    'bg-yellow-500/10'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">AI Recommendation</div>
                        <div className={`text-4xl font-bold ${
                          analysis.signal === 'BUY' ? 'text-emerald-400' :
                          analysis.signal === 'SELL' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {analysis.signal}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400 mb-1">Confidence</div>
                        <div className="text-3xl font-bold">{Math.round(analysis.confidence)}%</div>
                      </div>
                    </div>
                    
                    {analysis.signal !== 'SKIP' && (
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Hold for {analysis.holdTime} minutes
                        </div>
                        <div>
                          Entry: ${analysis.entryPrice.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <h4 className="text-sm font-semibold mb-3 text-gray-300">AI Analysis</h4>
                    <p className="text-sm text-gray-400 leading-relaxed mb-6">
                      {analysis.reasoning}
                    </p>
                    
                    <div className="flex gap-3">
                      {analysis.signal !== 'SKIP' && (
                        <Button
                          onClick={() => takeTradeMutation.mutate()}
                          disabled={takeTradeMutation.isPending}
                          className={`flex-1 rounded-full ${
                            analysis.signal === 'BUY' 
                              ? 'bg-emerald-500 hover:bg-emerald-600' 
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                          data-testid="button-take-trade"
                        >
                          {takeTradeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <TrendingUp className="w-4 h-4 mr-2" />
                          )}
                          Take {analysis.signal} Trade
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => setAnalysis(null)}
                        className="rounded-full border-white/20 text-gray-300 hover:bg-white/5"
                      >
                        New Analysis
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {selectedPrice && (
              <Card className="bg-[#12121a] border-white/10">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4">Market Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">24h High</span>
                      <span className="text-sm font-mono text-emerald-400">
                        ${selectedPrice.high24h.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">24h Low</span>
                      <span className="text-sm font-mono text-red-400">
                        ${selectedPrice.low24h.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">24h Volume</span>
                      <span className="text-sm font-mono">{selectedPrice.volume}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">24h Change</span>
                      <span className={`text-sm font-mono ${selectedPrice.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {selectedPrice.change24h >= 0 ? '+' : ''}{selectedPrice.change24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#12121a] border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-400">Your Trades</h3>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 px-2" asChild>
                    <a href="/profile">
                      <History className="w-4 h-4 mr-1" />
                      View All
                    </a>
                  </Button>
                </div>
                <TradeHistory />
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-white/10">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">How to Trade</h3>
                <ol className="space-y-2 text-sm text-gray-500">
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-semibold">1.</span>
                    Select Bitcoin or Ethereum above
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-semibold">2.</span>
                    Click "Analyze Now" for AI signal
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-semibold">3.</span>
                    Follow the recommendation or skip
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-semibold">4.</span>
                    Track your results in Your Trades
                  </li>
                </ol>
              </CardContent>
            </Card>

            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-xs text-yellow-500/80 leading-relaxed">
                <strong>Disclaimer:</strong> This is for educational purposes only. 
                Not financial advice. Trade at your own risk.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function TradeHistory() {
  const { data, isLoading } = useQuery<{ predictions: any[]; stats: any }>({
    queryKey: ['/api/predictions'],
  });

  if (isLoading) {
    return <Skeleton className="h-24 bg-white/5" />;
  }

  if (!data?.predictions || data.predictions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        No trades yet. Get your first AI analysis above!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.predictions.slice(0, 3).map((pred: any) => (
        <div 
          key={pred.id} 
          className="flex items-center justify-between p-3 rounded-lg bg-white/5"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              pred.signal === 'BUY' ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              {pred.signal === 'BUY' ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium">{pred.pair}</div>
              <div className="text-xs text-gray-500">{pred.signal}</div>
            </div>
          </div>
          <div className="text-right">
            {pred.outcome === 'PENDING' ? (
              <div className="text-xs text-yellow-400">Pending</div>
            ) : pred.profitLoss !== null ? (
              <div className={`text-sm font-mono ${pred.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pred.profitLoss >= 0 ? '+' : ''}{pred.profitLoss.toFixed(2)}%
              </div>
            ) : (
              <div className="text-xs text-gray-500">{pred.outcome}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
