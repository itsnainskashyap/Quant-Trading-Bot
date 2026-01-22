import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  TrendingUp,
  TrendingDown,
  LogOut,
  User
} from "lucide-react";

interface PredictionData {
  predictions: Array<{
    id: number;
    pair: string;
    signal: string;
    entryPrice: number;
    exitPrice?: number;
    profitLoss?: number;
    outcome: string;
    createdAt: string;
  }>;
  stats: {
    wins: number;
    losses: number;
    neutral: number;
    pending: number;
    total: number;
    winRate: string;
    totalProfitLoss: number;
  };
}

interface SubscriptionData {
  plan: string;
  remaining: number;
  dailyLimit: number;
  isEarlyAdopter: boolean;
  canTrade: boolean;
}

export default function Profile() {
  const { user, logout, isLoggingOut, isLoading: authLoading } = useAuth();
  
  const { data: predictions, isLoading: predictionsLoading } = useQuery<PredictionData>({
    queryKey: ["/api/predictions"],
    enabled: !!user,
  });

  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto p-6">
          <Skeleton className="h-16 mb-6 bg-white/5" />
          <Skeleton className="h-32 mb-6 bg-white/5" />
          <Skeleton className="h-48 bg-white/5" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please log in to view your profile</p>
          <Button asChild>
            <a href="/api/login">Login</a>
          </Button>
        </div>
      </div>
    );
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
  const stats = predictions?.stats;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-white hover:bg-white/5">
              <Link href="/dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">TradeX</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="text-gray-400 hover:text-white hover:bg-white/5"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <Card className="bg-[#12121a] border-white/10 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-2xl font-bold">
                {initials}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold" data-testid="text-user-name">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-400 text-sm" data-testid="text-user-email">{user.email}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                subscription?.plan === 'pro' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {subscription?.plan === 'pro' ? 'Pro' : subscription?.isEarlyAdopter ? 'Free (Early Adopter)' : 'Free'}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#12121a] border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <div className="text-xs text-gray-500">Total Trades</div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats?.wins || 0}</div>
              <div className="text-xs text-gray-500">Wins</div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-white/10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{stats?.losses || 0}</div>
              <div className="text-xs text-gray-500">Losses</div>
            </CardContent>
          </Card>
          <Card className="bg-[#12121a] border-white/10">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${(stats?.totalProfitLoss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(stats?.totalProfitLoss || 0) >= 0 ? '+' : ''}{(stats?.totalProfitLoss || 0).toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500">Total P/L</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#12121a] border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Trade History</h2>
              <span className="text-xs text-gray-500">{predictions?.predictions.length || 0} trades</span>
            </div>
            
            {predictionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 bg-white/5" />
                <Skeleton className="h-16 bg-white/5" />
                <Skeleton className="h-16 bg-white/5" />
              </div>
            ) : predictions?.predictions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="mb-2">No trades yet</p>
                <p className="text-xs">Go to the dashboard and analyze a coin to make your first trade</p>
              </div>
            ) : (
              <div className="space-y-2">
                {predictions?.predictions.map((pred) => (
                  <div 
                    key={pred.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        pred.signal === 'BUY' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                      }`}>
                        {pred.signal === 'BUY' ? (
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{pred.pair}</div>
                        <div className="text-xs text-gray-500">
                          {pred.signal} @ ${pred.entryPrice?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {pred.outcome === 'PENDING' ? (
                        <div className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                          Pending
                        </div>
                      ) : pred.profitLoss !== null && pred.profitLoss !== undefined ? (
                        <div className={`text-lg font-mono font-semibold ${
                          pred.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {pred.profitLoss >= 0 ? '+' : ''}{pred.profitLoss.toFixed(2)}%
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">{pred.outcome}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(pred.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
          <p className="text-xs text-yellow-500/80 text-center">
            This is for educational purposes only. Past performance does not guarantee future results.
          </p>
        </div>
      </main>
    </div>
  );
}
