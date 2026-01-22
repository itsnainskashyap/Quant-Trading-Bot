import { ArrowUp, ArrowDown, MinusCircle, Check, X, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SignalHistory as SignalHistoryType } from "@shared/schema";

interface SignalHistoryProps {
  history: SignalHistoryType[];
}

export function SignalHistory({ history }: SignalHistoryProps) {
  const getSignalIcon = (signal: SignalHistoryType["signal"]) => {
    switch (signal) {
      case "BUY": return ArrowUp;
      case "SELL": return ArrowDown;
      default: return MinusCircle;
    }
  };

  const getSignalColor = (signal: SignalHistoryType["signal"]) => {
    switch (signal) {
      case "BUY": return "text-success";
      case "SELL": return "text-destructive";
      default: return "text-warning";
    }
  };

  const getOutcomeConfig = (outcome?: SignalHistoryType["outcome"]) => {
    switch (outcome) {
      case "WIN":
        return { icon: Check, color: "text-success", bg: "bg-success/10" };
      case "LOSS":
        return { icon: X, color: "text-destructive", bg: "bg-destructive/10" };
      case "PENDING":
        return { icon: Clock, color: "text-primary", bg: "bg-primary/10" };
      default:
        return { icon: MinusCircle, color: "text-muted-foreground", bg: "bg-muted" };
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  if (history.length === 0) {
    return (
      <Card className="p-4" data-testid="card-signal-history-empty">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Signal History</h3>
        <p className="text-xs text-muted-foreground text-center py-4">
          No signals generated yet
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4" data-testid="card-signal-history">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Signal History</h3>
      
      <ScrollArea className="h-[200px]">
        <div className="space-y-2">
          {history.map((item) => {
            const SignalIcon = getSignalIcon(item.signal);
            const outcomeConfig = getOutcomeConfig(item.outcome);
            const OutcomeIcon = outcomeConfig.icon;
            
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover-elevate"
                data-testid={`signal-history-${item.id}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded flex items-center justify-center bg-muted`}>
                    <SignalIcon className={`w-3.5 h-3.5 ${getSignalColor(item.signal)}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">{item.pair}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono">{item.confidence}%</span>
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${outcomeConfig.bg}`}>
                    <OutcomeIcon className={`w-3 h-3 ${outcomeConfig.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
