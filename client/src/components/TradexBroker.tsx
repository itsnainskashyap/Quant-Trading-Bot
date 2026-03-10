import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Crosshair, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  XCircle,
  CheckCircle,
  Gem,
  Cpu,
  Timer,
  Activity
} from "lucide-react";
import { ExchangeLogo } from "./ExchangeLogos";

interface TradexTrade {
  id: string;
  pair: string;
  signal: string;
  entryPrice: number;
  currentPrice: number | null;
  amount: number;
  leverage: number;
  stopLoss: number | null;
  takeProfit: number | null;
  aiStopLoss: number | null;
  aiTakeProfit: number | null;
  exitTimestamp: string | null;
  extensionCount: number | null;
  status: string;
  profitLoss: number | null;
  profitLossPercent: number | null;
  aiRecommendation: string | null;
  aiAnalysis: string | null;
  createdAt: string;
}

interface TradexBrokerProps {
  selectedPair: string;
  currentPrice: number;
  signal?: { signal: string; confidence: number };
}

// Calculate elapsed time since trade opened
function formatElapsedTime(createdAt: string): string {
  const start = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  
  if (diffHr > 0) {
    return `${diffHr}h ${diffMin % 60}m`;
  } else if (diffMin > 0) {
    return `${diffMin}m ${diffSec % 60}s`;
  }
  return `${diffSec}s`;
}

// Calculate time remaining until exit
function formatTimeRemaining(exitTimestamp: string | null): { text: string; isUrgent: boolean; isExpired: boolean } {
  if (!exitTimestamp) return { text: '-', isUrgent: false, isExpired: false };
  
  const exitTime = new Date(exitTimestamp).getTime();
  const now = Date.now();
  const diffMs = exitTime - now;
  
  if (diffMs <= 0) {
    return { text: 'Expired', isUrgent: true, isExpired: true };
  }
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const remainingSec = diffSec % 60;
  
  const isUrgent = diffMs < 60000; // Less than 1 minute
  
  if (diffMin > 0) {
    return { text: `${diffMin}m ${remainingSec}s`, isUrgent, isExpired: false };
  }
  return { text: `${diffSec}s`, isUrgent, isExpired: false };
}

export function TradexBroker({ selectedPair, currentPrice, signal }: TradexBrokerProps) {
  const { toast } = useToast();
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<Record<string, { text: string; isUrgent: boolean; isExpired: boolean }>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});

  const { data: balanceData, refetch: refetchBalance } = useQuery<{ balance: number }>({
    queryKey: ['/api/tradex/balance'],
    refetchInterval: 5000,
  });

  const { data: tradesData, refetch: refetchTrades } = useQuery<{ trades: TradexTrade[] }>({
    queryKey: ['/api/tradex/trades'],
    refetchInterval: 3000,
  });

  const { data: historyData } = useQuery<{ trades: TradexTrade[] }>({
    queryKey: ['/api/tradex/history'],
  });

  const addBalanceMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest('POST', '/api/tradex/balance/add', { amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tradex/balance'] });
      setIsAddBalanceOpen(false);
      setAddAmount("");
      toast({ title: "Balance added!", description: `$${addAmount} added to your TradeX wallet` });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add balance", description: error.message, variant: "destructive" });
    },
  });

  const closeTradeMutation = useMutation({
    mutationFn: async ({ tradeId, exitPrice, reason }: { tradeId: string; exitPrice: number; reason: string }) => {
      const res = await apiRequest('POST', `/api/tradex/trade/${tradeId}/close`, { exitPrice, reason });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tradex/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tradex/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tradex/history'] });
      const pnl = data.trade?.profitLoss || 0;
      toast({ 
        title: pnl >= 0 ? "Trade closed in profit!" : "Trade closed", 
        description: `P/L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
        variant: pnl >= 0 ? "default" : "destructive"
      });
    },
    onError: (error: any) => {
      toast({ title: "Failed to close trade", description: error.message, variant: "destructive" });
    },
  });

  const analyzeTradeMutation = useMutation({
    mutationFn: async ({ tradeId, currentPrice }: { tradeId: string; currentPrice: number }) => {
      const res = await apiRequest('POST', `/api/tradex/analyze/${tradeId}`, { currentPrice });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tradex/trades'] });
      
      // Show notification for auto-close
      if (data.autoClosed) {
        const pnl = data.trade?.profitLoss || 0;
        toast({
          title: pnl >= 0 ? "Trade auto-closed in profit" : "Trade auto-closed",
          description: `${data.analysis?.analysis || 'Exit time expired.'} P/L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
          variant: pnl >= 0 ? "default" : "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/tradex/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tradex/history'] });
      }
      
      // Show notification for extension
      if (data.extended) {
        toast({
          title: "Trade time extended",
          description: `AI extended by ${data.extensionMinutes} min. ${data.analysis?.analysis || ''}`,
        });
      }
    },
  });

  // Update elapsed times and time remaining every second
  useEffect(() => {
    if (tradesData?.trades && tradesData.trades.length > 0) {
      const timerInterval = setInterval(() => {
        const newElapsed: Record<string, string> = {};
        const newRemaining: Record<string, { text: string; isUrgent: boolean; isExpired: boolean }> = {};
        tradesData.trades.forEach(trade => {
          if (trade.status === 'OPEN') {
            if (trade.createdAt) {
              newElapsed[trade.id] = formatElapsedTime(trade.createdAt);
            }
            newRemaining[trade.id] = formatTimeRemaining(trade.exitTimestamp);
          }
        });
        setElapsedTimes(newElapsed);
        setTimeRemaining(newRemaining);
      }, 1000);
      return () => clearInterval(timerInterval);
    }
  }, [tradesData?.trades]);

  // Real-time AI analysis every 5 seconds
  useEffect(() => {
    if (tradesData?.trades && tradesData.trades.length > 0 && currentPrice > 0) {
      const analysisInterval = setInterval(() => {
        tradesData.trades.forEach(trade => {
          if (trade.status === 'OPEN') {
            setIsAnalyzing(prev => ({ ...prev, [trade.id]: true }));
            analyzeTradeMutation.mutate({ tradeId: trade.id, currentPrice }, {
              onSettled: () => {
                setIsAnalyzing(prev => ({ ...prev, [trade.id]: false }));
              }
            });
          }
        });
      }, 5000);
      return () => clearInterval(analysisInterval);
    }
  }, [tradesData?.trades, currentPrice]);

  const balance = balanceData?.balance || 0;
  const openTrades = tradesData?.trades || [];
  const closedTrades = historyData?.trades?.filter(t => t.status !== 'OPEN') || [];

  const totalOpenPnL = openTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
  const winRate = closedTrades.length > 0 
    ? (closedTrades.filter(t => (t.profitLoss || 0) > 0).length / closedTrades.length * 100) 
    : 0;

  const getRecommendationColor = (rec: string | null) => {
    if (!rec) return 'text-gray-400';
    if (rec.includes('PROFIT') || rec === 'TRAILING_STOP') return 'text-emerald-400';
    if (rec.includes('LOSS') || rec.includes('CAUTION') || rec === 'AUTO_CLOSE') return 'text-red-400';
    if (rec === 'HOLD') return 'text-blue-400';
    if (rec === 'EXTENDED') return 'text-purple-400';
    return 'text-amber-400';
  };

  const getRecommendationIcon = (rec: string | null) => {
    if (!rec) return null;
    if (rec.includes('PROFIT')) return <TrendingUp className="w-3 h-3" />;
    if (rec.includes('LOSS') || rec === 'AUTO_CLOSE') return <TrendingDown className="w-3 h-3" />;
    if (rec === 'TRAILING_STOP') return <Crosshair className="w-3 h-3" />;
    if (rec === 'EXTENDED') return <RefreshCw className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  return (
    <Card className="bg-white/[0.03] border-blue-500/20" data-testid="tradex-broker-section">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ExchangeLogo exchange="tradex" className="w-5 h-5" />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-bold">
              TradeX Broker
            </span>
            <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400">
              <Gem className="w-2 h-2 mr-1" />
              AI Paper Trading
            </Badge>
          </CardTitle>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-6 w-6 p-0"
            onClick={() => {
              refetchBalance();
              refetchTrades();
            }}
            data-testid="button-refresh-tradex"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-3">
        <div className="p-3 rounded-lg bg-black/80 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Virtual Balance</span>
            </div>
            <Dialog open={isAddBalanceOpen} onOpenChange={setIsAddBalanceOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" data-testid="button-add-balance">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white/[0.03] border-white/10">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ExchangeLogo exchange="tradex" className="w-6 h-6" />
                    Add Virtual Balance
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="text-sm text-gray-400">
                    Add funds to your TradeX virtual wallet for paper trading. This is not real money.
                  </div>
                  <Input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="Enter amount (e.g., 1000)"
                    className="bg-black border-white/10"
                    data-testid="input-add-balance"
                  />
                  <div className="flex gap-2">
                    {[100, 500, 1000, 5000].map(amt => (
                      <Button
                        key={amt}
                        size="sm"
                        variant="outline"
                        onClick={() => setAddAmount(amt.toString())}
                        className="flex-1 text-xs"
                      >
                        ${amt}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={() => addBalanceMutation.mutate(Number(addAmount))}
                    disabled={!addAmount || Number(addAmount) <= 0 || addBalanceMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                    data-testid="button-confirm-add-balance"
                  >
                    {addBalanceMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add ${addAmount || 0}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="text-2xl font-bold text-white">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {openTrades.length > 0 && (
            <div className={`text-xs mt-1 ${totalOpenPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              Open P/L: {totalOpenPnL >= 0 ? '+' : ''}${totalOpenPnL.toFixed(2)}
            </div>
          )}
        </div>

        {openTrades.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-purple-400" />
              Active Trades (AI Monitoring)
            </div>
            {openTrades.map((trade) => (
              <div 
                key={trade.id} 
                className="p-3 rounded-lg bg-black/80 border border-white/5"
                data-testid={`tradex-trade-${trade.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={trade.signal === 'BUY' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}
                    >
                      {trade.signal}
                    </Badge>
                    <span className="text-sm font-medium">{trade.pair}</span>
                    {trade.leverage > 1 && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">{trade.leverage}x</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Timer className="w-3 h-3" />
                      <span className="font-mono">{elapsedTimes[trade.id] || '0s'}</span>
                    </div>
                    {trade.exitTimestamp && (
                      <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                        timeRemaining[trade.id]?.isExpired 
                          ? 'bg-red-500/20 text-red-400' 
                          : timeRemaining[trade.id]?.isUrgent 
                            ? 'bg-amber-500/20 text-amber-400 animate-pulse' 
                            : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        <Crosshair className="w-3 h-3" />
                        <span className="font-mono">{timeRemaining[trade.id]?.text || '-'}</span>
                        {(trade.extensionCount || 0) > 0 && (
                          <span className="text-purple-400">+{trade.extensionCount}</span>
                        )}
                      </div>
                    )}
                    <div className={`text-sm font-bold ${(trade.profitLossPercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(trade.profitLossPercent || 0) >= 0 ? '+' : ''}{(trade.profitLossPercent || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                  <div className="text-gray-500">Entry: <span className="text-white">${trade.entryPrice.toFixed(2)}</span></div>
                  <div className="text-gray-500">Current: <span className="text-white">${(trade.currentPrice || trade.entryPrice).toFixed(2)}</span></div>
                  <div className="text-gray-500">Size: <span className="text-white">${trade.amount.toFixed(2)}</span></div>
                  <div className={`${(trade.profitLoss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    P/L: {(trade.profitLoss || 0) >= 0 ? '+' : ''}${(trade.profitLoss || 0).toFixed(2)}
                  </div>
                </div>

                <div className={`p-2 rounded border ${trade.aiRecommendation ? getRecommendationColor(trade.aiRecommendation) : 'text-gray-400'} bg-white/5 border-white/10 mb-2`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-[10px] font-medium">
                      {isAnalyzing[trade.id] ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                          <span className="text-purple-400">AI Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <Cpu className="w-3 h-3" />
                          {trade.aiRecommendation && getRecommendationIcon(trade.aiRecommendation)}
                          AI: {trade.aiRecommendation || 'Analyzing...'}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-gray-500">
                      <Activity className="w-2.5 h-2.5" />
                      <span>Live</span>
                    </div>
                  </div>
                  {trade.aiAnalysis && (
                    <div className="text-[9px] text-gray-400">{trade.aiAnalysis}</div>
                  )}
                  <div className="flex gap-3 mt-1 text-[9px]">
                    {trade.aiStopLoss && (
                      <span className="text-red-400">SL: ${trade.aiStopLoss.toFixed(2)}</span>
                    )}
                    {trade.aiTakeProfit && (
                      <span className="text-emerald-400">TP: ${trade.aiTakeProfit.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-[10px] text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => closeTradeMutation.mutate({ 
                      tradeId: trade.id, 
                      exitPrice: currentPrice || trade.currentPrice || trade.entryPrice, 
                      reason: 'USER_PROFIT' 
                    })}
                    disabled={closeTradeMutation.isPending}
                    data-testid={`button-take-profit-${trade.id}`}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Take Profit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-[10px] text-red-400 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => closeTradeMutation.mutate({ 
                      tradeId: trade.id, 
                      exitPrice: currentPrice || trade.currentPrice || trade.entryPrice, 
                      reason: 'USER_STOP' 
                    })}
                    disabled={closeTradeMutation.isPending}
                    data-testid={`button-stop-loss-${trade.id}`}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Stop Loss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-xs">
            <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No open trades
            <div className="text-[10px] mt-1">Take a signal to start paper trading</div>
          </div>
        )}

        {closedTrades.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
              <span>Recent Closed Trades</span>
              <span className={winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
                Win Rate: {winRate.toFixed(0)}%
              </span>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {closedTrades.slice(0, 5).map(trade => (
                <div key={trade.id} className="flex items-center justify-between text-[10px] py-1">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-[8px] ${trade.signal === 'BUY' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}`}
                    >
                      {trade.signal}
                    </Badge>
                    <span className="text-gray-400">{trade.pair}</span>
                  </div>
                  <span className={(trade.profitLoss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {(trade.profitLoss || 0) >= 0 ? '+' : ''}${(trade.profitLoss || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
