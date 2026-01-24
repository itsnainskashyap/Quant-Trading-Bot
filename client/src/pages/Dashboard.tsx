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
import { BrokerSettings } from "@/components/BrokerSettings";
import type { TradingPair, ConsensusResult, MarketMetrics } from "@shared/schema";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";

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

type TradeMode = 1 | 3 | 5 | 10;

const TRADE_MODES: { value: TradeMode; label: string; risk: string }[] = [
  { value: 1, label: '1 Min', risk: 'High' },
  { value: 3, label: '3 Min', risk: 'Medium' },
  { value: 5, label: '5 Min', risk: 'Low' },
  { value: 10, label: '10 Min', risk: 'Very Low' },
];

export default function Dashboard() {
  const [selectedPair, setSelectedPair] = useState<TradingPair>("BTC-USDT");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tradeMode, setTradeMode] = useState<TradeMode>(5);
  const [capital, setCapital] = useState<number>(() => {
    const saved = localStorage.getItem('userCapital');
    return saved ? Number(saved) : 10000;
  });
  const [showAllCoins, setShowAllCoins] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);
  const [helpMessage, setHelpMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    { role: 'assistant', content: "Hi! I can help you with understanding signals, stop-loss/take-profit strategies, and risk management. Ask me anything!" }
  ]);
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
      const response = await apiRequest('POST', '/api/consensus', { pair: selectedPair, capital, tradeMode });
      return response.json();
    },
    onSuccess: (result) => {
      const consensus = result.consensus as ConsensusResult;
      const entryPrice = data?.prices.find(p => p.pair === selectedPair)?.price || 0;
      const holdDuration = tradeMode;
      
      // Risk/reward based on trade mode - shorter timeframes = MUCH tighter targets for scalping
      // 1 min: 0.15% risk (very tight scalp), 3 min: 0.25%, 5 min: 0.4%, 10 min: 0.6%
      const riskPercent = tradeMode === 1 ? 0.0015 : tradeMode === 3 ? 0.0025 : tradeMode === 5 ? 0.004 : 0.006;
      const rewardPercent = riskPercent * 1.5;
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

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat', {
        message,
        pair: selectedPair,
        signal: analysis?.signal,
      });
      return response.json();
    },
    onSuccess: (data: { reply: string }) => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    },
    onError: () => {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that. Try asking about trading concepts!" }]);
    },
  });

  const handleSendMessage = () => {
    if (!helpMessage.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', content: helpMessage }]);
    chatMutation.mutate(helpMessage);
    setHelpMessage("");
  };

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
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[#0d0d14] border border-[#1a1a2e]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Capital</span>
              <Wallet className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-lg">$</span>
              <Input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value) || 0)}
                className="flex-1 h-10 bg-transparent border-0 border-b border-[#1a1a2e] rounded-none text-xl font-semibold text-white font-mono focus-visible:ring-0 focus-visible:border-cyan-500/50 px-0"
                data-testid="input-capital"
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
              <span>Risk: <span className="text-amber-400">{tradeMode === 1 ? '1%' : tradeMode === 3 ? '1.5%' : tradeMode === 5 ? '2%' : '2.5%'}</span></span>
              <span>Position: <span className="text-cyan-400">10%</span></span>
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-[#0d0d14] border border-[#1a1a2e]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Trade Duration</span>
              <Timer className="w-4 h-4 text-gray-600" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TRADE_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => {
                    setTradeMode(mode.value);
                    setAnalysis(null);
                  }}
                  className={`py-2.5 px-3 rounded-md text-center transition-all ${
                    tradeMode === mode.value
                      ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                      : 'bg-[#12121a] border border-[#1a1a2e] text-gray-400 hover:border-gray-600'
                  }`}
                  data-testid={`button-mode-${mode.value}min`}
                >
                  <div className="font-semibold text-sm">{mode.label}</div>
                  <div className={`text-[10px] mt-0.5 ${
                    mode.risk === 'High' ? 'text-red-400' :
                    mode.risk === 'Medium' ? 'text-amber-400' :
                    mode.risk === 'Low' ? 'text-emerald-400' : 'text-cyan-400'
                  }`}>{mode.risk}</div>
                </button>
              ))}
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
                    ${price.price != null ? (price.price < 1 ? price.price.toFixed(6) : price.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '---'}
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
            <Card className="bg-[#0d0d14] border-[#1a1a2e] overflow-hidden">
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b border-[#1a1a2e] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={selectedPair.split('-')[0]} />
                    <div>
                      <div className="font-semibold text-sm">{selectedPair}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Perpetual</div>
                    </div>
                    {analysis && analysis.signal !== 'SKIP' && (
                      <div className={`ml-2 px-2.5 py-1 rounded text-xs font-semibold ${
                        analysis.signal === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {analysis.signal} @ ${analysis.entryPrice.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#12121a] border border-[#1a1a2e]">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-gray-400 uppercase">Live</span>
                    </div>
                    <CandleTimer />
                  </div>
                </div>
                <div className="h-[300px] md:h-[500px]">
                  <TradingViewChart 
                    pair={selectedPair} 
                    entryPrice={analysis?.entryPrice}
                    signal={analysis?.signal}
                    stopLoss={analysis?.tradeRecommendation?.stopLoss}
                    takeProfit={analysis?.tradeRecommendation?.takeProfit}
                    tradeSize={analysis?.tradeRecommendation?.tradeSize}
                    riskAmount={analysis?.tradeRecommendation?.riskAmount}
                    potentialProfit={analysis?.tradeRecommendation?.potentialProfit}
                  />
                </div>
              </CardContent>
            </Card>

            {!analysis && !isAnalyzing && (
              <Card className="bg-[#0d0d14] border-[#1a1a2e]">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-1">Generate Signal</h3>
                      <p className="text-gray-500 text-xs">
                        {tradeMode} minute trade • ${capital.toLocaleString()} capital • {selectedPair}
                      </p>
                    </div>
                    <Button
                      size="default"
                      onClick={handleAnalyze}
                      className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                      data-testid="button-analyze"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && (
              <Card className="bg-[#0d0d14] border-[#1a1a2e] overflow-hidden">
                <CardContent className="p-6 relative">
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-purple-500/5 to-blue-500/3" 
                         style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative w-20 h-20 mb-4">
                      <div className="absolute inset-0 rounded-full border border-gray-700/50" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500/80 animate-spin" 
                           style={{ animationDuration: '1.2s' }} />
                      <div className="absolute inset-2 rounded-full border border-transparent border-t-purple-500/60 animate-spin" 
                           style={{ animationDuration: '1.8s', animationDirection: 'reverse' }} />
                      <div className="absolute inset-4 rounded-full border border-transparent border-t-cyan-500/40 animate-spin" 
                           style={{ animationDuration: '2.4s' }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-medium text-white mb-2">Analyzing {selectedPair}</h3>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] text-gray-500">GPT-4o</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                        <span className="text-[10px] text-gray-500">Claude</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
                        <span className="text-[10px] text-gray-500">Gemini</span>
                      </div>
                    </div>
                    
                    <div className="w-full max-w-xs">
                      <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full"
                             style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />
                      </div>
                      <p className="text-[10px] text-gray-600 text-center mt-2">{tradeMode} minute timeframe • Multi-AI consensus</p>
                    </div>
                  </div>
                </CardContent>
                <style>{`
                  @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                `}</style>
              </Card>
            )}

            {analysis && (
              <Card className="bg-[#0d0d14] border-[#1a1a2e] overflow-hidden">
                <CardContent className="p-0">
                  <div className={`p-4 border-l-4 ${
                    analysis.signal === 'BUY' ? 'border-l-emerald-500 bg-emerald-500/5' :
                    analysis.signal === 'SELL' ? 'border-l-red-500 bg-red-500/5' :
                    'border-l-amber-500 bg-amber-500/5'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`text-3xl font-bold tracking-tight ${
                          analysis.signal === 'BUY' ? 'text-emerald-400' :
                          analysis.signal === 'SELL' ? 'text-red-400' :
                          'text-amber-400'
                        }`}>
                          {analysis.signal === 'SKIP' ? 'NO TRADE' : analysis.signal}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 uppercase">Confidence</span>
                          <span className="text-lg font-bold font-mono">{Math.round(analysis.confidence)}%</span>
                        </div>
                      </div>
                      
                      {analysis.signal !== 'SKIP' && (
                        <div className="flex flex-wrap gap-3 text-xs">
                          <div className="flex flex-col items-center px-3 py-1.5 rounded bg-[#12121a] border border-[#1a1a2e]">
                            <span className="text-[10px] text-gray-500 uppercase">Duration</span>
                            <span className="font-mono font-semibold text-cyan-400">{analysis.holdTime}m</span>
                          </div>
                          <div className="flex flex-col items-center px-3 py-1.5 rounded bg-[#12121a] border border-[#1a1a2e]">
                            <span className="text-[10px] text-gray-500 uppercase">Entry</span>
                            <span className="font-mono font-semibold text-white">${analysis.entryPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {analysis.signal !== 'SKIP' && (
                        <Button
                          onClick={() => {
                            if (!user) {
                              toast({
                                title: "Login Required",
                                description: "Please log in with Replit to record trades",
                                variant: "destructive",
                              });
                              return;
                            }
                            takeTradeMutation.mutate();
                          }}
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
                    <div className="p-4 border-t border-[#1a1a2e] bg-[#0a0a0f]">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded bg-[#12121a] border border-[#1a1a2e]">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Position Size</div>
                          <div className="font-mono font-bold text-cyan-400 text-base">
                            ${analysis.tradeRecommendation.tradeSize.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 rounded bg-[#12121a] border-l-2 border-l-red-500 border border-[#1a1a2e]">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Stop Loss</div>
                          <div className="font-mono font-bold text-red-400 text-base">
                            ${analysis.tradeRecommendation.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="p-3 rounded bg-[#12121a] border-l-2 border-l-emerald-500 border border-[#1a1a2e]">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Take Profit</div>
                          <div className="font-mono font-bold text-emerald-400 text-base">
                            ${analysis.tradeRecommendation.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="p-3 rounded bg-[#12121a] border border-[#1a1a2e]">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Risk:Reward</div>
                          <div className="font-mono font-bold text-white text-base">
                            {analysis.tradeRecommendation.riskRewardRatio}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 max-h-[200px] md:max-h-[300px] overflow-y-auto">
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                      {analysis.reasoning}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <BrokerSettings />
            
            <Card className="bg-[#12121a] border-white/5">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">Your Trades</h3>
                  <History className="w-4 h-4 text-gray-500" />
                </div>
                <TradeHistory currentPrices={new Map(data?.prices?.map((p: any) => [p.pair, p.price]) || [])} />
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
          <div className="h-64 p-4 overflow-y-auto" data-testid="chat-messages">
            <div className="space-y-3 text-sm">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl ${
                    msg.role === 'assistant' 
                      ? 'bg-cyan-500/10 text-gray-300' 
                      : 'bg-blue-500/20 text-white ml-4'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="p-3 rounded-xl bg-cyan-500/10 text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
          </div>
          <div className="p-3 border-t border-white/5">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
              <Input
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 h-9 bg-[#0a0a0f] border-white/10 text-sm"
                data-testid="input-help-message"
                disabled={chatMutation.isPending}
              />
              <Button 
                type="submit" 
                size="sm" 
                className="bg-cyan-500 hover:bg-cyan-600 h-9 px-3"
                disabled={chatMutation.isPending || !helpMessage.trim()}
                data-testid="button-send-chat"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
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

function TradeHistory({ currentPrices }: { currentPrices?: Map<string, number> }) {
  const { data, isLoading } = useQuery<{ predictions: any[]; stats: any }>({
    queryKey: ['/api/predictions'],
    refetchInterval: 5000,
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <Skeleton className="h-24 bg-white/5" />;
  }

  const predictions = data?.predictions || [];
  const rawStats = data?.stats || {};
  const stats = {
    total: rawStats.total || rawStats.completedTrades || 0,
    winRate: parseFloat(rawStats.winRate) || 0,
    totalPnL: rawStats.totalProfitLoss || 0,
    totalDollarProfit: rawStats.totalDollarProfit || 0,
    completedTrades: rawStats.completedTrades || 0,
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = now - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  const getTimeRemaining = (exitTimestamp: string) => {
    const remaining = new Date(exitTimestamp).getTime() - now;
    if (remaining <= 0) return null;
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLivePnL = (pred: any) => {
    const tradeSize = Number(pred.tradeSize) || 0;
    
    if (pred.outcome !== 'PENDING') {
      const pnlPercent = Number(pred.profitLoss) || 0;
      const dollarProfit = (pnlPercent / 100) * tradeSize;
      return { pnl: pnlPercent, dollarProfit, isLive: false, tradeSize };
    }
    const currentPrice = currentPrices?.get(pred.pair);
    if (!currentPrice || !pred.entryPrice) return { pnl: 0, dollarProfit: 0, isLive: true, tradeSize };
    
    const pnlPercent = pred.signal === 'BUY' 
      ? ((currentPrice - pred.entryPrice) / pred.entryPrice) * 100
      : ((pred.entryPrice - currentPrice) / pred.entryPrice) * 100;
    const dollarProfit = (pnlPercent / 100) * tradeSize;
    return { pnl: pnlPercent, dollarProfit, isLive: true, tradeSize };
  };

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
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-1.5 rounded-lg bg-[#0a0a0f]">
          <div className="text-sm font-semibold">{stats.completedTrades}</div>
          <div className="text-[10px] text-gray-500">Completed</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-[#0a0a0f]">
          <div className="text-sm font-semibold text-cyan-400">{stats.winRate}%</div>
          <div className="text-[10px] text-gray-500">Win Rate</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-1.5 rounded-lg bg-[#0a0a0f]">
          <div className={`text-sm font-semibold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}{Number(stats.totalPnL).toFixed(1)}%
          </div>
          <div className="text-[10px] text-gray-500">P/L %</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-[#0a0a0f]">
          <div className={`text-sm font-semibold ${stats.totalDollarProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalDollarProfit >= 0 ? '+' : '-'}${Math.abs(stats.totalDollarProfit).toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500">Profit</div>
        </div>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {predictions.slice(0, 6).map((pred: any) => {
          const { pnl, dollarProfit, isLive } = getLivePnL(pred);
          const timeRemaining = getTimeRemaining(pred.exitTimestamp);
          const isActive = pred.outcome === 'PENDING' && timeRemaining;
          
          return (
            <div 
              key={pred.id} 
              className={`p-2 rounded-lg text-[11px] ${isActive ? 'bg-gradient-to-r from-[#0a0a0f] to-[#0d1117] border border-cyan-500/20' : 'bg-[#0a0a0f]'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${
                    pred.signal === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {pred.signal === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  </div>
                  <span className="font-medium">{pred.pair?.split('-')[0]}</span>
                  {pred.tradeSize && (
                    <span className="text-gray-500">${Number(pred.tradeSize).toFixed(0)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`font-mono font-semibold ${
                    pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {isLive && <span className="animate-pulse mr-1">●</span>}
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                  </div>
                  {dollarProfit !== 0 && (
                    <div className={`font-mono text-[10px] ${
                      dollarProfit > 0 ? 'text-emerald-400' : dollarProfit < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      ({dollarProfit >= 0 ? '+' : ''}${dollarProfit.toFixed(2)})
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <div className="flex items-center gap-2">
                  <span>Entry: ${Number(pred.entryPrice).toFixed(2)}</span>
                  {pred.stopLoss && <span className="text-red-400/70">SL: ${Number(pred.stopLoss).toFixed(2)}</span>}
                  {pred.takeProfit && <span className="text-emerald-400/70">TP: ${Number(pred.takeProfit).toFixed(2)}</span>}
                </div>
                <div className="flex items-center gap-1">
                  {isActive ? (
                    <span className="text-cyan-400 font-mono">{timeRemaining} left</span>
                  ) : (
                    <span>{formatTimeAgo(pred.createdAt)}</span>
                  )}
                  {pred.outcome !== 'PENDING' && (
                    <span className={`px-1 rounded text-[9px] ${
                      pred.outcome === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' : 
                      pred.outcome === 'LOSS' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {pred.outcome}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
