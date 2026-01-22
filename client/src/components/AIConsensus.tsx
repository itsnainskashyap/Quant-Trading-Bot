import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Sparkles, Brain, Cpu, Zap } from "lucide-react";
import type { ConsensusResult, AIProviderAnalysis } from "@shared/schema";

interface AIConsensusProps {
  consensus: ConsensusResult | null;
  isLoading: boolean;
}

const providerIcons: Record<string, React.ElementType> = {
  "OpenAI GPT-4o": Sparkles,
  "Anthropic Claude": Brain,
  "Google Gemini": Zap,
};

const providerColors: Record<string, string> = {
  "OpenAI GPT-4o": "text-emerald-400",
  "Anthropic Claude": "text-orange-400",
  "Google Gemini": "text-blue-400",
};

function ProviderCard({ analysis }: { analysis: AIProviderAnalysis }) {
  const Icon = providerIcons[analysis.provider] || Cpu;
  const colorClass = providerColors[analysis.provider] || "text-muted-foreground";
  
  const signalColor = analysis.signal === "BUY" 
    ? "bg-success/20 text-success border-success/30"
    : analysis.signal === "SELL"
    ? "bg-destructive/20 text-destructive border-destructive/30"
    : "bg-warning/20 text-warning border-warning/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 bg-muted/30 rounded-lg border border-border/50"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <span className="text-xs font-medium">{analysis.provider}</span>
        </div>
        {analysis.success ? (
          <CheckCircle2 className="w-3 h-3 text-success" />
        ) : (
          <XCircle className="w-3 h-3 text-destructive" />
        )}
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className={`text-[10px] ${signalColor}`}>
          {analysis.signal}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {analysis.confidence}% confidence
        </span>
      </div>
      
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {analysis.reasoning}
      </p>
    </motion.div>
  );
}

export function AIConsensus({ consensus, isLoading }: AIConsensusProps) {
  if (isLoading) {
    return (
      <Card className="p-4" data-testid="card-ai-consensus-loading">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Analyzing with 3 AI Providers...</h3>
            <p className="text-xs text-muted-foreground">OpenAI + Anthropic + Gemini</p>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!consensus) {
    return (
      <Card className="p-4" data-testid="card-ai-consensus-empty">
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground">
            Click "Multi-AI Analysis" to get consensus from 3 AI providers
          </p>
        </div>
      </Card>
    );
  }

  const agreementColor = consensus.hasConsensus
    ? "text-success"
    : consensus.agreementLevel >= 50
    ? "text-warning"
    : "text-destructive";

  const consensusSignalColor = consensus.consensusSignal === "BUY"
    ? "bg-success text-success-foreground"
    : consensus.consensusSignal === "SELL"
    ? "bg-destructive text-destructive-foreground"
    : "bg-warning text-warning-foreground";

  return (
    <Card className="p-4" data-testid="card-ai-consensus">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium">Multi-AI Consensus</h3>
            <p className="text-[10px] text-muted-foreground">
              3 World-Class AI Providers
            </p>
          </div>
        </div>
        <Badge className={consensusSignalColor} data-testid="badge-consensus-signal">
          {consensus.consensusSignal}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <p className={`text-lg font-bold font-mono ${agreementColor}`}>
            {consensus.agreementLevel}%
          </p>
          <p className="text-[10px] text-muted-foreground">Agreement</p>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <p className="text-lg font-bold font-mono text-primary">
            {consensus.consensusConfidence}%
          </p>
          <p className="text-[10px] text-muted-foreground">Confidence</p>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <Badge 
            variant="outline" 
            className={
              consensus.consensusRisk === "LOW" 
                ? "border-success/50 text-success" 
                : consensus.consensusRisk === "MEDIUM"
                ? "border-warning/50 text-warning"
                : "border-destructive/50 text-destructive"
            }
          >
            {consensus.consensusRisk}
          </Badge>
          <p className="text-[10px] text-muted-foreground mt-1">Risk</p>
        </div>
      </div>

      {consensus.warnings.length > 0 && (
        <div className="mb-4 p-2 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-warning" />
            <span className="text-[10px] font-medium text-warning">Safety Warnings</span>
          </div>
          <ul className="space-y-0.5">
            {consensus.warnings.map((warning, i) => (
              <li key={i} className="text-[10px] text-warning/80">• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
          Individual AI Analysis
        </p>
        {consensus.providers.map((provider, i) => (
          <ProviderCard key={i} analysis={provider} />
        ))}
      </div>

      <div className="mt-4 p-2 bg-muted/20 rounded-lg">
        <p className="text-[10px] text-muted-foreground italic">
          {consensus.hasConsensus 
            ? "Strong consensus achieved - multiple AI providers agree on this signal."
            : "Weak or no consensus - staying safe with NO_TRADE to protect capital."}
        </p>
      </div>
    </Card>
  );
}
