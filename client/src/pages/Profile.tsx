import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  TrendingUp,
  TrendingDown,
  LogOut,
  BarChart3,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Link2,
  Crown,
  Zap,
  Infinity,
  FileText,
  ChevronRight,
  Shield,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";
import { ExchangeLogo } from "@/components/ExchangeLogos";
import { PaymentModal } from "@/components/PaymentModal";
import { TermsContent } from "@/components/TermsAndConditions";

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const { data: kycData } = useQuery<{ status: string }>({
    queryKey: ["/api/kyc/status"],
    enabled: !!user,
  });

  const { data: predictions, isLoading: predictionsLoading } = useQuery<PredictionData>({
    queryKey: ["/api/predictions"],
    enabled: !!user,
  });

  const { data: subscription } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const isPro = subscription?.plan === 'pro';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-2xl mx-auto p-6">
          <Skeleton className="h-16 mb-6 bg-white/5" />
          <Skeleton className="h-32 mb-6 bg-white/5" />
          <Skeleton className="h-48 bg-white/5" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
  const winRate = parseFloat(stats?.winRate || '0');

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/5 bg-black/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5" data-testid="link-back-dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <img src={logoImage} alt="TradeX AI" className="h-7 w-auto" />
          </div>
          <Button 
            variant="ghost" 
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isLoggingOut ? "..." : "Logout"}
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Card className="bg-white/[0.03] border-white/5 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/[0.12] flex items-center justify-center text-xl font-bold shadow-none">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold truncate" data-testid="text-user-name">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-400 text-sm truncate" data-testid="text-user-email">{user.email}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isPro 
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              }`}>
                {isPro ? (
                  <span className="flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    PRO
                  </span>
                ) : 'FREE'}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-white/[0.03] border-white/5">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BarChart3 className="w-4 h-4 text-gray-500" />
                <span className="text-xl font-bold">{stats?.total || 0}</span>
              </div>
              <div className="text-xs text-gray-500">Total Trades</div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03] border-white/5">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xl font-bold text-emerald-400">{stats?.wins || 0}</span>
              </div>
              <div className="text-xs text-gray-500">Wins</div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03] border-white/5">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xl font-bold text-red-400">{stats?.losses || 0}</span>
              </div>
              <div className="text-xs text-gray-500">Losses</div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03] border-white/5">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Target className="w-4 h-4 text-blue-500" />
                <span className={`text-xl font-bold ${(stats?.totalProfitLoss || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(stats?.totalProfitLoss || 0) >= 0 ? '+' : ''}{(stats?.totalProfitLoss || 0).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-gray-500">Total P/L</div>
            </CardContent>
          </Card>
        </div>

        {stats && stats.total > 0 && (
          <Card className="bg-white/[0.03] border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Win Rate</span>
                <span className={`text-sm font-medium ${winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {winRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${winRate >= 50 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                  style={{ width: `${Math.min(winRate, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pro Subscription Card */}
        {isPro ? (
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-amber-400">Pro Member</h2>
                  <p className="text-sm text-gray-400">Unlimited access activated</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-gray-300">Unlimited Analyses</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-gray-300">Auto-Trade</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-gray-300">Priority Support</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-gray-300">All Features</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/[0.03] border-white/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-red-500 to-red-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
              95% OFF
            </div>
            <CardContent className="p-5">
              <div className="text-center mb-5">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">TradeX Pro</h2>
                <p className="text-gray-400 text-sm">Unlock unlimited AI trading power</p>
              </div>
              
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="text-center">
                  <span className="text-3xl text-gray-500 line-through font-bold">$199</span>
                </div>
                <div className="text-center">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">10</span>
                    <span className="text-xl font-bold text-amber-400">USDT</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">Per month</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <Infinity className="w-5 h-5 text-neutral-400" />
                  <span className="text-sm text-gray-300">Unlimited AI Analyses</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="text-sm text-gray-300">Auto-Trade with AI</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <Target className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-gray-300">Multi-AI Consensus Signals</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <Link2 className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-gray-300">8+ Exchange Integration</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5 mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="text-sm text-gray-400">Today's AI Analyses</span>
                </div>
                <span className="text-sm font-mono">
                  <span className={subscription?.remaining && subscription.remaining > 3 ? 'text-emerald-400' : 'text-amber-400'}>
                    {subscription?.remaining ?? 10}
                  </span>
                  <span className="text-gray-600">/{subscription?.dailyLimit ?? 10}</span>
                </span>
              </div>
              
              <Button 
                onClick={() => setShowPaymentModal(true)}
                className="w-full h-12 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black font-bold text-base shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
                data-testid="button-upgrade-pro"
              >
                <Crown className="w-5 h-5 mr-2" />
                Upgrade to Pro - 10 USDT
              </Button>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                Monthly subscription - Pay with TRC20 or BEP20 network
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/[0.03] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Trade History</h2>
              <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
                {predictions?.predictions.length || 0} trades
              </span>
            </div>
            
            {predictionsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 bg-white/5" />
                <Skeleton className="h-14 bg-white/5" />
                <Skeleton className="h-14 bg-white/5" />
              </div>
            ) : predictions?.predictions.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 mb-1">No trades yet</p>
                <p className="text-xs text-gray-500">Go to the dashboard and analyze a coin to make your first trade</p>
              </div>
            ) : (
              <div className="space-y-2">
                {predictions?.predictions.map((pred) => (
                  <div 
                    key={pred.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                    data-testid={`trade-item-${pred.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        pred.signal === 'BUY' ? 'bg-emerald-500/15' : 'bg-red-500/15'
                      }`}>
                        {pred.signal === 'BUY' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{pred.pair}</div>
                        <div className="text-xs text-gray-500">
                          {pred.signal} @ ${pred.entryPrice?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {pred.outcome === 'PENDING' ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs">
                          <Clock className="w-3 h-3" />
                          Pending
                        </div>
                      ) : pred.profitLoss !== null && pred.profitLoss !== undefined ? (
                        <div className={`text-base font-mono font-semibold ${
                          pred.profitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {pred.profitLoss >= 0 ? '+' : ''}{pred.profitLoss.toFixed(2)}%
                        </div>
                      ) : (
                        <div className={`text-xs px-2 py-1 rounded-lg ${
                          pred.outcome === 'WIN' ? 'bg-emerald-500/10 text-emerald-400' : 
                          pred.outcome === 'LOSS' ? 'bg-red-500/10 text-red-400' : 
                          'bg-white/5 text-gray-400'
                        }`}>
                          {pred.outcome}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-600 mt-1">
                        {new Date(pred.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-blue-400" />
              <h2 className="font-semibold">Supported Exchanges</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Connect any of these exchanges to enable auto-trading with TradeX AI signals.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'tradex', name: 'TradeX Broker' },
                { id: 'binance', name: 'Binance' },
                { id: 'bybit', name: 'Bybit' },
                { id: 'okx', name: 'OKX' },
                { id: 'kucoin', name: 'KuCoin' },
                { id: 'bitget', name: 'Bitget' },
                { id: 'gateio', name: 'Gate.io' },
                { id: 'kraken', name: 'Kraken' },
                { id: 'mexc', name: 'MEXC' },
              ].map(exchange => (
                <div 
                  key={exchange.id}
                  className="flex flex-col items-center p-3 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <ExchangeLogo exchange={exchange.id} className="w-8 h-8 mb-1" />
                  <span className="text-[10px] text-gray-400">{exchange.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/">
                <Button size="sm" className="w-full bg-gradient-to-r from-blue-500 to-purple-600">
                  <Link2 className="w-3 h-3 mr-2" />
                  Connect Exchange in Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/5">
          <CardContent className="p-4">
            <Link href="/kyc">
              <button
                className="w-full flex items-center justify-between group"
                data-testid="button-profile-kyc"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    kycData?.status === "verified" ? "bg-emerald-500/10" :
                    kycData?.status === "pending" ? "bg-amber-500/10" :
                    "bg-red-500/10"
                  }`}>
                    {kycData?.status === "verified" ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : kycData?.status === "pending" ? (
                      <Shield className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">KYC Verification</div>
                    <div className={`text-xs ${
                      kycData?.status === "verified" ? "text-emerald-400" :
                      kycData?.status === "pending" ? "text-amber-400" :
                      "text-red-400"
                    }`}>
                      {kycData?.status === "verified" ? "Identity verified" :
                       kycData?.status === "pending" ? "Verification pending" :
                       "Not verified - Required for deposits"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/5">
          <CardContent className="p-4">
            <button
              onClick={() => setShowTermsModal(true)}
              className="w-full flex items-center justify-between group"
              data-testid="button-profile-terms"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <FileText className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-white">Terms & Conditions</div>
                  <div className="text-xs text-gray-500">View platform rules and policies</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </button>
          </CardContent>
        </Card>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-400/70 leading-relaxed">
              Trade at your own risk. Past performance does not guarantee future results. This is not financial advice.
            </p>
          </div>
        </div>
      </main>

      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
      />

      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="bg-white/[0.03] border-white/[0.06] text-white max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white">Terms & Conditions</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <TermsContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
