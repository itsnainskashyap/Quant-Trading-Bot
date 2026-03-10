import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp, TrendingDown, Target, AlertTriangle, Clock, Zap } from "lucide-react";

interface TradeAnalysis {
  pair: string;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  signal: 'BUY' | 'SELL';
  pnlPercent: number;
  pnlAmount: number;
  riskRewardRatio: number;
  timeInTrade: number;
  recommendation: 'HOLD' | 'CLOSE_PROFIT' | 'CLOSE_LOSS' | 'TRAILING_STOP';
  analysis: string;
}

interface LiveTradeAnalyzerProps {
  activeTrade?: {
    pair: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    signal: 'BUY' | 'SELL';
    tradeSize: number;
    createdAt: string;
  } | null;
  currentPrice?: number;
}

export function LiveTradeAnalyzer({ activeTrade, currentPrice }: LiveTradeAnalyzerProps) {
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTrade || !currentPrice) {
      setAnalysis(null);
      return;
    }

    const startTime = new Date(activeTrade.createdAt).getTime();
    const now = Date.now();
    const timeInTrade = Math.floor((now - startTime) / 1000);
    setElapsed(timeInTrade);

    const { entryPrice, stopLoss, takeProfit, signal, tradeSize } = activeTrade;
    
    const priceDiff = signal === 'BUY' 
      ? currentPrice - entryPrice 
      : entryPrice - currentPrice;
    
    const pnlPercent = (priceDiff / entryPrice) * 100;
    const pnlAmount = (priceDiff / entryPrice) * tradeSize;
    
    const riskAmount = Math.abs(entryPrice - stopLoss);
    const rewardAmount = Math.abs(takeProfit - entryPrice);
    const riskRewardRatio = rewardAmount / riskAmount;

    const progressToTP = signal === 'BUY'
      ? ((currentPrice - entryPrice) / (takeProfit - entryPrice)) * 100
      : ((entryPrice - currentPrice) / (entryPrice - takeProfit)) * 100;

    const progressToSL = signal === 'BUY'
      ? ((entryPrice - currentPrice) / (entryPrice - stopLoss)) * 100
      : ((currentPrice - entryPrice) / (stopLoss - entryPrice)) * 100;

    let recommendation: TradeAnalysis['recommendation'] = 'HOLD';
    let analysisText = '';

    if (progressToTP >= 100) {
      recommendation = 'CLOSE_PROFIT';
      analysisText = 'Take-profit target reached! Consider closing position to lock in profits.';
    } else if (progressToSL >= 100) {
      recommendation = 'CLOSE_LOSS';
      analysisText = 'Stop-loss level hit. Position should be closed to prevent further losses.';
    } else if (progressToTP >= 70) {
      recommendation = 'TRAILING_STOP';
      analysisText = 'Near target. Consider trailing stop to protect profits while allowing for more upside.';
    } else if (pnlPercent > 0) {
      analysisText = `Trade in profit. ${(100 - progressToTP).toFixed(1)}% remaining to take-profit target.`;
    } else {
      analysisText = `Trade in drawdown. ${(100 - progressToSL).toFixed(1)}% buffer before stop-loss.`;
    }

    if (timeInTrade > 600 && pnlPercent < 0.5) {
      analysisText += ' Trade taking longer than expected. Monitor closely.';
    }

    setAnalysis({
      pair: activeTrade.pair,
      entryPrice,
      currentPrice,
      stopLoss,
      takeProfit,
      signal,
      pnlPercent,
      pnlAmount,
      riskRewardRatio,
      timeInTrade,
      recommendation,
      analysis: analysisText,
    });
  }, [activeTrade, currentPrice]);

  useEffect(() => {
    if (!activeTrade) return;
    
    const timer = setInterval(() => {
      const startTime = new Date(activeTrade.createdAt).getTime();
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTrade]);

  if (!analysis || !activeTrade) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'CLOSE_PROFIT': return 'bg-green-500';
      case 'CLOSE_LOSS': return 'bg-red-500';
      case 'TRAILING_STOP': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const progressToTarget = analysis.signal === 'BUY'
    ? Math.max(0, Math.min(100, ((analysis.currentPrice - analysis.entryPrice) / (analysis.takeProfit - analysis.entryPrice)) * 100))
    : Math.max(0, Math.min(100, ((analysis.entryPrice - analysis.currentPrice) / (analysis.entryPrice - analysis.takeProfit)) * 100));

  return (
    <Card className="bg-white/[0.03] border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
            Live Trade Analyzer
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={analysis.signal === 'BUY' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {analysis.signal} {analysis.pair.replace('-USDT', '')}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {formatTime(elapsed)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Entry</p>
            <p className="text-sm font-mono text-gray-300" data-testid="text-entry-price">
              ${analysis.entryPrice.toFixed(2)}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <p className="text-[10px] text-gray-500">Current</p>
            <p className={`text-sm font-mono ${analysis.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="text-current-price">
              ${analysis.currentPrice.toFixed(2)}
            </p>
          </div>
          <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
            <p className="text-[10px] text-red-400">Stop Loss</p>
            <p className="text-sm font-mono text-red-400" data-testid="text-stop-loss">
              ${analysis.stopLoss.toFixed(2)}
            </p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
            <p className="text-[10px] text-green-400">Take Profit</p>
            <p className="text-sm font-mono text-green-400" data-testid="text-take-profit">
              ${analysis.takeProfit.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-red-400">SL</span>
            <span className="text-gray-400">Entry</span>
            <span className="text-green-400">TP</span>
          </div>
          <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30"
              style={{ width: '100%' }}
            />
            <div 
              className="absolute h-full w-1 bg-white rounded-full transition-all duration-300"
              style={{ left: `${Math.max(0, Math.min(100, 50 + progressToTarget / 2))}%` }}
            />
            <div 
              className="absolute h-full w-0.5 bg-gray-400"
              style={{ left: '50%' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            {analysis.pnlPercent >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="text-xs text-gray-400">Unrealized P&L</p>
              <p className={`text-lg font-bold ${analysis.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid="text-pnl">
                {analysis.pnlPercent >= 0 ? '+' : ''}{analysis.pnlPercent.toFixed(2)}%
                <span className="text-sm ml-1">
                  (${analysis.pnlAmount >= 0 ? '+' : ''}{analysis.pnlAmount.toFixed(2)})
                </span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Risk/Reward</p>
            <p className="text-sm font-semibold text-blue-400">
              1:{analysis.riskRewardRatio.toFixed(1)}
            </p>
          </div>
        </div>

        <div className={`flex items-start gap-2 p-2 rounded-lg ${getRecommendationColor(analysis.recommendation)}/10 border ${getRecommendationColor(analysis.recommendation).replace('bg-', 'border-')}/30`}>
          <Zap className={`w-4 h-4 mt-0.5 ${getRecommendationColor(analysis.recommendation).replace('bg-', 'text-')}`} />
          <div>
            <Badge className={`${getRecommendationColor(analysis.recommendation)} text-[10px] mb-1`}>
              {analysis.recommendation.replace('_', ' ')}
            </Badge>
            <p className="text-xs text-gray-300" data-testid="text-analysis">
              {analysis.analysis}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
