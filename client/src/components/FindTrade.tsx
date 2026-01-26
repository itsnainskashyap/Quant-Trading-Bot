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
  Crosshair
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface FindTradeProps {
  pair: string;
  isPro: boolean;
}

interface TradeResult {
  found: boolean;
  signal: 'BUY' | 'SELL' | null;
  confidence: number;
  pair: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  searchDuration: number;
  attempts: number;
}

export function FindTrade({ pair, isPro }: FindTradeProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [status, setStatus] = useState<string>("Waiting to start...");
  const [result, setResult] = useState<TradeResult | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const searchRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);

  const MAX_SEARCH_TIME = 30 * 60; // 30 minutes in seconds
  const MIN_CONFIDENCE = 90; // 90% minimum confidence
  const SCAN_INTERVAL = 15; // 15 seconds between scans

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSearching && !cancelled) {
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimeElapsed(elapsed);
        setProgress((elapsed / MAX_SEARCH_TIME) * 100);
        
        if (elapsed >= MAX_SEARCH_TIME) {
          stopSearch("timeout");
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSearching, cancelled]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stopSearch = (reason: "timeout" | "cancelled" | "found") => {
    searchRef.current = false;
    setIsSearching(false);
    if (reason === "timeout") {
      setStatus("Search timed out - no high-confidence trade found");
    } else if (reason === "cancelled") {
      setStatus("Search cancelled");
    }
  };

  const runSearch = async () => {
    setIsSearching(true);
    setCancelled(false);
    setResult(null);
    setCurrentAttempt(0);
    setProgress(0);
    setTimeElapsed(0);
    startTimeRef.current = Date.now();
    searchRef.current = true;

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

    let attempt = 0;
    while (searchRef.current && timeElapsed < MAX_SEARCH_TIME) {
      attempt++;
      setCurrentAttempt(attempt);
      setStatus(statusMessages[attempt % statusMessages.length]);

      try {
        const response = await apiRequest('POST', '/api/find-trade', {
          pair: pair,
          minConfidence: MIN_CONFIDENCE,
        });

        const data = await response.json();

        if (data.found && data.confidence >= MIN_CONFIDENCE) {
          setResult({
            found: true,
            signal: data.signal,
            confidence: data.confidence,
            pair: pair,
            entryPrice: data.entryPrice,
            stopLoss: data.stopLoss,
            takeProfit: data.takeProfit,
            reasoning: data.reasoning,
            searchDuration: Math.floor((Date.now() - startTimeRef.current) / 1000),
            attempts: attempt,
          });
          setStatus(`Trade found after ${attempt} scans!`);
          stopSearch("found");
          return;
        }
      } catch (error) {
        console.error("Find trade error:", error);
      }

      // Wait before next scan
      if (searchRef.current) {
        await new Promise(resolve => setTimeout(resolve, SCAN_INTERVAL * 1000));
      }
    }
  };

  const cancelSearch = () => {
    setCancelled(true);
    stopSearch("cancelled");
  };

  if (!isPro) {
    return (
      <Card className="bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border-amber-500/20">
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
              Auto-scan until a 90%+ confidence trade is found
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

  return (
    <Card className="bg-gradient-to-br from-[#12121a] to-[#1a1a2e] border-amber-500/30 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-md flex items-center gap-2">
            <div className="relative">
              <Target className={`w-5 h-5 text-amber-400 ${isSearching ? 'animate-pulse' : ''}`} />
              {isSearching && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              )}
            </div>
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent font-bold">
              Find Trade
            </span>
            <Badge className="bg-amber-500/20 text-amber-400 text-xs">
              90%+ Accuracy
            </Badge>
          </CardTitle>
          {!isSearching && !result && (
            <Button
              onClick={runSearch}
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              data-testid="button-find-trade"
            >
              <Search className="w-4 h-4 mr-1" />
              Start Search
            </Button>
          )}
          {isSearching && (
            <Button
              onClick={cancelSearch}
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              data-testid="button-cancel-search"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Searching State */}
        {isSearching && (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="relative h-2 bg-[#0a0a0f] rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>

            {/* Timer and Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{formatTime(timeElapsed)} / {formatTime(MAX_SEARCH_TIME)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Scan #{currentAttempt}</span>
              </div>
            </div>

            {/* Status Message */}
            <div className="flex items-center gap-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
              <div className="relative">
                <Crosshair className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <p className="text-amber-200 text-sm font-medium">{status}</p>
                <p className="text-gray-500 text-xs">Looking for {pair} with 90%+ confidence</p>
              </div>
            </div>

            {/* Scanning Animation */}
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

        {/* Result Found */}
        {result && result.found && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${result.signal === 'BUY' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {result.signal === 'BUY' ? (
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  )}
                  <span className={`text-2xl font-bold ${result.signal === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.signal}
                  </span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 text-lg px-3">
                  {result.confidence}%
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                <div className="bg-[#0a0a0f]/50 p-2 rounded-lg text-center">
                  <p className="text-gray-500 text-xs">Entry</p>
                  <p className="text-white font-mono font-medium">${result.entryPrice.toFixed(4)}</p>
                </div>
                <div className="bg-[#0a0a0f]/50 p-2 rounded-lg text-center">
                  <p className="text-gray-500 text-xs">Stop Loss</p>
                  <p className="text-red-400 font-mono font-medium">${result.stopLoss.toFixed(4)}</p>
                </div>
                <div className="bg-[#0a0a0f]/50 p-2 rounded-lg text-center">
                  <p className="text-gray-500 text-xs">Take Profit</p>
                  <p className="text-emerald-400 font-mono font-medium">${result.takeProfit.toFixed(4)}</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm">{result.reasoning}</p>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Found in {formatTime(result.searchDuration)}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {result.attempts} scans
                </span>
              </div>
            </div>

            <Button
              onClick={() => setResult(null)}
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

        {/* Idle State */}
        {!isSearching && !result && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Continuous scan until 90%+ confidence trade is found</span>
            </div>
            <p className="text-gray-600 text-xs mt-1">Maximum search time: 30 minutes</p>
          </div>
        )}

        {/* Cancelled/Timeout State */}
        {!isSearching && !result && cancelled && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20 mt-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-300 text-sm">{status}</span>
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
