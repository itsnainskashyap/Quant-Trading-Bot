import { Shield, Clock, TrendingDown, AlertOctagon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CapitalProtectionProps {
  tradesRemaining: number;
  maxTrades: number;
  drawdownPercent: number;
  isVolatilityHigh: boolean;
  isNewsPause: boolean;
}

export function CapitalProtection({
  tradesRemaining,
  maxTrades,
  drawdownPercent,
  isVolatilityHigh,
  isNewsPause,
}: CapitalProtectionProps) {
  const tradeProgress = (tradesRemaining / maxTrades) * 100;
  const drawdownLevel = drawdownPercent > 5 ? "HIGH" : drawdownPercent > 2 ? "MEDIUM" : "LOW";

  const protectionStatus = isNewsPause 
    ? { label: "News Pause", color: "text-warning", bg: "bg-warning/10" }
    : isVolatilityHigh 
      ? { label: "High Volatility", color: "text-destructive", bg: "bg-destructive/10" }
      : { label: "Active", color: "text-success", bg: "bg-success/10" };

  return (
    <Card className="p-4" data-testid="card-capital-protection">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Capital Protection</h3>
        </div>
        <Badge 
          variant="outline" 
          className={`text-xs ${protectionStatus.bg} ${protectionStatus.color}`}
          data-testid="badge-protection-status"
        >
          {protectionStatus.label}
        </Badge>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Trades Remaining Today</span>
            </div>
            <span className="font-mono">{tradesRemaining}/{maxTrades}</span>
          </div>
          <Progress value={tradeProgress} className="h-1.5" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingDown className="w-3 h-3" />
              <span>Drawdown</span>
            </div>
            <span className={`font-mono ${
              drawdownLevel === "HIGH" 
                ? "text-destructive" 
                : drawdownLevel === "MEDIUM" 
                  ? "text-warning" 
                  : "text-success"
            }`}>
              {drawdownPercent.toFixed(2)}%
            </span>
          </div>
          <Progress 
            value={Math.min(drawdownPercent * 10, 100)} 
            className={`h-1.5 ${
              drawdownLevel === "HIGH" 
                ? "[&>div]:bg-destructive" 
                : drawdownLevel === "MEDIUM" 
                  ? "[&>div]:bg-warning" 
                  : ""
            }`}
          />
        </div>
        
        {(isVolatilityHigh || isNewsPause) && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
            <AlertOctagon className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning">
              {isNewsPause 
                ? "Trading paused during news event. Signals suppressed to protect capital."
                : "High volatility detected. Trade frequency reduced."}
            </p>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Capital survival {">"} trade frequency
        </p>
      </div>
    </Card>
  );
}
