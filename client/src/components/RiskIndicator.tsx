import { ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RiskGrade } from "@shared/schema";

interface RiskIndicatorProps {
  grade: RiskGrade;
  showLabel?: boolean;
}

export function RiskIndicator({ grade, showLabel = true }: RiskIndicatorProps) {
  const config = {
    LOW: {
      icon: ShieldCheck,
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/30",
      label: "Low Risk",
    },
    MEDIUM: {
      icon: Shield,
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/30",
      label: "Medium Risk",
    },
    HIGH: {
      icon: ShieldAlert,
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      label: "High Risk",
    },
  };

  const { icon: Icon, color, bg, border, label } = config[grade];

  return (
    <Badge 
      variant="outline" 
      className={`gap-1.5 ${bg} ${border} ${color}`}
      data-testid="badge-risk"
    >
      <Icon className="w-3.5 h-3.5" />
      {showLabel && <span data-testid="text-risk-grade">{label}</span>}
    </Badge>
  );
}
