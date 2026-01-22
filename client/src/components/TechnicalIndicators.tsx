import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus, BarChart2, LineChart } from "lucide-react";
import type { TradingPair, MarketMetrics } from "@shared/schema";

interface TechnicalIndicatorsProps {
  pair: TradingPair;
  metrics?: MarketMetrics;
}

export function TechnicalIndicators({ pair, metrics }: TechnicalIndicatorsProps) {
  if (!metrics) {
    return (
      <Card data-testid="card-technical-indicators">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            Technical Analysis
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

  const getSignalColor = (signal?: string) => {
    if (!signal) return "text-muted-foreground";
    if (signal === 'STRONG_BUY' || signal === 'BUY' || signal === 'BULLISH' || signal === 'OVERSOLD') return "text-emerald-500";
    if (signal === 'STRONG_SELL' || signal === 'SELL' || signal === 'BEARISH' || signal === 'OVERBOUGHT') return "text-red-500";
    return "text-amber-500";
  };

  const getSignalBadge = (signal?: string) => {
    if (!signal) return null;
    const isBullish = signal === 'STRONG_BUY' || signal === 'BUY' || signal === 'BULLISH' || signal === 'OVERSOLD';
    const isBearish = signal === 'STRONG_SELL' || signal === 'SELL' || signal === 'BEARISH' || signal === 'OVERBOUGHT';
    
    return (
      <Badge 
        variant={isBullish ? "default" : isBearish ? "destructive" : "secondary"}
        className="text-xs"
      >
        {signal.replace('_', ' ')}
      </Badge>
    );
  };

  const getRSIColor = (rsi?: number) => {
    if (!rsi) return "bg-muted";
    if (rsi < 30) return "bg-emerald-500";
    if (rsi > 70) return "bg-red-500";
    if (rsi < 40 || rsi > 60) return "bg-amber-500";
    return "bg-primary";
  };

  return (
    <Card data-testid="card-technical-indicators">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-primary" />
            Technical Analysis
          </span>
          {metrics.overallTechnicalSignal && getSignalBadge(metrics.overallTechnicalSignal)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" />
              RSI (14)
            </span>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm ${getSignalColor(metrics.rsiSignal)}`}>
                {metrics.rsi?.toFixed(1) || 'N/A'}
              </span>
              {metrics.rsiSignal && (
                <Badge variant={metrics.rsiSignal === 'OVERSOLD' ? 'default' : metrics.rsiSignal === 'OVERBOUGHT' ? 'destructive' : 'secondary'} className="text-xs">
                  {metrics.rsiSignal}
                </Badge>
              )}
            </div>
          </div>
          {metrics.rsi && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${getRSIColor(metrics.rsi)}`}
                style={{ width: `${metrics.rsi}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <BarChart2 className="w-3 h-3" />
            MACD
          </span>
          <div className="flex items-center gap-2">
            {metrics.macdTrend === 'BULLISH' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
            {metrics.macdTrend === 'BEARISH' && <TrendingDown className="w-4 h-4 text-red-500" />}
            {metrics.macdTrend === 'NEUTRAL' && <Minus className="w-4 h-4 text-muted-foreground" />}
            <span className={`text-sm ${getSignalColor(metrics.macdTrend)}`}>
              {metrics.macdTrend || 'N/A'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Bollinger</span>
          <span className={`text-sm ${getSignalColor(metrics.bollingerPosition)}`}>
            {metrics.bollingerPosition?.replace('_', ' ') || 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Momentum</span>
          <span className={`font-mono text-sm ${metrics.momentum && metrics.momentum > 0 ? 'text-emerald-500' : metrics.momentum && metrics.momentum < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
            {metrics.momentum ? (metrics.momentum > 0 ? '+' : '') + metrics.momentum.toFixed(2) + '%' : 'N/A'}
          </span>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">SMA 20</span>
            <span className="font-mono">${metrics.sma20?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">SMA 50</span>
            <span className="font-mono">${metrics.sma50?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}</span>
          </div>
        </div>

        {metrics.technicalStrength !== undefined && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Signal Strength</span>
              <span className="font-medium">{metrics.technicalStrength}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  metrics.technicalStrength >= 70 ? 'bg-emerald-500' : 
                  metrics.technicalStrength >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${metrics.technicalStrength}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
