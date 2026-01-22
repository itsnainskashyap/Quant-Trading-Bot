import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExitCountdownProps {
  exitTimestamp: number;
  onExpired?: () => void;
}

export function ExitCountdown({ exitTimestamp, onExpired }: ExitCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, exitTimestamp - now);
      setTimeLeft(remaining);
      setIsUrgent(remaining < 60000 && remaining > 0);
      
      if (remaining === 0 && onExpired) {
        onExpired();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [exitTimestamp, onExpired]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { minutes, seconds };
  };

  const { minutes, seconds } = formatTime(timeLeft);
  const isExpired = timeLeft === 0;
  const progress = exitTimestamp > Date.now() 
    ? (timeLeft / (exitTimestamp - Date.now() + timeLeft)) * 100 
    : 0;

  return (
    <div 
      className={`relative overflow-hidden rounded-lg p-4 transition-colors duration-300 ${
        isExpired 
          ? 'bg-muted/50' 
          : isUrgent 
            ? 'bg-destructive/10 glow-destructive' 
            : 'bg-card border border-border'
      }`}
      data-testid="exit-countdown"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isUrgent ? (
              <motion.div
                key="urgent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
              </motion.div>
            ) : (
              <motion.div
                key="normal"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Clock className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Exit Window
            </span>
            <span className={`text-xs ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`}>
              {isExpired ? 'Expired' : isUrgent ? 'Exit Now!' : 'Time Remaining'}
            </span>
          </div>
        </div>
        
        <div className="flex items-baseline gap-0.5 font-mono">
          <motion.span
            key={`min-${minutes}`}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`text-2xl font-bold ${
              isExpired 
                ? 'text-muted-foreground' 
                : isUrgent 
                  ? 'text-destructive' 
                  : 'text-foreground'
            }`}
            data-testid="text-countdown-minutes"
          >
            {String(minutes).padStart(2, '0')}
          </motion.span>
          <span className={`text-xl ${isUrgent ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}>
            :
          </span>
          <motion.span
            key={`sec-${seconds}`}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`text-2xl font-bold ${
              isExpired 
                ? 'text-muted-foreground' 
                : isUrgent 
                  ? 'text-destructive' 
                  : 'text-foreground'
            }`}
            data-testid="text-countdown-seconds"
          >
            {String(seconds).padStart(2, '0')}
          </motion.span>
        </div>
      </div>
      
      {!isExpired && (
        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isUrgent ? 'bg-destructive' : 'bg-primary'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </div>
  );
}
