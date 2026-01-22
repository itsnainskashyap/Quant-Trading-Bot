import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { History, TrendingUp, TrendingDown, Clock, RefreshCw, Trophy, XCircle, Minus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Prediction {
  id: string;
  pair: string;
  signal: string;
  confidence: number;
  entryPrice: number;
  exitPrice: number | null;
  exitWindowMinutes: number;
  exitTimestamp: string;
  reasoning: string;
  outcome: string;
  profitLoss: number | null;
  outcomeReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface PredictionStats {
  wins: number;
  losses: number;
  neutral: number;
  pending: number;
  skipped: number;
  total: number;
  completedTrades: number;
  winRate: string;
  totalProfitLoss: number;
}

interface PredictionsResponse {
  predictions: Prediction[];
  stats: PredictionStats;
}

export function PredictionHistory() {
  const { data, isLoading, refetch, isRefetching } = useQuery<PredictionsResponse>({
    queryKey: ['/api/predictions'],
    refetchInterval: 30000,
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/predictions/process', {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/predictions'] });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-prediction-history">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="w-4 h-4" />
            Your Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const predictions = data?.predictions || [];
  const stats = data?.stats;

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case "WIN": return <Trophy className="w-4 h-4 text-success" />;
      case "LOSS": return <XCircle className="w-4 h-4 text-destructive" />;
      case "NEUTRAL": return <Minus className="w-4 h-4 text-muted-foreground" />;
      case "PENDING": return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "WIN": return <Badge variant="default" className="bg-success/20 text-success border-success/30">WIN</Badge>;
      case "LOSS": return <Badge variant="default" className="bg-destructive/20 text-destructive border-destructive/30">LOSS</Badge>;
      case "NEUTRAL": return <Badge variant="outline">NEUTRAL</Badge>;
      case "PENDING": return <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">PENDING</Badge>;
      default: return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  return (
    <Card data-testid="card-prediction-history">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="w-4 h-4" />
            Your Trades
          </CardTitle>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => {
              processMutation.mutate();
              refetch();
            }}
            disabled={isRefetching || processMutation.isPending}
            data-testid="button-refresh-predictions"
          >
            <RefreshCw className={`w-3 h-3 ${isRefetching || processMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="p-2 rounded-md bg-success/10">
              <p className="text-lg font-bold text-success">{stats.wins}</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </div>
            <div className="p-2 rounded-md bg-destructive/10">
              <p className="text-lg font-bold text-destructive">{stats.losses}</p>
              <p className="text-xs text-muted-foreground">Losses</p>
            </div>
            <div className="p-2 rounded-md bg-muted">
              <p className="text-lg font-bold">{stats.winRate}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
          </div>
        )}
        
        {predictions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No trades yet</p>
            <p className="text-xs">Take a trade to see your history</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {predictions.slice(0, 10).map((prediction) => (
              <div 
                key={prediction.id}
                className="p-3 rounded-md bg-muted/50 space-y-2"
                data-testid={`prediction-item-${prediction.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {prediction.signal === "BUY" ? (
                      <TrendingUp className="w-4 h-4 text-success" />
                    ) : prediction.signal === "SELL" ? (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    ) : null}
                    <span className="text-sm font-medium">{prediction.pair}</span>
                    <Badge variant="outline" className="text-xs">
                      {prediction.signal}
                    </Badge>
                  </div>
                  {getOutcomeBadge(prediction.outcome)}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Entry: </span>
                    <span className="font-mono">${prediction.entryPrice.toFixed(2)}</span>
                  </div>
                  {prediction.exitPrice && (
                    <div>
                      <span className="text-muted-foreground">Exit: </span>
                      <span className="font-mono">${prediction.exitPrice.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                {prediction.profitLoss !== null && (
                  <div className={`text-sm font-medium ${prediction.profitLoss > 0 ? 'text-success' : prediction.profitLoss < 0 ? 'text-destructive' : ''}`}>
                    {prediction.profitLoss > 0 ? '+' : ''}{prediction.profitLoss.toFixed(2)}%
                  </div>
                )}
                
                {prediction.outcomeReason && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {prediction.outcomeReason}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(prediction.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
