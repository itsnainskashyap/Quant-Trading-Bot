import { TrendingUp, TrendingDown, Minus, Wifi, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PriceData } from "@shared/schema";

interface PriceDisplayProps {
  data: PriceData;
  isSelected: boolean;
  onClick: () => void;
}

export function PriceDisplay({ data, isSelected, onClick }: PriceDisplayProps) {
  const isPositive = data.change24h > 0;
  const isNeutral = data.change24h === 0;
  const isLive = data.isLiveData !== false;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return `$${volume.toFixed(2)}`;
  };

  return (
    <Card 
      className={`p-4 cursor-pointer transition-all duration-200 hover-elevate ${
        isSelected 
          ? 'ring-2 ring-primary bg-primary/5' 
          : 'hover:bg-muted/50'
      }`}
      onClick={onClick}
      data-testid={`card-price-${data.pair}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" data-testid={`text-pair-${data.pair}`}>
              {data.pair}
            </span>
            {isLive ? (
              <Wifi className="w-3 h-3 text-success" />
            ) : (
              <WifiOff className="w-3 h-3 text-muted-foreground" />
            )}
            {isSelected && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
            )}
          </div>
          <span 
            className="text-xl font-bold font-mono tracking-tight mt-1"
            data-testid={`text-price-${data.pair}`}
          >
            {formatPrice(data.price)}
          </span>
        </div>
        
        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
          isPositive 
            ? 'bg-success/10 text-success' 
            : isNeutral 
              ? 'bg-muted text-muted-foreground'
              : 'bg-destructive/10 text-destructive'
        }`}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : isNeutral ? (
            <Minus className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span data-testid={`text-change-${data.pair}`}>
            {isPositive ? '+' : ''}{data.change24h.toFixed(2)}%
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">High</span>
          <span className="text-xs font-mono text-success">{formatPrice(data.high24h)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Low</span>
          <span className="text-xs font-mono text-destructive">{formatPrice(data.low24h)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Vol</span>
          <span className="text-xs font-mono">{formatVolume(data.volume24h)}</span>
        </div>
      </div>
    </Card>
  );
}
