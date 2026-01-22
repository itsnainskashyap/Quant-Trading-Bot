import { BarChart3, TrendingUp, Zap, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MarketMetrics as MarketMetricsType, MarketRegime } from "@shared/schema";

interface MarketMetricsProps {
  metrics: MarketMetricsType;
  regime: MarketRegime;
}

export function MarketMetrics({ metrics, regime }: MarketMetricsProps) {
  const regimeConfig = {
    TREND: { color: "text-success", bg: "bg-success/10", label: "Trending" },
    RANGE: { color: "text-primary", bg: "bg-primary/10", label: "Ranging" },
    CHAOS: { color: "text-destructive", bg: "bg-destructive/10", label: "Chaotic" },
  };

  const { color, bg, label } = regimeConfig[regime];

  const normalizeValue = (value: number, min: number, max: number) => {
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  };

  const metricItems = [
    {
      label: "Volume Delta",
      value: metrics.volumeDelta,
      display: `${metrics.volumeDelta > 0 ? '+' : ''}${metrics.volumeDelta.toFixed(1)}%`,
      progress: normalizeValue(Math.abs(metrics.volumeDelta), 0, 50),
      icon: BarChart3,
      isPositive: metrics.volumeDelta > 0,
    },
    {
      label: "Order Book Imbalance",
      value: metrics.orderBookImbalance,
      display: `${metrics.orderBookImbalance > 0 ? 'Buy' : 'Sell'} ${Math.abs(metrics.orderBookImbalance).toFixed(0)}%`,
      progress: normalizeValue(Math.abs(metrics.orderBookImbalance), 0, 100),
      icon: TrendingUp,
      isPositive: metrics.orderBookImbalance > 0,
    },
    {
      label: "Volatility",
      value: metrics.volatility,
      display: `${metrics.volatility.toFixed(1)}%`,
      progress: normalizeValue(metrics.volatility, 0, 10),
      icon: Zap,
      isNeutral: true,
    },
    {
      label: "ATR",
      value: metrics.atr,
      display: `$${metrics.atr.toFixed(2)}`,
      progress: normalizeValue(metrics.atr, 0, 500),
      icon: Activity,
      isNeutral: true,
    },
  ];

  return (
    <Card className="p-4" data-testid="card-market-metrics">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Market Metrics</h3>
        <div className={`px-2 py-1 rounded-md text-xs font-medium ${bg} ${color}`} data-testid="badge-regime">
          {label}
        </div>
      </div>
      
      <div className="space-y-4">
        {metricItems.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <item.icon className="w-3 h-3" />
                <span>{item.label}</span>
              </div>
              <span className={`font-mono ${
                item.isNeutral 
                  ? 'text-foreground' 
                  : item.isPositive 
                    ? 'text-success' 
                    : 'text-destructive'
              }`}>
                {item.display}
              </span>
            </div>
            <Progress 
              value={item.progress} 
              className="h-1"
            />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Funding Rate
          </span>
          <span className={`text-sm font-mono ${
            metrics.fundingRate > 0 ? 'text-success' : 'text-destructive'
          }`}>
            {metrics.fundingRate > 0 ? '+' : ''}{(metrics.fundingRate * 100).toFixed(4)}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Open Interest
          </span>
          <span className="text-sm font-mono">
            ${(metrics.openInterest / 1e9).toFixed(2)}B
          </span>
        </div>
      </div>
    </Card>
  );
}
