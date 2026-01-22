import { Info } from "lucide-react";

export function Disclaimer() {
  return (
    <div 
      className="flex items-start gap-2 p-3 rounded-md bg-muted/30 border border-border"
      data-testid="disclaimer"
    >
      <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        <strong>Disclaimer:</strong> Ek XBT provides AI-assisted probability analysis for educational purposes only. 
        This is not financial advice. No profit guarantees are made or implied. 
        Past performance does not indicate future results. Trade responsibly and only with capital you can afford to lose.
      </p>
    </div>
  );
}
