import { motion } from "framer-motion";

interface ConfidenceMeterProps {
  confidence: number;
  size?: "sm" | "md" | "lg";
}

export function ConfidenceMeter({ confidence, size = "md" }: ConfidenceMeterProps) {
  const getColor = (value: number) => {
    if (value >= 75) return "var(--success)";
    if (value >= 50) return "var(--warning)";
    return "var(--destructive)";
  };

  const dimensions = {
    sm: { width: 80, height: 80, stroke: 6 },
    md: { width: 120, height: 120, stroke: 8 },
    lg: { width: 160, height: 160, stroke: 10 },
  };

  const { width, height, stroke } = dimensions[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (confidence / 100) * circumference;
  const color = getColor(confidence);

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width, height }}
      data-testid="confidence-meter"
    >
      <svg
        width={width}
        height={height}
        className="transform -rotate-90"
      >
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          fill="none"
          stroke={`hsl(${color})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 8px hsl(${color} / 0.5))`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-bold font-mono"
          style={{ 
            fontSize: size === "lg" ? "2rem" : size === "md" ? "1.5rem" : "1rem",
            color: `hsl(${color})`
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          data-testid="text-confidence-value"
        >
          {confidence}%
        </motion.span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Confidence
        </span>
      </div>
    </div>
  );
}
