import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown,
  RefreshCw, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2,
  LogOut,
  User,
  History,
  Timer,
  BarChart3,
  Activity,
  Target,
  Shield,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  X,
  Send,
  Wallet,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TradingViewChart } from "@/components/TradingViewChart";
import type { TradingPair, ConsensusResult } from "@shared/schema";

const CRYPTO_ICONS: Record<string, { color: string; symbol: string }> = {
  'BTC': { color: '#F7931A', symbol: '₿' },
  'ETH': { color: '#627EEA', symbol: 'Ξ' },
  'SOL': { color: '#9945FF', symbol: 'S' },
  'XRP': { color: '#23292F', symbol: 'X' },
  'DOGE': { color: '#C3A634', symbol: 'Ð' },
  'BNB': { color: '#F3BA2F', symbol: 'B' },
  'ADA': { color: '#0033AD', symbol: 'A' },
  'AVAX': { color: '#E84142', symbol: 'A' },
  'DOT': { color: '#E6007A', symbol: 'D' },
  'MATIC': { color: '#8247E5', symbol: 'M' },
  'LINK': { color: '#2A5ADA', symbol: 'L' },
  'LTC': { color: '#BFBBBB', symbol: 'Ł' },
  'SHIB': { color: '#FFA409', symbol: 'S' },
  'ATOM': { color: '#2E3148', symbol: 'A' },
  'UNI': { color: '#FF007A', symbol: 'U' },
};

function CryptoIcon({ symbol }: { symbol: string }) {
  const config = CRYPTO_ICONS[symbol] || { color: '#888', symbol: symbol[0] };
  return (
    <div 
      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
      style={{ backgroundColor: config.color }}
    >
      {config.symbol}
    </div>
  );
}

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

interface TradeRecommendation {
  tradeSize: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  potentialProfit: number;
  riskRewardRatio: string;
}

interface AnalysisResult {
  signal: 'BUY' | 'SELL' | 'SKIP';
  confidence: number;
  reasoning: string;
  holdTime: number;
  entryPrice: number;
  consensus?: ConsensusResult;
  technicalAnalysis?: {
    trend: string;
    momentum: string;
  };
  sentimentAnalysis?: {
    buyerStrength: number;
    sellerStrength: number;
    dominantSide: string;
    psychologyNote: string;
  };
  tradeRecommendation?: TradeRecommendation;
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
  const [capital, setCapital] = useState<number>(() => {
    const saved = localStorage.getItem('userCapital');
    return saved ? Number(saved) : 10000;
  });
  const [showAllCoins, setShowAllCoins] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);
  const [helpMessage, setHelpMessage] = useState("");
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    localStorage.setItem('userCapital', capital.toString());
  }, [capital]);

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
      const response = await apiRequest('POST', '/api/consensus', { pair: selectedPair, capital });
      return response.json();
    },
    onSuccess: (result) => {
      const consensus = result.consensus as ConsensusResult;
      const entryPrice = data?.prices.find(p => p.pair === selectedPair)?.price || 0;
      const holdDuration = (consensus as any).holdDuration || 5;
      
      const riskPercent = 0.02;
      const rewardPercent = 0.03;
      const tradeSize = capital * 0.1;
      const stopLossPrice = consensus.consensusSignal === 'BUY' 
        ? entryPrice * (1 - riskPercent) 
        : entryPrice * (1 + riskPercent);
      const takeProfitPrice = consensus.consensusSignal === 'BUY'
        ? entryPrice * (1 + rewardPercent)
        : entryPrice * (1 - rewardPercent);
      
      setAnalysis({
        signal: consensus.consensusSignal === 'NO_TRADE' ? 'SKIP' : consensus.consensusSignal,
        confidence: consensus.consensusConfidence,
        reasoning: result.explanation,
        holdTime: holdDuration,
        entryPrice,
        consensus,
        technicalAnalysis: (consensus as any).technicalAnalysis,
        sentimentAnalysis: (consensus as any).sentimentAnalysis,
        tradeRecommendation: {
          tradeSize,
          stopLoss: stopLossPrice,
          takeProfit: takeProfitPrice,
          riskAmount: tradeSize * riskPercent,
          potentialProfit: tradeSize * rewardPercent,
          riskRewardRatio: '1:1.5',
        }
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
      if (!analysis || analysis.signal === 'SKIP') return;
      const response = await apiRequest('POST', '/api/predictions/take', {
        pair: selectedPair,
        signal: analysis.signal,
        entryPrice: analysis.entryPrice,
        confidence: analysis.confidence,
        exitWindowMinutes: analysis.holdTime,
        capital,
        tradeSize: analysis.tradeRecommendation?.tradeSize,
        stopLoss: analysis.tradeRecommendation?.stopLoss,
        takeProfit: analysis.tradeRecommendation?.takeProfit,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trade Recorded",
        description: `Your ${analysis?.signal} trade has been recorded. Check back after ${analysis?.holdTime} minutes.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed",
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
  const displayedPairs = showAllCoins ? data?.prices : data?.prices?.slice(0, 6);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto p-6">
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
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans" data-testid="dashboard">
      <header className="border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-semibold tracking-tight">TradeX</span>
              <span className="text-lg font-light text-cyan-400 ml-1">AI</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12121a] border border-white/5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-400">Capital:</span>
              <span className="text-sm font-medium text-white">${capital.toLocaleString()}</span>
            </div>

            {subscription && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12121a] border border-white/5">
                <div className={`w-2 h-2 rounded-full ${subscription.plan === 'pro' ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
                <span className="text-xs text-gray-300">
                  {subscription.plan === 'pro' ? 'Pro' : `${subscription.remaining}/${subscription.dailyLimit}`}
                </span>
              </div>
            )}
            
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" asChild>
              <a href="/profile" data-testid="link-profile">
                <User className="w-4 h-4" />
              </a>
            </Button>
            
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" asChild>
              <a href="/api/logout" data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-[#12121a] to-[#0f1a1a] border border-white/5">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-medium text-gray-300">Your Capital</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <Input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value) || 0)}
                className="w-32 h-9 bg-[#0a0a0f] border-white/10 text-white font-mono"
                data-testid="input-capital"
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Risk per trade: <span className="text-yellow-400">2%</span></span>
              <span>Max trade size: <span className="text-cyan-400">10%</span></span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-gray-300">Crypto Futures</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-gray-400 hover:text-white text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {displayedPairs?.map((price) => {
              const symbol = price.pair.split('-')[0];
              return (
                <button
                  key={price.pair}
                  onClick={() => {
                    setSelectedPair(price.pair);
                    setAnalysis(null);
                  }}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    selectedPair === price.pair
                      ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30'
                      : 'bg-[#12121a] border-white/5 hover:border-white/10'
                  }`}
                  data-testid={`button-select-${price.pair.toLowerCase()}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CryptoIcon symbol={symbol} />
                    <div>
                      <div className="font-medium text-sm">{symbol}</div>
                      <div className={`text-xs flex items-center gap-0.5 ${price.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {price.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(price.change24h).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-base font-semibold">
                    ${price.price < 1 ? price.price.toFixed(6) : price.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </button>
              );
            })}
          </div>
          
          {data?.prices && data.prices.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllCoins(!showAllCoins)}
              className="w-full mt-3 text-gray-400 hover:text-white text-xs"
            >
              {showAllCoins ? (
                <>Show Less <ChevronUp className="w-3 h-3 ml-1" /></>
              ) : (
                <>Show All {data.prices.length} Coins <ChevronDown className="w-3 h-3 ml-1" /></>
              )}
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#12121a] border-white/5 overflow-hidden">
              <CardContent className="p-0">
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CryptoIcon symbol={selectedPair.split('-')[0]} />
                    <span className="font-medium text-sm">{selectedPair}</span>
                    <span className="text-xs text-gray-500">Perpetual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">Live</div>
                    <CandleTimer />
                  </div>
                </div>
                <div className="h-[350px]">
                  <TradingViewChart pair={selectedPair} />
                </div>
              </CardContent>
            </Card>

            {!analysis && !isAnalyzing && (
              <Card className="bg-gradient-to-br from-[#0f1a1f] to-[#12121a] border-cyan-500/20">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">AI Signal Analysis</h3>
                  <p className="text-gray-400 text-sm mb-4 max-w-md mx-auto">
                    Get comprehensive analysis with entry, stop-loss, and take-profit based on your ${capital.toLocaleString()} capital.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-5 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-[#1a1a2e] text-blue-400 border border-blue-500/20">
                      <BarChart3 className="w-3 h-3 inline mr-1" />Technical
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#1a1a2e] text-cyan-400 border border-cyan-500/20">
                      <Activity className="w-3 h-3 inline mr-1" />Volume Flow
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#1a1a2e] text-purple-400 border border-purple-500/20">
                      <Target className="w-3 h-3 inline mr-1" />Risk Management
                    </span>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleAnalyze}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl px-8 font-medium"
                    data-testid="button-analyze"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Analyze Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && (
              <Card className="bg-[#12121a] border-white/5">
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-cyan-400 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Analyzing Market...</h3>
                  <p className="text-gray-400 text-sm mb-4">3 AI models working simultaneously</p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 animate-pulse">OpenAI GPT-5.1</span>
                    <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 animate-pulse">Claude</span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 animate-pulse">Gemini</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysis && (
              <Card className="bg-[#12121a] border-white/5 overflow-hidden">
                <CardContent className="p-0">
                  <div className={`p-5 ${
                    analysis.signal === 'BUY' ? 'bg-emerald-500/10' :
                    analysis.signal === 'SELL' ? 'bg-red-500/10' :
                    'bg-yellow-500/10'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Signal</div>
                        <div className={`text-3xl font-bold tracking-tight ${
                          analysis.signal === 'BUY' ? 'text-emerald-400' :
                          analysis.signal === 'SELL' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {analysis.signal}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Confidence</div>
                        <div className="text-2xl font-bold">{Math.round(analysis.confidence)}%</div>
                      </div>
                    </div>
                    
                    {analysis.signal !== 'SKIP' && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0a0a0f]/50">
                          <Timer className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-gray-400">Hold:</span>
                          <span className="font-medium">{analysis.holdTime} min</span>
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0a0a0f]/50">
                          <span className="text-gray-400">Entry:</span>
                          <span className="font-mono font-medium">${analysis.entryPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {analysis.tradeRecommendation && analysis.signal !== 'SKIP' && (
                    <div className="p-4 border-b border-white/5 bg-[#0a0a0f]/50">
                      <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-3">AI Trade Plan (Based on ${capital.toLocaleString()} Capital)</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-[#12121a] border border-white/5">
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <DollarSign className="w-3 h-3" />
                            Trade Size
                          </div>
                          <div className="font-mono font-semibold text-cyan-400">
                            ${analysis.tradeRecommendation.tradeSize.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">10% of capital</div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#12121a] border border-red-500/20">
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <AlertTriangle className="w-3 h-3" />
                            Stop Loss
                          </div>
                          <div className="font-mono font-semibold text-red-400">
                            ${analysis.tradeRecommendation.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500">-${analysis.tradeRecommendation.riskAmount.toFixed(0)} max loss</div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#12121a] border border-emerald-500/20">
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <Target className="w-3 h-3" />
                            Take Profit
                          </div>
                          <div className="font-mono font-semibold text-emerald-400">
                            ${analysis.tradeRecommendation.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500">+${analysis.tradeRecommendation.potentialProfit.toFixed(0)} profit</div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#12121a] border border-white/5">
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <Shield className="w-3 h-3" />
                            Risk:Reward
                          </div>
                          <div className="font-mono font-semibold text-white">
                            {analysis.tradeRecommendation.riskRewardRatio}
                          </div>
                          <div className="text-xs text-gray-500">Protected</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {analysis.technicalAnalysis && analysis.sentimentAnalysis && (
                    <div className="p-4 border-b border-white/5 grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-xl bg-[#0a0a0f]/50">
                        <BarChart3 className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                        <div className="text-xs text-gray-500 mb-0.5">Technical</div>
                        <div className={`text-sm font-medium ${
                          analysis.technicalAnalysis.trend === 'BULLISH' ? 'text-emerald-400' :
                          analysis.technicalAnalysis.trend === 'BEARISH' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {analysis.technicalAnalysis.trend}
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-[#0a0a0f]/50">
                        <Activity className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                        <div className="text-xs text-gray-500 mb-0.5">Order Flow</div>
                        <div className={`text-sm font-medium ${
                          analysis.sentimentAnalysis.dominantSide === 'BUYERS' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {analysis.sentimentAnalysis.buyerStrength}% vs {analysis.sentimentAnalysis.sellerStrength}%
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-[#0a0a0f]/50">
                        <Target className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                        <div className="text-xs text-gray-500 mb-0.5">Sentiment</div>
                        <div className="text-xs text-gray-300">
                          {analysis.sentimentAnalysis.psychologyNote.slice(0, 30)}...
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5">
                    <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-2">Analysis Summary</h4>
                    <p className="text-sm text-gray-300 leading-relaxed mb-5 whitespace-pre-line">
                      {analysis.reasoning}
                    </p>
                    
                    <div className="flex gap-3">
                      {analysis.signal !== 'SKIP' && (
                        <Button
                          onClick={() => takeTradeMutation.mutate()}
                          disabled={takeTradeMutation.isPending}
                          className={`flex-1 rounded-xl ${
                            analysis.signal === 'BUY' 
                              ? 'bg-emerald-500 hover:bg-emerald-600' 
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                          data-testid="button-take-trade"
                        >
                          {takeTradeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          Take Trade
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => setAnalysis(null)}
                        className="rounded-xl border-white/10 text-gray-300 hover:bg-white/5"
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
            <Card className="bg-[#12121a] border-white/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">Your Trades</h3>
                  <History className="w-4 h-4 text-gray-500" />
                </div>
                <TradeHistory />
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-white/5">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">How It Works</h3>
                <ol className="space-y-2.5 text-xs text-gray-400">
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-medium">1</span>
                    <span>Set your trading capital above</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-medium">2</span>
                    <span>Select any crypto pair</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-medium">3</span>
                    <span>Click "Analyze Now" for AI signal</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-medium">4</span>
                    <span>Follow exact SL/TP levels</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-medium">5</span>
                    <span>Exit at recommended time</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/10">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-medium text-emerald-400 mb-1">Capital Protection</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    AI sets strict stop-loss at 2% risk. Max trade size 10%. Follow exact levels for protected trading.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
              <p className="text-xs text-yellow-500/80 leading-relaxed">
                <strong>Disclaimer:</strong> Trading involves risk. This is educational software using AI predictions. Past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </div>
      </main>

      <button
        onClick={() => setShowHelpChat(!showHelpChat)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-105 transition-transform z-50"
        data-testid="button-help-chat"
      >
        {showHelpChat ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {showHelpChat && (
        <div className="fixed bottom-24 right-6 w-80 bg-[#12121a] rounded-2xl border border-white/10 shadow-xl shadow-black/50 z-50 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
            <h4 className="font-medium">AI Trading Assistant</h4>
            <p className="text-xs text-gray-400">Ask me anything about trading</p>
          </div>
          <div className="h-64 p-4 overflow-y-auto">
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-cyan-500/10 text-gray-300">
                Hi! I can help you with:
                <ul className="mt-2 space-y-1 text-xs text-gray-400">
                  <li>• Understanding signals</li>
                  <li>• Setting stop-loss/take-profit</li>
                  <li>• Capital management tips</li>
                  <li>• Risk management strategies</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="p-3 border-t border-white/5">
            <div className="flex gap-2">
              <Input
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 h-9 bg-[#0a0a0f] border-white/10 text-sm"
                data-testid="input-help-message"
              />
              <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 h-9 px-3">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CandleTimer() {
  const [secondsLeft, setSecondsLeft] = useState(60 - new Date().getSeconds());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const seconds = 60 - now.getSeconds();
      setSecondsLeft(seconds === 60 ? 0 : seconds);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0a0a0f] text-xs">
      <div className={`w-1.5 h-1.5 rounded-full ${secondsLeft <= 5 ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
      <span className="text-gray-500">Candle:</span>
      <span className={`font-mono font-medium ${secondsLeft <= 5 ? 'text-emerald-400' : 'text-white'}`}>
        {secondsLeft}s
      </span>
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

  const predictions = data?.predictions || [];
  const stats = data?.stats || { totalTrades: 0, winRate: 0, totalPnL: 0 };

  if (predictions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        No trades yet
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-[#0a0a0f]">
          <div className="text-lg font-semibold">{stats.totalTrades}</div>
          <div className="text-xs text-gray-500">Trades</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-[#0a0a0f]">
          <div className="text-lg font-semibold text-cyan-400">{stats.winRate}%</div>
          <div className="text-xs text-gray-500">Win Rate</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-[#0a0a0f]">
          <div className={`text-lg font-semibold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL?.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">P/L</div>
        </div>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {predictions.slice(0, 5).map((pred: any) => (
          <div 
            key={pred.id} 
            className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0f] text-xs"
          >
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${
                pred.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {pred.signal === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              </div>
              <div>
                <div className="font-medium">{pred.pair}</div>
                <div className="text-gray-500">{new Date(pred.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className={`font-mono font-medium ${
              pred.pnlPercent > 0 ? 'text-emerald-400' : pred.pnlPercent < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {pred.pnlPercent !== null ? `${pred.pnlPercent >= 0 ? '+' : ''}${pred.pnlPercent.toFixed(2)}%` : 'Pending'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
