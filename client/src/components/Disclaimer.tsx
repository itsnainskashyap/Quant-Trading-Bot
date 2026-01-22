import { AlertTriangle } from "lucide-react";

export function Disclaimer() {
  return (
    <div 
      className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
      data-testid="disclaimer"
    >
      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="space-y-2">
        <p className="text-sm font-semibold text-amber-500">
          IMPORTANT RISK DISCLOSURE
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>No trading system can guarantee profits.</strong> TradeX AI uses advanced multi-AI analysis 
          to identify high-probability trading opportunities, but all trading involves substantial risk of loss. 
          The cryptocurrency market is highly volatile and unpredictable.
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This platform is for educational and informational purposes only. Not financial advice. 
          Past performance does not indicate future results. Only trade with capital you can afford to lose completely.
        </p>
      </div>
    </div>
  );
}
