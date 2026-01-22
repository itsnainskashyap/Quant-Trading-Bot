import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, BarChart3, AlertTriangle, Activity } from "lucide-react";
import type { BacktestStats as BacktestStatsType } from "@shared/schema";

export function BacktestStats() {
  const { data: stats, isLoading } = useQuery<BacktestStatsType>({
    queryKey: ["/api/backtest-stats"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card data-testid="card-backtest-stats">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card data-testid="card-backtest-stats">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Historical Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-muted/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              Win Rate
            </div>
            <div className="text-lg font-bold text-emerald-500" data-testid="text-win-rate">
              {stats.winRate.toFixed(1)}%
            </div>
          </div>
          
          <div className="p-2 rounded bg-muted/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              Profit Factor
            </div>
            <div className="text-lg font-bold text-primary" data-testid="text-profit-factor">
              {stats.profitFactor.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-muted-foreground">Total Signals</div>
            <div className="font-semibold" data-testid="text-total-signals">{stats.totalSignals}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              Wins
            </div>
            <div className="font-semibold text-emerald-500" data-testid="text-wins">{stats.winningSignals}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-500" />
              Losses
            </div>
            <div className="font-semibold text-red-500" data-testid="text-losses">{stats.losingSignals}</div>
          </div>
        </div>

        <div className="pt-2 border-t space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Avg Profit</span>
            <span className="text-emerald-500 font-medium">+{stats.avgProfit.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Avg Loss</span>
            <span className="text-red-500 font-medium">-{stats.avgLoss.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Max Drawdown
            </span>
            <span className="text-amber-500 font-medium">{stats.maxDrawdown.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Sharpe Ratio</span>
            <span className="text-primary font-medium">{stats.sharpeRatio.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
