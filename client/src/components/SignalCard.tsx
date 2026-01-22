import { ArrowUp, ArrowDown, MinusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { RiskIndicator } from "./RiskIndicator";
import { ExitCountdown } from "./ExitCountdown";
import type { TradingSignal } from "@shared/schema";

interface SignalCardProps {
  signal: TradingSignal | null;
  isLoading?: boolean;
}

export function SignalCard({ signal, isLoading }: SignalCardProps) {
  if (isLoading) {
    return (
      <Card className="p-6" data-testid="card-signal-loading">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  if (!signal) {
    return (
      <Card className="p-6" data-testid="card-signal-empty">
        <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
            <MinusCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">No Active Signal</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Waiting for market conditions to meet signal criteria. Capital protection takes priority.
          </p>
        </div>
      </Card>
    );
  }

  const signalConfig = {
    BUY: {
      icon: ArrowUp,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/30",
      glow: "glow-success",
      label: "BUY",
    },
    SELL: {
      icon: ArrowDown,
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      glow: "glow-destructive",
      label: "SELL",
    },
    NO_TRADE: {
      icon: MinusCircle,
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/30",
      glow: "glow-warning",
      label: "NO TRADE",
    },
  };

  const config = signalConfig[signal.signal];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`relative overflow-hidden ${config.glow}`}
        data-testid="card-signal"
      >
        <div className={`absolute inset-0 ${config.bg} opacity-30`} />
        
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="font-mono text-xs">
              {signal.pair}
            </Badge>
            <RiskIndicator grade={signal.riskGrade} />
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 py-4">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className={`w-20 h-20 rounded-full ${config.bg} ${config.border} border-2 flex items-center justify-center mb-3`}
              >
                <Icon className={`w-10 h-10 ${config.color}`} />
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-3xl font-bold ${config.color}`}
                data-testid="text-signal-type"
              >
                {config.label}
              </motion.h2>
            </div>
            
            <div className="flex-1 flex justify-center">
              <ConfidenceMeter confidence={signal.confidence} size="lg" />
            </div>
          </div>
          
          <div className="mt-4">
            <ExitCountdown exitTimestamp={signal.exitTimestamp} />
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Exit Window
              </span>
              <span className="text-sm font-mono">{signal.exitWindowMinutes} min</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Signal ID
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                #{signal.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
