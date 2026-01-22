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
import { BacktestStats } from "@/components/BacktestStats";
import { TechnicalIndicators } from "@/components/TechnicalIndicators";
import { NotificationBanner, NotificationButton } from "@/components/NotificationBanner";
import type { TradingPair, ConsensusResult, MarketMetrics } from "@shared/schema";
import logoImage from "@assets/IMAGE_2026-01-22_19:24:15_1769090056092.jpg";

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
  signal?: {
    id: string;
    pair: TradingPair;
    signal: 'BUY' | 'SELL' | 'NO_TRADE';
    confidence: number;
    riskGrade: string;
    exitWindowMinutes: number;
  };
  metrics?: {
    rsi?: number;
    rsiSignal?: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
    macdTrend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    macdHistogram?: number;
    bollingerPosition?: 'ABOVE_UPPER' | 'ABOVE_MIDDLE' | 'BELOW_MIDDLE' | 'BELOW_LOWER';
    sma20?: number;
    sma50?: number;
    momentum?: number;
    overallTechnicalSignal?: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
    technicalStrength?: number;
  };
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
            <img src={logoImage} alt="TradeX AI" className="h-10 w-auto" />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12121a] border border-white/5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-400">Capital:</span>
              <span className="text-sm font-medium text-white">${capital.toLocaleString()}</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-400 font-medium">FREE</span>
            </div>
            
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[#12121a] to-[#0f1a1a] border border-white/5">
          <div className="flex flex-wrap items-center gap-4">
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

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-300">Crypto Futures</h2>
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
          
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {displayedPairs?.map((price) => {
              const symbol = price.pair.split('-')[0];
              return (
                <button
                  key={price.pair}
                  onClick={() => {
                    setSelectedPair(price.pair);
                    setAnalysis(null);
                  }}
                  className={`p-2 rounded-lg border transition-all text-left ${
                    selectedPair === price.pair
                      ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30'
                      : 'bg-[#12121a] border-white/5 hover:border-white/10'
                  }`}
                  data-testid={`button-select-${price.pair.toLowerCase()}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <CryptoIcon symbol={symbol} />
                    <div>
                      <div className="font-medium text-xs">{symbol}</div>
                      <div className={`text-[10px] flex items-center ${price.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {price.change24h >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                        {Math.abs(price.change24h).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs font-semibold">
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
              className="w-full mt-2 text-gray-400 hover:text-white text-xs"
            >
              {showAllCoins ? (
                <>Show Less <ChevronUp className="w-3 h-3 ml-1" /></>
              ) : (
                <>Show All {data.prices.length} Coins <ChevronDown className="w-3 h-3 ml-1" /></>
              )}
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-[#12121a] border-white/5 overflow-hidden">
              <CardContent className="p-0">
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CryptoIcon symbol={selectedPair.split('-')[0]} />
                    <span className="font-medium text-sm">{selectedPair}</span>
                    <span className="text-xs text-gray-500">Perpetual</span>
                    {analysis && analysis.signal !== 'SKIP' && (
                      <div className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                        analysis.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        Entry: ${analysis.entryPrice.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">Live</div>
                    <CandleTimer />
                  </div>
                </div>
                <div className="h-[500px]">
                  <TradingViewChart 
                    pair={selectedPair} 
                    entryPrice={analysis?.entryPrice}
                    signal={analysis?.signal}
                    stopLoss={analysis?.tradeRecommendation?.stopLoss}
                    takeProfit={analysis?.tradeRecommendation?.takeProfit}
                  />
                </div>
              </CardContent>
            </Card>

            {!analysis && !isAnalyzing && (
              <Card className="bg-gradient-to-br from-[#0f1a1f] to-[#12121a] border-cyan-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">AI Signal Analysis</h3>
                        <p className="text-gray-400 text-xs">
                          Get entry, stop-loss, and take-profit based on ${capital.toLocaleString()} capital
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex gap-2 text-xs">
                        <span className="px-2 py-1 rounded bg-[#1a1a2e] text-blue-400 border border-blue-500/20">
                          Technical
                        </span>
                        <span className="px-2 py-1 rounded bg-[#1a1a2e] text-cyan-400 border border-cyan-500/20">
                          Volume
                        </span>
                        <span className="px-2 py-1 rounded bg-[#1a1a2e] text-purple-400 border border-purple-500/20">
                          Risk
                        </span>
                      </div>
                      <Button
                        size="default"
                        onClick={handleAnalyze}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl px-6 font-medium"
                        data-testid="button-analyze"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Analyze Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && (
              <Card className="bg-[#12121a] border-white/5">
                <CardContent className="p-6 text-center">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 text-cyan-400 animate-spin" />
                  <h3 className="text-base font-semibold mb-2">Analyzing Market...</h3>
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
                  <div className={`p-4 ${
                    analysis.signal === 'BUY' ? 'bg-emerald-500/10' :
                    analysis.signal === 'SELL' ? 'bg-red-500/10' :
                    'bg-yellow-500/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${
                          analysis.signal === 'BUY' ? 'text-emerald-400' :
                          analysis.signal === 'SELL' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {analysis.signal}
                        </div>
                        <div className="text-lg font-bold">{Math.round(analysis.confidence)}%</div>
                      </div>
                      
                      {analysis.signal !== 'SKIP' && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0a0a0f]/50">
                            <Timer className="w-3 h-3 text-blue-400" />
                            <span className="font-medium">{analysis.holdTime}m</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0a0a0f]/50">
                            <span className="text-gray-400">Entry:</span>
                            <span className="font-mono font-medium">${analysis.entryPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {analysis.signal !== 'SKIP' && (
                        <Button
                          onClick={() => takeTradeMutation.mutate()}
                          disabled={takeTradeMutation.isPending}
                          size="sm"
                          className={`rounded-lg ${
                            analysis.signal === 'BUY' 
                              ? 'bg-emerald-500 hover:bg-emerald-600' 
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                          data-testid="button-take-trade"
                        >
                          {takeTradeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                          )}
                          Take Trade
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAnalysis(null)}
                        className="rounded-lg border-white/10 text-gray-300 hover:bg-white/5"
                      >
                        New Analysis
                      </Button>
                    </div>
                  </div>

                  {analysis.tradeRecommendation && analysis.signal !== 'SKIP' && (
                    <div className="p-3 border-b border-white/5 bg-[#0a0a0f]/50">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="p-2 rounded-lg bg-[#12121a] border border-white/5 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 mb-0.5">
                            <DollarSign className="w-3 h-3" />
                            Trade Size
                          </div>
                          <div className="font-mono font-semibold text-cyan-400 text-sm">
                            ${analysis.tradeRecommendation.tradeSize.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#12121a] border border-red-500/20 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 mb-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Stop Loss
                          </div>
                          <div className="font-mono font-semibold text-red-400 text-sm">
                            ${analysis.tradeRecommendation.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#12121a] border border-emerald-500/20 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 mb-0.5">
                            <Target className="w-3 h-3" />
                            Take Profit
                          </div>
                          <div className="font-mono font-semibold text-emerald-400 text-sm">
                            ${analysis.tradeRecommendation.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#12121a] border border-white/5 text-center">
                          <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 mb-0.5">
                            <Shield className="w-3 h-3" />
                            Risk:Reward
                          </div>
                          <div className="font-mono font-semibold text-white text-sm">
                            {analysis.tradeRecommendation.riskRewardRatio}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3">
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                      {analysis.reasoning}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="bg-[#12121a] border-white/5">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">Your Trades</h3>
                  <History className="w-4 h-4 text-gray-500" />
                </div>
                <TradeHistory />
              </CardContent>
            </Card>

            <Card className="bg-[#12121a] border-white/5">
              <CardContent className="p-3">
                <h3 className="text-sm font-medium text-gray-300 mb-2">How It Works</h3>
                <ol className="space-y-1.5 text-[11px] text-gray-400">
                  <li className="flex gap-2">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] font-medium">1</span>
                    <span>Set your capital above</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] font-medium">2</span>
                    <span>Select any crypto pair</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] font-medium">3</span>
                    <span>Click "Analyze Now"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] font-medium">4</span>
                    <span>Follow exact SL/TP levels</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <BacktestStats />

            <TechnicalIndicators pair={selectedPair} metrics={data?.signal ? {
              pair: selectedPair,
              volumeDelta: 0,
              orderBookImbalance: 0,
              volatility: 0,
              atr: 0,
              fundingRate: 0,
              openInterest: 0,
              rsi: data?.metrics?.rsi,
              rsiSignal: data?.metrics?.rsiSignal,
              macdTrend: data?.metrics?.macdTrend,
              macdHistogram: data?.metrics?.macdHistogram,
              bollingerPosition: data?.metrics?.bollingerPosition,
              sma20: data?.metrics?.sma20,
              sma50: data?.metrics?.sma50,
              momentum: data?.metrics?.momentum,
              overallTechnicalSignal: data?.metrics?.overallTechnicalSignal,
              technicalStrength: data?.metrics?.technicalStrength,
            } as MarketMetrics : undefined} />

            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/10">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-medium text-emerald-400 mb-1">Capital Protection</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Max 2% risk per trade. Follow exact stop-loss levels.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-medium text-amber-400 mb-1">Trade at Your Own Risk</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Crypto trading is risky. Never trade more than you can afford to lose.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <NotificationBanner signal={data?.signal} pair={selectedPair} />

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
                  <li>Understanding signals</li>
                  <li>Setting stop-loss/take-profit</li>
                  <li>Capital management tips</li>
                  <li>Risk management strategies</li>
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
      <div className="text-center py-4 text-gray-500 text-xs">
        <History className="w-6 h-6 mx-auto mb-2 opacity-50" />
        No trades yet
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-1.5 rounded-lg bg-[#0a0a0f]">
          <div className="text-sm font-semibold">{stats.totalTrades}</div>
          <div className="text-[10px] text-gray-500">Trades</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-[#0a0a0f]">
          <div className="text-sm font-semibold text-cyan-400">{stats.winRate}%</div>
          <div className="text-[10px] text-gray-500">Win Rate</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-[#0a0a0f]">
          <div className={`text-sm font-semibold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL?.toFixed(1)}%
          </div>
          <div className="text-[10px] text-gray-500">P/L</div>
        </div>
      </div>
      
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {predictions.slice(0, 4).map((pred: any) => (
          <div 
            key={pred.id} 
            className="flex items-center justify-between p-1.5 rounded-lg bg-[#0a0a0f] text-[11px]"
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded flex items-center justify-center ${
                pred.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {pred.signal === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              </div>
              <span className="font-medium">{pred.pair?.split('-')[0]}</span>
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
