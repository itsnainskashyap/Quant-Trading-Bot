import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Search, 
  Target, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle, 
  Zap, 
  Lock,
  Award,
  Activity,
  AlertTriangle,
  Crosshair,
  ServerCog
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface FindTradeProps {
  pair: string;
  isPro: boolean;
}

interface ScanData {
  id: string;
  userId: string;
  pair: string;
  status: string;
  minConfidence: number;
  attempts: number;
  resultSignal: string | null;
  resultConfidence: number | null;
  resultEntryPrice: number | null;
  resultStopLoss: number | null;
  resultTakeProfit: number | null;
  resultReasoning: string | null;
  startedAt: string;
  expiresAt: string;
  completedAt: string | null;
}

export function FindTrade({ pair, isPro }: FindTradeProps) {
  const [scan, setScan] = useState<ScanData | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_SEARCH_TIME = 30 * 60; // 30 minutes in seconds
  const POLL_INTERVAL = 3000; // Poll every 3 seconds

  const statusMessages = [
    "Scanning market conditions...",
    "Analyzing price action...",
    "Checking technical indicators...",
    "Evaluating trend strength...",
    "Running AI consensus check...",
    "Verifying signal quality...",
    "Calculating entry points...",
    "Assessing risk levels...",
  ];

  useEffect(() => {
    checkScanStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (isActive && scan) {
      pollRef.current = setInterval(checkScanStatus, POLL_INTERVAL);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [isActive]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isActive && scan) {
      timer = setInterval(() => {
        const startTime = new Date(scan.startedAt).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeElapsed(elapsed);
        setProgress(Math.min((elapsed / MAX_SEARCH_TIME) * 100, 100));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, scan]);

  const checkScanStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/find-trade/status');
      const data = await response.json();
      
      if (data.scan) {
        setScan(data.scan);
        setIsActive(data.active);
        
        if (!data.active && data.scan.status !== 'scanning') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } else {
        setScan(null);
        setIsActive(false);
      }
    } catch (error) {
      console.error("Status check error:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startScan = async () => {
    setIsStarting(true);
    try {
      const response = await apiRequest('POST', '/api/find-trade/start', {
        pair,
        minConfidence: 75,
      });
      const data = await response.json();
      setScan(data.scan);
      setIsActive(true);
      setTimeElapsed(0);
      setProgress(0);
    } catch (error) {
      console.error("Start scan error:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const cancelScan = async () => {
    setIsCancelling(true);
    try {
      await apiRequest('POST', '/api/find-trade/cancel');
      setIsActive(false);
      await checkScanStatus();
    } catch (error) {
      console.error("Cancel error:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  const resetSearch = () => {
    setScan(null);
    setIsActive(false);
    setTimeElapsed(0);
    setProgress(0);
  };

  if (!isPro) {
    return (
      <Card className="bg-white/[0.03] border-amber-500/20">
        <CardContent className="py-6">
          <div className="text-center">
            <div className="relative inline-block">
              <Target className="w-12 h-12 mx-auto mb-3 text-amber-400/30" />
              <Lock className="w-5 h-5 absolute -right-1 -bottom-1 text-amber-400" />
            </div>
            <h3 className="text-md font-semibold text-white mb-1 flex items-center justify-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Find Trade - Pro Feature
            </h3>
            <p className="text-gray-400 text-sm mb-3">
              Server-side auto-scan until 90%+ confidence trade is found
            </p>
            <Link href="/payment">
              <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500">
                <Zap className="w-3 h-3 mr-1" />
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const showResult = scan && scan.status === 'found' && scan.resultSignal;
  const showTimeout = scan && scan.status === 'timeout';
  const showCancelled = scan && scan.status === 'cancelled';
  const showIdle = !isActive && !showResult && !showTimeout && !showCancelled;

  return (
    <Card className="bg-white/[0.03] border-amber-500/30 overflow-hidden min-w-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap min-w-0">
            <div className="relative flex-shrink-0">
              <Target className={`w-5 h-5 text-amber-400 ${isActive ? 'animate-pulse' : ''}`} />
              {isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              )}
            </div>
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent font-bold truncate">
              Find Trade
            </span>
            <Badge className="bg-amber-500/20 text-amber-400 text-[10px] flex-shrink-0">
              <ServerCog className="w-3 h-3 mr-1" />
              Server
            </Badge>
          </CardTitle>
          {showIdle && (
            <Button
              onClick={startScan}
              size="sm"
              disabled={isStarting}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              data-testid="button-find-trade"
            >
              {isStarting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-1" />
              )}
              Start Search
            </Button>
          )}
          {isActive && (
            <Button
              onClick={cancelScan}
              size="sm"
              variant="outline"
              disabled={isCancelling}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              data-testid="button-cancel-search"
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-1" />
              )}
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isActive && scan && (
          <div className="space-y-4">
            <div className="relative h-2 bg-black rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{formatTime(timeElapsed)} / {formatTime(MAX_SEARCH_TIME)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Activity className="w-4 h-4 text-neutral-400" />
                <span>Scan #{scan.attempts || 0}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
              <div className="relative flex-shrink-0">
                <Crosshair className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-amber-200 text-sm font-medium truncate">
                  {statusMessages[(scan.attempts || 0) % statusMessages.length]}
                </p>
                <p className="text-gray-500 text-xs truncate">
                  Looking for {scan.pair} 75%+ (persists in background)
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-8 bg-gradient-to-t from-amber-500 to-orange-500 rounded-full animate-pulse"
                  style={{ 
                    animationDelay: `${i * 0.15}s`,
                    opacity: 0.3 + (i * 0.15),
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {showResult && scan && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${scan.resultSignal === 'BUY' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {scan.resultSignal === 'BUY' ? (
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  )}
                  <span className={`text-2xl font-bold ${scan.resultSignal === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {scan.resultSignal}
                  </span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 text-lg px-3">
                  {scan.resultConfidence}%
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                <div className="bg-black/50 p-2 rounded-lg text-center">
                  <p className="text-gray-500 text-xs">Entry</p>
                  <p className="text-white font-mono font-medium">${scan.resultEntryPrice?.toFixed(4)}</p>
                </div>
                <div className="bg-black/50 p-2 rounded-lg text-center">
                  <p className="text-gray-500 text-xs">Stop Loss</p>
                  <p className="text-red-400 font-mono font-medium">${scan.resultStopLoss?.toFixed(4)}</p>
                </div>
                <div className="bg-black/50 p-2 rounded-lg text-center">
                  <p className="text-gray-500 text-xs">Take Profit</p>
                  <p className="text-emerald-400 font-mono font-medium">${scan.resultTakeProfit?.toFixed(4)}</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm break-words line-clamp-3">{scan.resultReasoning}</p>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {scan.completedAt && formatTime(Math.floor((new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000))}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {scan.attempts} scans
                </span>
              </div>
            </div>

            <Button
              onClick={resetSearch}
              variant="outline"
              size="sm"
              className="w-full border-amber-500/30 text-amber-400"
              data-testid="button-new-search"
            >
              <Search className="w-4 h-4 mr-2" />
              Start New Search
            </Button>
          </div>
        )}

        {showIdle && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm flex-wrap">
              <ServerCog className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-xs">Persists even if you close browser</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">Max: 30 min | 75%+ confidence</p>
          </div>
        )}

        {showTimeout && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-sm">Search timed out - no high-confidence trade found</span>
            </div>
            <Button
              onClick={resetSearch}
              variant="outline"
              size="sm"
              className="w-full border-amber-500/30 text-amber-400"
            >
              <Search className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}

        {showCancelled && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">Search cancelled</span>
            </div>
            <Button
              onClick={resetSearch}
              variant="outline"
              size="sm"
              className="w-full border-amber-500/30 text-amber-400"
            >
              <Search className="w-4 h-4 mr-2" />
              Start New Search
            </Button>
          </div>
        )}
      </CardContent>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </Card>
  );
}
