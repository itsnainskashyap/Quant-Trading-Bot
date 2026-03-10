import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Zap, AlertTriangle, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PortfolioData {
  exchanges: Array<{
    exchange: string;
    testMode: boolean;
    balances: Record<string, { free: number; used: number; total: number }>;
    totalUSDT: number;
    error?: string;
  }>;
  totalBalance: number;
}

interface PositionsData {
  positions: Array<{
    exchange: string;
    symbol: string;
    side: string;
    amount: number;
    entryPrice: number;
    markPrice: number;
    unrealizedPnl: number;
    leverage: number;
  }>;
  totalPnl: number;
}

interface TradeSuggestion {
  tradeSize: number;
  suggestedLeverage: number;
  riskAmount: number;
  totalBalance: number;
  exchanges: number;
}

interface PortfolioDashboardProps {
  confidence?: number;
  onTradeSizeChange?: (size: number, leverage: number) => void;
}

export function PortfolioDashboard({ confidence = 75, onTradeSizeChange }: PortfolioDashboardProps) {
  const { data: portfolio, isLoading: portfolioLoading, refetch: refetchPortfolio } = useQuery<PortfolioData>({
    queryKey: ['/api/portfolio'],
    refetchInterval: 30000,
  });

  const { data: positions, isLoading: positionsLoading, refetch: refetchPositions } = useQuery<PositionsData>({
    queryKey: ['/api/positions'],
    refetchInterval: 10000,
  });

  const suggestionMutation = useMutation({
    mutationFn: async (params: { confidence: number; maxLeverage: number }) => {
      const res = await apiRequest('POST', '/api/trade-suggestion', params);
      return res.json();
    },
    onSuccess: (data: TradeSuggestion) => {
      if (onTradeSizeChange) {
        onTradeSizeChange(data.tradeSize, data.suggestedLeverage);
      }
    },
  });

  const handleRefreshAll = () => {
    refetchPortfolio();
    refetchPositions();
  };

  const handleGetSuggestion = () => {
    suggestionMutation.mutate({ confidence, maxLeverage: 10 });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const hasConnections = portfolio && portfolio.exchanges.length > 0;
  const hasPositions = positions && positions.positions.length > 0;

  if (!hasConnections && !portfolioLoading) {
    return null;
  }

  return (
    <Card className="bg-white/[0.03] border-white/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-400" />
            Portfolio Dashboard
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={handleRefreshAll}
            data-testid="button-refresh-portfolio"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {portfolioLoading ? (
          <div className="text-center py-3">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto text-gray-500" />
            <p className="text-xs text-gray-500 mt-1">Loading balances...</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total Balance</p>
                  <p className="text-xl font-bold text-white" data-testid="text-total-balance">
                    {formatCurrency(portfolio?.totalBalance || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Connected</p>
                  <p className="text-lg font-semibold text-blue-400" data-testid="text-exchange-count">
                    {portfolio?.exchanges.length || 0} exchanges
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {portfolio?.exchanges.map((ex, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                  data-testid={`exchange-balance-${ex.exchange}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{ex.exchange}</span>
                    {ex.testMode && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1 border-yellow-500/50 text-yellow-400">
                        TEST
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    {ex.error ? (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Error
                      </span>
                    ) : (
                      <span className="text-sm font-mono text-green-400">
                        {formatCurrency(ex.totalUSDT)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasPositions && (
              <div className="border-t border-white/5 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400">Open Positions</p>
                  <Badge 
                    variant={positions!.totalPnl >= 0 ? "default" : "destructive"}
                    className="text-xs"
                    data-testid="text-total-pnl"
                  >
                    {positions!.totalPnl >= 0 ? '+' : ''}{formatCurrency(positions!.totalPnl)}
                  </Badge>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {positions?.positions.map((pos, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between text-xs p-1.5 bg-white/5 rounded"
                      data-testid={`position-${pos.symbol}-${idx}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {pos.unrealizedPnl >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        )}
                        <span className="font-medium">{pos.symbol}</span>
                        <Badge 
                          variant={pos.side === 'long' ? 'default' : 'destructive'} 
                          className="text-[10px] py-0 px-1"
                        >
                          {pos.side.toUpperCase()} {pos.leverage}x
                        </Badge>
                      </div>
                      <span className={pos.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {pos.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-white/5 pt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 hover:border-blue-500/50"
                onClick={handleGetSuggestion}
                disabled={suggestionMutation.isPending}
                data-testid="button-get-suggestion"
              >
                <Zap className="w-3 h-3" />
                {suggestionMutation.isPending ? 'Analyzing...' : 'AI Trade Suggestion'}
              </Button>
              
              {suggestionMutation.data && (
                <div className="mt-2 p-2 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-1 mb-1">
                    <DollarSign className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-gray-300">AI Recommendation</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-gray-500">Trade Size</p>
                      <p className="text-sm font-bold text-green-400" data-testid="text-suggested-size">
                        {formatCurrency(suggestionMutation.data.tradeSize)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Leverage</p>
                      <p className="text-sm font-bold text-blue-400" data-testid="text-suggested-leverage">
                        {suggestionMutation.data.suggestedLeverage}x
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Risk</p>
                      <p className="text-sm font-bold text-yellow-400" data-testid="text-suggested-risk">
                        {formatCurrency(suggestionMutation.data.riskAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
