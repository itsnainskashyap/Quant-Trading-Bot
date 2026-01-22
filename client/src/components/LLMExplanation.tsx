import { useState } from "react";
import { MessageSquare, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface LLMExplanationProps {
  reasoning: string;
  warnings: string[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function LLMExplanation({ reasoning, warnings, isLoading, onRefresh }: LLMExplanationProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="overflow-hidden" data-testid="card-llm-explanation">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover-elevate"
        data-testid="button-toggle-explanation"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">Signal Analysis</span>
            <span className="text-[10px] text-muted-foreground">
              Multi-AI Consensus Summary
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={isLoading}
              data-testid="button-refresh-explanation"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {warnings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {warnings.map((warning, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="gap-1 bg-destructive/10 text-destructive border-destructive/30"
                    >
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs">{warning}</span>
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed" data-testid="text-reasoning">
                    {reasoning}
                  </p>
                )}
              </div>
              
              <p className="text-[10px] text-muted-foreground text-center">
                AI-assisted probability analysis for educational purposes only. Not financial advice.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
