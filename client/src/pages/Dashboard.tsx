import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown,
  RefreshCw, 
  Bolt,
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
  Crosshair,
  ShieldCheck,
  Coins,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  X,
  Send,
  Wallet,
  ChevronDown,
  ChevronUp,
  Award,
  Gem,
  Cpu,
  Plus
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { TradingViewChart } from "@/components/TradingViewChart";
import { BacktestStats } from "@/components/BacktestStats";
import { TechnicalIndicators } from "@/components/TechnicalIndicators";
import { NotificationBanner, NotificationButton } from "@/components/NotificationBanner";
import { BrokerSettings } from "@/components/BrokerSettings";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import { LiveTradeAnalyzer } from "@/components/LiveTradeAnalyzer";
import { TradeAutomationSettings } from "@/components/TradeAutomationSettings";
import { TradexBroker } from "@/components/TradexBroker";
import { AdvancedAnalysis } from "@/components/AdvancedAnalysis";
import { FindTrade } from "@/components/FindTrade";
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
  positionPercent?: number;
}

type TradeMode = 1 | 3 | 5 | 10;

const TRADE_MODES: { value: TradeMode; label: string; risk: string }[] = [
  { value: 1, label: '1 Min', risk: 'High' },
  { value: 3, label: '3 Min', risk: 'Medium' },
  { value: 5, label: '5 Min', risk: 'Low' },
  { value: 10, label: '10 Min', risk: 'Very Low' },
];

function ManualTradeSection({ selectedPair, currentPrice, tradeMode, tradexBalance }: {
  selectedPair: string;
  currentPrice: number;
  tradeMode: number;
  tradexBalance: number;
}) {
  const [tradeAmount, setTradeAmount] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [isPlacing, setIsPlacing] = useState(false);
  const { toast } = useToast();

  const amountUsdt = parseFloat(tradeAmount) || 0;
  const effectiveSize = amountUsdt * leverage;
  const priceAvailable = currentPrice > 0;

  const placeTrade = async (signal: "BUY" | "SELL") => {
    if (!priceAvailable) {
      toast({ title: "Error", description: "Price not available yet", variant: "destructive" });
      return;
    }
    if (!amountUsdt || amountUsdt <= 0) {
      toast({ title: "Error", description: "Enter a valid trade amount", variant: "destructive" });
      return;
    }
    if (amountUsdt > tradexBalance) {
      toast({ title: "Insufficient Balance", description: "Add funds to your TradeX balance first", variant: "destructive" });
      return;
    }

    setIsPlacing(true);
    try {
      const riskPercent = tradeMode === 1 ? 0.0015 : tradeMode === 3 ? 0.0025 : tradeMode === 5 ? 0.004 : 0.006;
      const rewardPercent = riskPercent * 1.5;
      const stopLoss = signal === "BUY" ? currentPrice * (1 - riskPercent) : currentPrice * (1 + riskPercent);
      const takeProfit = signal === "BUY" ? currentPrice * (1 + rewardPercent) : currentPrice * (1 - rewardPercent);

      const res = await apiRequest("POST", "/api/tradex/trade", {
        pair: selectedPair,
        signal,
        entryPrice: currentPrice,
        amount: amountUsdt,
        stopLoss,
        takeProfit,
        exitWindowMinutes: tradeMode,
        leverage,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Trade failed");
      }

      toast({
        title: `${signal} Trade Placed`,
        description: `${selectedPair} at $${currentPrice.toLocaleString()} | Size: $${amountUsdt.toFixed(2)} × ${leverage}x`,
      });
      setTradeAmount("");
      queryClient.invalidateQueries({ queryKey: ['/api/tradex/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tradex/balance'] });
    } catch (err: any) {
      toast({ title: "Trade Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{selectedPair}</span>
        {priceAvailable ? (
          <span className="font-mono text-white">${currentPrice.toLocaleString()}</span>
        ) : (
          <span className="text-amber-400">Loading price...</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 uppercase">Amount (USDT)</label>
          <Input
            type="number"
            placeholder="0.00"
            value={tradeAmount}
            onChange={e => setTradeAmount(e.target.value)}
            className="bg-black border-white/[0.06] text-white text-sm h-8"
            data-testid="input-manual-amount"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase">Leverage</label>
          <div className="flex gap-1 mt-0.5">
            {[1, 2, 5, 10].map(lev => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`flex-1 text-xs py-1.5 rounded border transition-all ${
                  leverage === lev
                    ? "border-purple-500 bg-purple-500/20 text-purple-300"
                    : "border-white/[0.06] text-gray-500 hover:border-white/20"
                }`}
                data-testid={`button-leverage-${lev}`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {amountUsdt > 0 && leverage > 1 && (
        <div className="flex items-center justify-between text-xs p-2 rounded bg-black border border-white/[0.06]">
          <span className="text-gray-500">Effective Position</span>
          <span className="text-white font-mono font-semibold">${effectiveSize.toFixed(2)}</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>TradeX Balance: <span className="text-white font-mono">${tradexBalance.toLocaleString()}</span></span>
        <div className="flex gap-1">
          {[25, 50, 75, 100].map(pct => (
            <button
              key={pct}
              onClick={() => setTradeAmount(((tradexBalance * pct) / 100).toFixed(2))}
              className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
              data-testid={`button-pct-${pct}`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => placeTrade("BUY")}
          disabled={isPlacing || !amountUsdt || !priceAvailable}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          data-testid="button-manual-buy"
        >
          {isPlacing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <TrendingUp className="w-4 h-4 mr-1" />}
          BUY
        </Button>
        <Button
          onClick={() => placeTrade("SELL")}
          disabled={isPlacing || !amountUsdt || !priceAvailable}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold"
          data-testid="button-manual-sell"
        >
          {isPlacing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
          SELL
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedPair, setSelectedPair] = useState<TradingPair>("BTC-USDT");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tradeMode, setTradeMode] = useState<TradeMode>(5);
  const [showAllCoins, setShowAllCoins] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);
  const [helpMessage, setHelpMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    { role: 'assistant', content: "Hi! I can help you with understanding signals, stop-loss/take-profit strategies, and risk management. Ask me anything!" }
  ]);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  // Fetch TradeX balance as capital
  const { data: tradexBalanceData, refetch: refetchBalance } = useQuery<{ balance: number }>({
    queryKey: ['/api/tradex/balance'],
    enabled: !!user,
    refetchInterval: 5000,
  });
  const capital = tradexBalanceData?.balance || 0;

  const { data: usdtBalanceData } = useQuery<{ balance: number }>({
    queryKey: ['/api/user/balance'],
    enabled: !!user,
    refetchInterval: 10000,
  });
  const usdtBalance = usdtBalanceData?.balance || 0;

  // Fetch subscription status
  const { data: subscription } = useQuery<{ 
    plan: string; 
    remaining: number; 
    dailyLimit: number; 
    isEarlyAdopter?: boolean;
    isPro?: boolean;
  }>({
    queryKey: ['/api/subscription'],
    enabled: !!user,
  });
  const isPro = subscription?.isPro || subscription?.plan === 'pro';
  const dailyAnalysesRemaining = subscription?.remaining ?? 10;
  const dailyLimit = subscription?.dailyLimit ?? 10;

  const { data, isLoading, refetch, isRefetching } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard', selectedPair],
    refetchInterval: 10000,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      // Check if user has analyses remaining (Free tier: 10/day, Pro: unlimited)
      if (!isPro && dailyAnalysesRemaining <= 0) {
        throw new Error("Daily analysis limit reached. Upgrade to Pro for unlimited analyses!");
      }
      const response = await apiRequest('POST', '/api/consensus', { pair: selectedPair, capital, tradeMode });
      return response.json();
    },
    onSuccess: (result) => {
      const consensus = result.consensus as ConsensusResult;
      const entryPrice = data?.prices.find(p => p.pair === selectedPair)?.price || 0;
      const holdDuration = tradeMode;
      
      // Dynamic position sizing based on AI confidence (5-15% of capital)
      // Higher confidence = larger position, lower confidence = smaller position
      const confidence = consensus.consensusConfidence;
      const positionPercent = confidence >= 85 ? 0.15 : 
                              confidence >= 75 ? 0.12 : 
                              confidence >= 65 ? 0.10 : 
                              confidence >= 55 ? 0.08 : 0.05;
      
      // Risk/reward based on trade mode - shorter timeframes = MUCH tighter targets for scalping
      const riskPercent = tradeMode === 1 ? 0.0015 : tradeMode === 3 ? 0.0025 : tradeMode === 5 ? 0.004 : 0.006;
      const rewardPercent = riskPercent * 1.5;
      const tradeSize = capital * positionPercent;
      const stopLossPrice = consensus.consensusSignal === 'BUY' 
        ? entryPrice * (1 - riskPercent) 
        : entryPrice * (1 + riskPercent);
      const takeProfitPrice = consensus.consensusSignal === 'BUY'
        ? entryPrice * (1 + rewardPercent)
        : entryPrice * (1 - rewardPercent);
      
      // Invalidate subscription to update remaining count
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      
      setAnalysis({
        signal: consensus.consensusSignal === 'NO_TRADE' ? 'SKIP' : consensus.consensusSignal,
        confidence: consensus.consensusConfidence,
        reasoning: result.explanation,
        holdTime: holdDuration,
        entryPrice,
        consensus,
        technicalAnalysis: (consensus as any).technicalAnalysis,
        sentimentAnalysis: (consensus as any).sentimentAnalysis,
        positionPercent: Math.round(positionPercent * 100),
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
      
      // Record in predictions (for history)
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
      
      // Also open TradeX virtual trade with exit window
      try {
        await apiRequest('POST', '/api/tradex/trade', {
          pair: selectedPair,
          signal: analysis.signal,
          entryPrice: analysis.entryPrice,
          amount: analysis.tradeRecommendation?.tradeSize || capital * 0.1,
          leverage: 1,
          stopLoss: analysis.tradeRecommendation?.stopLoss,
          takeProfit: analysis.tradeRecommendation?.takeProfit,
          exitWindowMinutes: analysis.holdTime || 5,
        });
      } catch (e) {
        console.log('TradeX trade not opened (may not have balance)');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trade Recorded",
        description: `Your ${analysis?.signal} trade has been recorded. Check back after ${analysis?.holdTime} minutes.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tradex/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tradex/balance'] });
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
      <div className="min-h-screen bg-black">
        <div className="w-full px-4 lg:px-8 py-6">
          <Skeleton className="h-16 mb-6 bg-white/5 rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 bg-white/5 rounded-xl" />)}
          </div>
          <Skeleton className="h-16 mb-4 bg-white/5 rounded-xl" />
          <div className="grid xl:grid-cols-5 gap-4">
            <div className="xl:col-span-4 space-y-4">
              <Skeleton className="h-[550px] bg-white/5 rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 bg-white/5 rounded-xl" />
              <Skeleton className="h-32 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans" data-testid="dashboard">
      <header className="border-b border-white/5 bg-black/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="w-full px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoImage} alt="TradeX AI" className="h-10 w-auto" />
            <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Multi-AI Consensus Trading</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-neutral-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-500 uppercase">TradeX Balance</span>
                  <span className="text-sm font-semibold text-white font-mono">${capital.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <a href="/wallet" className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="link-wallet-balance">
                <Coins className="w-4 h-4 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase">USDT Wallet</span>
                  <span className="text-sm font-semibold text-emerald-400 font-mono">{usdtBalance.toFixed(2)} USDT</span>
                </div>
              </a>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase">AI Analyses</span>
                  <span className="text-sm font-semibold text-white font-mono">
                    {isPro ? '∞' : `${dailyAnalysesRemaining}/${dailyLimit}`}
                  </span>
                </div>
              </div>
            </div>

            {isPro ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold">
                <Award className="w-3 h-3 mr-1" />
                PRO
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-400 border-gray-700">
                FREE
              </Badge>
            )}
            
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-emerald-400" asChild>
              <a href="/wallet" data-testid="link-wallet">
                <Wallet className="w-4 h-4" />
              </a>
            </Button>

            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" asChild>
              <a href="/profile" data-testid="link-profile">
                <User className="w-4 h-4" />
              </a>
            </Button>
            
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" asChild>
              <a href="/api/logout" data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 lg:px-8 py-4">
        <div className="md:hidden mb-4 flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-x-auto">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-neutral-500 uppercase">TradeX</span>
              <span className="text-sm font-semibold text-white font-mono">${capital.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-px h-8 bg-white/10 flex-shrink-0" />
          <a href="/wallet" className="flex items-center gap-2 min-w-0" data-testid="link-wallet-balance-mobile">
            <Coins className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-neutral-500 uppercase">USDT</span>
              <span className="text-sm font-semibold text-emerald-400 font-mono">{usdtBalance.toFixed(2)}</span>
            </div>
          </a>
          <div className="w-px h-8 bg-white/10 flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-neutral-500 uppercase">AI</span>
              <span className="text-sm font-semibold text-white font-mono">
                {isPro ? '∞' : `${dailyAnalysesRemaining}/${dailyLimit}`}
              </span>
            </div>
          </div>
        </div>
        {/* Quick Stats Bar */}
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <Crosshair className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[10px] text-gray-500 uppercase">Selected Pair</span>
            </div>
            <div className="font-semibold text-white">{selectedPair}</div>
          </div>
          
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] text-gray-500 uppercase">Duration</span>
            </div>
            <div className="font-semibold text-white">{tradeMode} Minutes</div>
          </div>
          
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-gray-500 uppercase">Risk Level</span>
            </div>
            <div className={`font-semibold ${
              tradeMode === 1 ? 'text-emerald-400' : 
              tradeMode === 3 ? 'text-blue-400' :
              tradeMode === 5 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {tradeMode === 1 ? 'Low' : tradeMode === 3 ? 'Low-Med' : tradeMode === 5 ? 'Medium' : 'High'}
            </div>
          </div>
          
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-gray-500 uppercase">Position Size</span>
            </div>
            <div className="font-semibold text-white">{analysis?.positionPercent || '5-15'}%</div>
          </div>
          
          <div className="hidden lg:block p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <Bolt className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] text-gray-500 uppercase">Market Status</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-400">Live</span>
            </div>
          </div>
          
          <div className="hidden lg:block p-3 rounded-xl bg-white/[0.05] border border-white/[0.08]">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[10px] text-neutral-400 uppercase">AI Ready</span>
            </div>
            <div className="font-semibold text-white">3 Models Active</div>
          </div>
        </div>

        {/* Trade Duration Selection */}
        <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Select Trade Duration</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-neutral-400 hover:text-white text-xs"
              onClick={() => {
                const tradexSection = document.querySelector('[data-testid="tradex-broker-section"]');
                if (tradexSection) {
                  tradexSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              data-testid="button-add-balance"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Balance
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {TRADE_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => {
                  setTradeMode(mode.value);
                  setAnalysis(null);
                }}
                className={`py-3 px-4 rounded-xl text-center transition-all ${
                  tradeMode === mode.value
                    ? 'bg-white/[0.08] border border-white/20 text-white'
                    : 'bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:border-gray-600 hover:bg-white/[0.05]'
                }`}
                data-testid={`button-mode-${mode.value}min`}
              >
                <div className="font-bold text-lg">{mode.label}</div>
                <div className={`text-xs mt-1 ${
                  mode.risk === 'High' ? 'text-red-400' :
                  mode.risk === 'Medium' ? 'text-amber-400' :
                  mode.risk === 'Low' ? 'text-emerald-400' : 'text-blue-400'
                }`}>{mode.risk} Risk</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-400" />
              <h2 className="text-sm font-medium text-white">Select Trading Pair</h2>
              <Badge variant="outline" className="text-[10px] text-gray-500 border-gray-700">15 Pairs</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-neutral-400 hover:text-white text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh Prices
            </Button>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-2">
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
                      ? 'bg-white/[0.08] border-white/20 ring-1 ring-white/20'
                      : 'bg-white/[0.03] border-white/5 hover:border-white/10'
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

        <div className="grid xl:grid-cols-5 gap-4">
          <div className="xl:col-span-4 space-y-4">
            <Card className="bg-white/[0.03] border-white/[0.06] overflow-hidden">
              <CardContent className="p-0">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={selectedPair.split('-')[0]} />
                    <div>
                      <div className="font-semibold text-lg">{selectedPair}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Perpetual Futures</div>
                    </div>
                    {analysis && analysis.signal !== 'SKIP' && (
                      <div className={`ml-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        analysis.signal === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {analysis.signal} @ ${analysis.entryPrice.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs text-gray-400 uppercase">Live Data</span>
                    </div>
                    <CandleTimer />
                  </div>
                </div>
                <div className="h-[350px] md:h-[550px]">
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
              <Card className="bg-white/[0.03] border-white/[0.06]">
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
                      className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 font-medium"
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
              <Card className="bg-white/[0.03] border-white/[0.06] overflow-hidden">
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
                      <div className="absolute inset-4 rounded-full border border-transparent border-t-white/30 animate-spin" 
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
              <Card className="bg-white/[0.03] border-white/[0.06] overflow-hidden">
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
                          <div className="flex flex-col items-center px-3 py-1.5 rounded bg-white/[0.03] border border-white/[0.06]">
                            <span className="text-[10px] text-gray-500 uppercase">Duration</span>
                            <span className="font-mono font-semibold text-white">{analysis.holdTime}m</span>
                          </div>
                          <div className="flex flex-col items-center px-3 py-1.5 rounded bg-white/[0.03] border border-white/[0.06]">
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
                    <div className="p-4 border-t border-white/[0.06] bg-black">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Position Size</div>
                          <div className="font-mono font-bold text-white text-base">
                            ${analysis.tradeRecommendation.tradeSize.toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 rounded bg-white/[0.03] border-l-2 border-l-red-500 border border-white/[0.06]">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Stop Loss</div>
                          <div className="font-mono font-bold text-red-400 text-base">
                            ${analysis.tradeRecommendation.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="p-3 rounded bg-white/[0.03] border-l-2 border-l-emerald-500 border border-white/[0.06]">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Take Profit</div>
                          <div className="font-mono font-bold text-emerald-400 text-base">
                            ${analysis.tradeRecommendation.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Risk:Reward</div>
                          <div className="font-mono font-bold text-white text-base">
                            {analysis.tradeRecommendation.riskRewardRatio}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-3 max-h-[200px] md:max-h-[300px] overflow-y-auto">
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line break-words">
                      {analysis.reasoning}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manual Trade */}
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crosshair className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-medium text-white">Manual Trade</h3>
                  <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 ml-auto">Direct</Badge>
                </div>
                <ManualTradeSection
                  selectedPair={selectedPair}
                  currentPrice={data?.prices?.find((p: any) => p.pair === selectedPair)?.price || 0}
                  tradeMode={tradeMode}
                  tradexBalance={capital}
                />
              </CardContent>
            </Card>

            {/* Advanced Analysis and Find Trade - Pro Features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AdvancedAnalysis pair={selectedPair} tradeMode={tradeMode} isPro={isPro} />
              <FindTrade pair={selectedPair} isPro={isPro} />
            </div>
          </div>

          <div className="space-y-4 xl:col-span-1">
            {/* Trade History Card */}
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-neutral-400" />
                    <h3 className="text-sm font-medium text-white">Your Trades</h3>
                  </div>
                </div>
                <TradeHistory currentPrices={new Map(data?.prices?.map((p: any) => [p.pair, p.price]) || [])} />
              </CardContent>
            </Card>

            <TradexBroker 
              selectedPair={selectedPair} 
              currentPrice={data?.prices?.find((p: any) => p.pair === selectedPair)?.price || 0}
              signal={data?.signal}
            />
            <BrokerSettings />
            <PortfolioDashboard confidence={data?.signal?.confidence || 75} />
            <ActiveTradeMonitor selectedPair={selectedPair} currentPrice={data?.prices?.find((p: any) => p.pair === selectedPair)?.price} />
            <TradeAutomationSettings />

            {/* How It Works Card */}
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Gem className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-medium text-white">How It Works</h3>
                </div>
                <ol className="space-y-2 text-xs text-neutral-400">
                  <li className="flex gap-3 items-center">
                    <span className="w-5 h-5 rounded-full bg-white/[0.08] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Set your capital above</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <span className="w-5 h-5 rounded-full bg-white/[0.08] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Select any crypto pair</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <span className="w-5 h-5 rounded-full bg-white/[0.08] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Click "Analyze"</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <span className="w-5 h-5 rounded-full bg-white/[0.08] text-white flex items-center justify-center text-[10px] font-bold">4</span>
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

            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5" />
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
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-white text-black shadow-lg shadow-white/10 flex items-center justify-center hover:scale-105 transition-transform z-50"
        data-testid="button-help-chat"
      >
        {showHelpChat ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {showHelpChat && (
        <div className="fixed bottom-24 right-6 w-[calc(100%-3rem)] max-w-80 bg-black rounded-2xl border border-white/[0.08] shadow-xl shadow-black/50 z-50 overflow-hidden">
          <div className="p-4 border-b border-white/[0.06]">
            <h4 className="font-medium text-white">AI Trading Assistant</h4>
            <p className="text-xs text-neutral-500">Ask me anything about trading</p>
          </div>
          <div className="h-64 p-4 overflow-y-auto" data-testid="chat-messages">
            <div className="space-y-3 text-sm">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-xl ${
                    msg.role === 'assistant' 
                      ? 'bg-white/[0.04] text-neutral-300' 
                      : 'bg-white/[0.08] text-white ml-4'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="p-3 rounded-xl bg-white/[0.04] text-neutral-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              )}
            </div>
          </div>
          <div className="p-3 border-t border-white/[0.06]">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
              <Input
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 h-9 bg-white/[0.04] border-white/[0.08] text-sm"
                data-testid="input-help-message"
                disabled={chatMutation.isPending}
              />
              <Button 
                type="submit" 
                size="sm" 
                className="bg-white text-black hover:bg-neutral-200 h-9 px-3"
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
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black text-xs">
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
        <div className="text-center p-1.5 rounded-lg bg-black">
          <div className="text-sm font-semibold">{stats.completedTrades}</div>
          <div className="text-[10px] text-gray-500">Completed</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-black">
          <div className="text-sm font-semibold text-white">{stats.winRate}%</div>
          <div className="text-[10px] text-gray-500">Win Rate</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-1.5 rounded-lg bg-black">
          <div className={`text-sm font-semibold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}{Number(stats.totalPnL).toFixed(1)}%
          </div>
          <div className="text-[10px] text-gray-500">P/L %</div>
        </div>
        <div className="text-center p-1.5 rounded-lg bg-black">
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
              className={`p-2 rounded-lg text-[11px] ${isActive ? 'bg-white/[0.05] border border-white/[0.08]' : 'bg-black'}`}
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
                    <span className="text-white font-mono">{timeRemaining} left</span>
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

function ActiveTradeMonitor({ selectedPair, currentPrice }: { selectedPair: string; currentPrice?: number }) {
  const { data } = useQuery<{ predictions: any[]; stats: any }>({
    queryKey: ['/api/predictions'],
    refetchInterval: 3000,
  });

  const activeTrade = data?.predictions?.find(
    (pred: any) => pred.outcome === 'PENDING' && pred.pair === selectedPair
  );

  if (!activeTrade || !currentPrice) {
    return null;
  }

  return (
    <LiveTradeAnalyzer
      activeTrade={{
        pair: activeTrade.pair,
        entryPrice: activeTrade.entryPrice,
        stopLoss: activeTrade.stopLoss || activeTrade.entryPrice * (activeTrade.signal === 'BUY' ? 0.98 : 1.02),
        takeProfit: activeTrade.takeProfit || activeTrade.entryPrice * (activeTrade.signal === 'BUY' ? 1.03 : 0.97),
        signal: activeTrade.signal,
        tradeSize: activeTrade.tradeSize || 100,
        createdAt: activeTrade.createdAt,
      }}
      currentPrice={currentPrice}
    />
  );
}
