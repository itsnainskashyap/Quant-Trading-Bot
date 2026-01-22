import { Brain, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import type { ModelScore } from "@shared/schema";

interface ModelScoresProps {
  scores: ModelScore[];
}

const modelIcons: Record<string, typeof Brain> = {
  "Trend Detection": TrendingUp,
  "Momentum Confirmation": Zap,
  "Volatility Filter": AlertTriangle,
  "Liquidity Trap Detector": Brain,
};

export function ModelScores({ scores }: ModelScoresProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-success";
    if (score >= 40) return "bg-warning";
    return "bg-destructive";
  };

  if (scores.length === 0) {
    return (
      <Card className="p-4" data-testid="card-model-scores-empty">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          AI Model Ensemble
        </h3>
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <Brain className="w-8 h-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground">
            Awaiting signal generation
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Model scores will appear when analyzing market conditions
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4" data-testid="card-model-scores">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        AI Model Ensemble
      </h3>
      
      <div className="space-y-3">
        {scores.map((model, index) => {
          const Icon = modelIcons[model.name] || Brain;
          
          return (
            <motion.div
              key={model.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium">{model.name}</span>
                </div>
                <span className={`text-sm font-mono font-bold ${getScoreColor(model.score)}`}>
                  {model.score}%
                </span>
              </div>
              
              <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-8">
                <motion.div
                  className={`h-full rounded-full ${getScoreBg(model.score)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${model.score}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                />
              </div>
              
              <p className="text-[10px] text-muted-foreground mt-1 ml-8 opacity-0 group-hover:opacity-100 transition-opacity">
                {model.description}
              </p>
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Aggregate Threshold</span>
          <span className="font-mono text-primary">≥ 65%</span>
        </div>
      </div>
    </Card>
  );
}
