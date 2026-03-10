import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  BarChart3,
  History,
  Settings,
  LogOut,
  User,
  Shield,
  ShieldCheck,
  Cpu,
  Award,
  Coins,
  CreditCard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Crown,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";

function BalanceDonut({ tradexPct, walletPct }: { tradexPct: number; walletPct: number }) {
  const size = 120;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const tradexArc = (tradexPct / 100) * circ;
  const walletArc = (walletPct / 100) * circ;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#10b981" strokeWidth={stroke}
        strokeDasharray={`${tradexArc} ${circ - tradexArc}`} strokeDashoffset="0" strokeLinecap="round" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#6366f1" strokeWidth={stroke}
        strokeDasharray={`${walletArc} ${circ - walletArc}`} strokeDashoffset={`${-tradexArc}`} strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: tradexData, isLoading: tradexLoading } = useQuery<{ balance: number }>({
    queryKey: ['/api/tradex/balance'],
    refetchInterval: 10000,
  });
  const tradexBalance = tradexData?.balance || 0;

  const { data: walletData, isLoading: walletLoading } = useQuery<{ balance: number }>({
    queryKey: ['/api/user/balance'],
    refetchInterval: 10000,
  });
  const walletBalance = walletData?.balance || 0;
  const balancesLoading = tradexLoading || walletLoading;

  const { data: subscription } = useQuery<{ plan: string; remaining: number; dailyLimit: number; isPro?: boolean }>({
    queryKey: ['/api/subscription'],
  });
  const isPro = subscription?.isPro || subscription?.plan === 'pro';

  const { data: kycData } = useQuery<{ status: string }>({
    queryKey: ['/api/kyc/status'],
  });
  const kycStatus = kycData?.status || 'not_submitted';

  const { data: predictionsData, isLoading: predictionsLoading } = useQuery<{ predictions: any[]; stats: any }>({
    queryKey: ['/api/predictions'],
    refetchInterval: 10000,
  });

  const { data: tradexTrades } = useQuery<any[]>({
    queryKey: ['/api/tradex/trades'],
    refetchInterval: 5000,
  });

  const { data: tradeHistory } = useQuery<any[]>({
    queryKey: ['/api/tradex/history'],
    refetchInterval: 10000,
  });

  const { data: pricesData } = useQuery<any>({
    queryKey: ['/api/dashboard', 'BTC-USDT'],
    refetchInterval: 15000,
  });

  const totalFunds = tradexBalance + walletBalance;
  const tradexPct = totalFunds > 0 ? (tradexBalance / totalFunds) * 100 : 50;
  const walletPct = totalFunds > 0 ? (walletBalance / totalFunds) * 100 : 50;
  const stats = predictionsData?.stats || {};
  const activeTrades = Array.isArray(tradexTrades) ? tradexTrades : [];
  const completedTrades = Array.isArray(tradeHistory) ? tradeHistory.slice(0, 5) : [];
  const rawPredictions = predictionsData?.predictions;
  const predictions = Array.isArray(rawPredictions) ? rawPredictions.filter((p: any) => p.outcome === 'PENDING') : [];

  const formatBalance = (val: number) => balanceHidden ? '••••••' : `${val.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-black text-white" data-testid="home-dashboard">
      <header className="border-b border-white/[0.06] bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard">
              <img src={logoImage} alt="TradeX AI" className="h-8 w-auto cursor-pointer" data-testid="link-logo" />
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/[0.06]" data-testid="nav-dashboard">
                Dashboard
              </Link>
              <Link href="/trade" className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors" data-testid="nav-trade">
                Trade
              </Link>
              <Link href="/wallet" className="px-3 py-1.5 rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors" data-testid="nav-wallet">
                Wallet
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/wallet">
              <Button size="sm" className="bg-white text-black hover:bg-neutral-200 text-xs font-medium h-8" data-testid="button-deposit-header">
                Deposit
              </Button>
            </Link>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                data-testid="button-profile-menu"
              >
                <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center text-xs font-medium">
                  {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-black border border-white/[0.08] rounded-xl shadow-2xl shadow-black/80 overflow-hidden z-50">
                  <div className="p-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center text-sm font-semibold">
                        {user?.firstName?.[0] || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user?.firstName || 'User'} {user?.lastName || ''}</p>
                        <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {kycStatus === 'verified' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                              <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">
                              Unverified
                            </Badge>
                          )}
                          {isPro && (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">
                              <Crown className="w-2.5 h-2.5 mr-0.5" /> PRO
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/[0.04] transition-colors" data-testid="menu-profile">
                      <User className="w-4 h-4 text-neutral-500" /> Profile
                    </Link>
                    <Link href="/wallet" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/[0.04] transition-colors" data-testid="menu-wallet">
                      <Wallet className="w-4 h-4 text-neutral-500" /> Wallet
                    </Link>
                    <Link href="/kyc" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/[0.04] transition-colors" data-testid="menu-kyc">
                      <Shield className="w-4 h-4 text-neutral-500" /> KYC Verification
                    </Link>
                    <Link href="/plans" className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/[0.04] transition-colors" data-testid="menu-plans">
                      <Award className="w-4 h-4 text-neutral-500" /> Subscription
                    </Link>
                  </div>
                  <div className="border-t border-white/[0.06] py-1">
                    <button
                      onClick={() => logout()}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/[0.04] w-full transition-colors"
                      data-testid="menu-logout"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="md:hidden border-t border-white/[0.06]">
          <div className="flex">
            <Link href="/dashboard" className="flex-1 py-2.5 text-center text-xs font-medium text-white bg-white/[0.04]" data-testid="mobile-nav-dashboard">
              Dashboard
            </Link>
            <Link href="/trade" className="flex-1 py-2.5 text-center text-xs text-neutral-500 hover:text-white transition-colors" data-testid="mobile-nav-trade">
              Trade
            </Link>
            <Link href="/wallet" className="flex-1 py-2.5 text-center text-xs text-neutral-500 hover:text-white transition-colors" data-testid="mobile-nav-wallet">
              Wallet
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[1fr_280px] gap-6 mb-6">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm text-neutral-500">Total funds</span>
              <button onClick={() => setBalanceHidden(!balanceHidden)} className="text-neutral-500 hover:text-white transition-colors" data-testid="button-toggle-balance">
                {balanceHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {balancesLoading ? (
              <Skeleton className="h-10 w-48 bg-white/[0.06] mb-5" />
            ) : (
              <div className="text-3xl md:text-4xl font-semibold tracking-tight mb-5" data-testid="text-total-funds">
                ≈ {balanceHidden ? '••••••' : `$${totalFunds.toFixed(2)}`} <span className="text-lg text-neutral-500">USD</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link href="/wallet">
                <Button size="sm" className="bg-white text-black hover:bg-neutral-200 font-medium h-9 px-5" data-testid="button-deposit">
                  <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" /> Deposit
                </Button>
              </Link>
              <Link href="/wallet">
                <Button size="sm" variant="outline" className="border-white/[0.1] text-white hover:bg-white/[0.05] font-medium h-9 px-5" data-testid="button-withdraw">
                  <ArrowUpFromLine className="w-3.5 h-3.5 mr-1.5" /> Withdraw
                </Button>
              </Link>
              <Link href="/trade">
                <Button size="sm" variant="outline" className="border-white/[0.1] text-white hover:bg-white/[0.05] font-medium h-9 px-5" data-testid="button-trade-cta">
                  <BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Trade
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col items-center justify-center">
            {balancesLoading ? (
              <div className="flex flex-col items-center gap-3 w-full">
                <Skeleton className="w-[120px] h-[120px] rounded-full bg-white/[0.06]" />
                <Skeleton className="h-4 w-full bg-white/[0.06]" />
                <Skeleton className="h-4 w-full bg-white/[0.06]" />
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <BalanceDonut tradexPct={tradexPct} walletPct={walletPct} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-neutral-500 text-center leading-tight">
                      {balanceHidden ? '••' : `$${totalFunds.toFixed(0)}`}
                    </span>
                  </div>
                </div>
                <div className="w-full space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-neutral-400">TradeX Trading</span>
                    </div>
                    <span className="font-mono text-white" data-testid="text-tradex-balance">≈ {formatBalance(tradexBalance)} USD</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-neutral-400">USD Wallet</span>
                    </div>
                    <span className="font-mono text-white" data-testid="text-wallet-balance">≈ {formatBalance(walletBalance)} USD</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="text-xs text-neutral-500 mb-1">Win Rate</div>
              <div className="text-xl font-semibold font-mono" data-testid="text-win-rate">
                {stats.winRate ? `${parseFloat(stats.winRate).toFixed(1)}%` : '0%'}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="text-xs text-neutral-500 mb-1">Total P/L</div>
              <div className={`text-xl font-semibold font-mono ${(stats.totalDollarProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`} data-testid="text-total-pnl">
                {(stats.totalDollarProfit || 0) >= 0 ? '+' : '-'}${Math.abs(stats.totalDollarProfit || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="text-xs text-neutral-500 mb-1">Completed Trades</div>
              <div className="text-xl font-semibold font-mono" data-testid="text-completed-trades">
                {stats.completedTrades || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.02] border-white/[0.06]">
            <CardContent className="p-4">
              <div className="text-xs text-neutral-500 mb-1">AI Analyses</div>
              <div className="text-xl font-semibold font-mono" data-testid="text-ai-analyses">
                {isPro ? '∞' : `${subscription?.remaining ?? 10}/${subscription?.dailyLimit ?? 10}`}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-base font-medium">Trading Accounts</h2>
            <Link href="/trade">
              <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white text-xs gap-1" data-testid="link-view-trades">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="divide-y divide-white/[0.06]">
            <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">TradeX Trading</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/20 text-emerald-400">Active</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 mt-0.5">
                    <span>Your funds: <span className="text-white font-mono">{formatBalance(tradexBalance)} USD</span></span>
                    <span>P/L: <span className={`font-mono ${(stats.totalDollarProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(stats.totalDollarProfit || 0) >= 0 ? '+' : ''}{(stats.totalDollarProfit || 0).toFixed(2)} USD
                    </span></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href="/wallet">
                  <Button size="sm" variant="outline" className="border-white/[0.1] text-white text-xs h-8" data-testid="button-tradex-deposit">
                    Deposit
                  </Button>
                </Link>
                <Link href="/trade">
                  <Button size="sm" className="bg-white text-black hover:bg-neutral-200 text-xs h-8 font-medium" data-testid="button-tradex-trade">
                    Trade
                  </Button>
                </Link>
              </div>
            </div>

            <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">USD Wallet</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Your funds: <span className="text-white font-mono">{formatBalance(walletBalance)} USD</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href="/wallet">
                  <Button size="sm" variant="outline" className="border-white/[0.1] text-white text-xs h-8" data-testid="button-wallet-deposit">
                    Deposit
                  </Button>
                </Link>
                <Link href="/wallet">
                  <Button size="sm" variant="outline" className="border-white/[0.1] text-white text-xs h-8" data-testid="button-wallet-withdraw">
                    Withdraw
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Active Trades
              </h2>
              <Badge variant="outline" className="text-[10px] border-white/[0.1] text-neutral-400">
                {activeTrades.length + predictions.length} open
              </Badge>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {activeTrades.length === 0 && predictions.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <BarChart3 className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500">No active trades</p>
                  <Link href="/trade">
                    <Button size="sm" className="mt-3 bg-white text-black hover:bg-neutral-200 text-xs" data-testid="button-start-trading">
                      Start Trading
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {[...activeTrades, ...predictions].slice(0, 5).map((trade: any, idx: number) => {
                    const pair = trade.pair || 'BTC-USDT';
                    const signal = trade.signal || 'BUY';
                    const entryPrice = Number(trade.entryPrice || 0);
                    const pnl = Number(trade.profitLoss || trade.unrealizedPnl || 0);
                    const tradeSize = Number(trade.amount || trade.tradeSize || 0);
                    return (
                      <div key={trade.id || idx} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded flex items-center justify-center ${signal === 'BUY' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                            {signal === 'BUY' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{pair.split('-')[0]}</div>
                            <div className="text-[11px] text-neutral-500">
                              {signal} · ${entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-mono font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono">${tradeSize.toFixed(0)}</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-400" /> Recent History
              </h2>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white text-xs gap-1" data-testid="link-view-history">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {completedTrades.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <History className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500">No trade history yet</p>
                </div>
              ) : (
                completedTrades.map((trade: any, idx: number) => {
                  const pair = trade.pair || 'BTC-USDT';
                  const signal = trade.signal || 'BUY';
                  const pnl = Number(trade.realizedPnl || trade.profitLoss || 0);
                  const outcome = trade.outcome || (pnl >= 0 ? 'WIN' : 'LOSS');
                  return (
                    <div key={trade.id || idx} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded flex items-center justify-center ${outcome === 'WIN' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                          {outcome === 'WIN' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{pair.split('-')[0]}</div>
                          <div className="text-[11px] text-neutral-500">{signal}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-mono font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                        </div>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${outcome === 'WIN' ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'}`}>
                          {outcome}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {Array.isArray(pricesData?.prices) && pricesData.prices.length > 0 && (
          <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-medium flex items-center gap-2">
                <Coins className="w-4 h-4 text-neutral-400" /> Markets
              </h2>
              <Link href="/trade">
                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white text-xs gap-1" data-testid="link-view-markets">
                  Trade <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-px bg-white/[0.04]">
              {pricesData.prices.slice(0, 7).map((p: any) => {
                const sym = p.pair.split('-')[0];
                return (
                  <Link key={p.pair} href="/trade">
                    <div className="bg-black px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer" data-testid={`market-${sym.toLowerCase()}`}>
                      <div className="text-sm font-medium mb-0.5">{sym}</div>
                      <div className="text-xs font-mono text-neutral-300">
                        ${p.price != null ? (p.price < 1 ? p.price.toFixed(6) : p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '---'}
                      </div>
                      <div className={`text-[11px] font-mono flex items-center gap-0.5 ${p.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {p.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(p.change24h).toFixed(2)}%
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
