import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  CreditCard,
  Activity,
  Shield,
  Wallet,
  Save,
  CheckCircle,
  AlertCircle,
  LogIn,
  LogOut,
  Search,
  Crown,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Loader2,
  Tag,
  Plus,
  Trash2,
  Percent
} from "lucide-react";
import { CryptoLogo } from "@/components/CryptoLogos";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";
import { useToast } from "@/hooks/use-toast";

interface AdminSettings {
  trc20Address?: string;
  bep20Address?: string;
  proPrice: number;
}

interface UserData {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  plan: string;
  createdAt: string | null;
}

interface PromoCode {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string | null;
}

export default function Admin() {
  const { toast } = useToast();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  
  const [trc20Address, setTrc20Address] = useState('');
  const [bep20Address, setBep20Address] = useState('');
  const [proPrice, setProPrice] = useState(10);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  
  // Promo code state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState(10);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState<string>('');
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);
  
  // Income analytics state
  const [analytics, setAnalytics] = useState<{
    stats: { totalIncome: number; totalPayments: number; todayIncome: number; todayPayments: number; last7DaysIncome: number };
    payments: Array<{ id: string; userId: string; network: string; txHash: string; amount: number; status: string; verifiedAt: string | null; createdAt: string; userEmail: string | null }>;
  } | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchSettings();
      fetchPromoCodes();
      fetchAnalytics();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (settings) {
      setTrc20Address(settings.trc20Address || '');
      setBep20Address(settings.bep20Address || '');
      setProPrice(settings.proPrice || 10);
    }
  }, [settings]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSessionId(data.sessionId);
        setIsLoggedIn(true);
        toast({ title: "Login successful", description: "Welcome to Admin Panel" });
        fetchUsers(data.sessionId);
      } else {
        toast({ title: "Login failed", description: data.error || "Invalid credentials", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to login", variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      const data = await response.json();
      if (response.ok) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings");
    }
  };

  const fetchUsers = async (sid: string) => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch("/api/admin/users", {
        headers: { "x-admin-session": sid },
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleMakePro = async (userId: string) => {
    if (!sessionId) return;
    setProcessingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/make-pro`, {
        method: "POST",
        headers: { "x-admin-session": sessionId },
      });
      if (response.ok) {
        toast({ title: "Success", description: "User upgraded to Pro" });
        fetchUsers(sessionId);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to upgrade user", variant: "destructive" });
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleRemovePro = async (userId: string) => {
    if (!sessionId) return;
    setProcessingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/remove-pro`, {
        method: "POST",
        headers: { "x-admin-session": sessionId },
      });
      if (response.ok) {
        toast({ title: "Success", description: "User downgraded to Free" });
        fetchUsers(sessionId);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to downgrade user", variant: "destructive" });
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!trc20Address && !bep20Address) {
      toast({
        title: "Error",
        description: "Please enter at least one wallet address",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingSettings(true);
    try {
      await apiRequest('POST', '/api/admin/settings', { trc20Address, bep20Address, proPrice });
      toast({
        title: "Settings Updated",
        description: "Payment wallet addresses have been saved successfully.",
      });
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSessionId(null);
    setUsers([]);
    setEmail("");
    setPassword("");
    setPromoCodes([]);
    setAnalytics(null);
  };
  
  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const response = await fetch("/api/admin/analytics");
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Promo code functions
  const fetchPromoCodes = async () => {
    setIsLoadingPromos(true);
    try {
      const response = await fetch("/api/admin/promo-codes");
      if (response.ok) {
        const data = await response.json();
        setPromoCodes(data);
      }
    } catch (error) {
      console.error("Failed to fetch promo codes:", error);
    } finally {
      setIsLoadingPromos(false);
    }
  };

  const handleCreatePromoCode = async () => {
    if (!newPromoCode.trim()) {
      toast({ title: "Error", description: "Please enter a promo code", variant: "destructive" });
      return;
    }
    
    setIsCreatingPromo(true);
    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newPromoCode.toUpperCase(),
          discountPercent: newPromoDiscount,
          maxUses: newPromoMaxUses ? parseInt(newPromoMaxUses) : null,
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        toast({ title: "Success", description: `Promo code ${newPromoCode.toUpperCase()} created` });
        setNewPromoCode('');
        setNewPromoDiscount(10);
        setNewPromoMaxUses('');
        fetchPromoCodes();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCreatingPromo(false);
    }
  };

  const handleTogglePromoCode = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      
      if (response.ok) {
        toast({ title: isActive ? "Promo code disabled" : "Promo code enabled" });
        fetchPromoCodes();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    setDeletingPromoId(id);
    try {
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast({ title: "Promo code deleted" });
        fetchPromoCodes();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeletingPromoId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const proCount = users.filter(u => u.plan === 'pro').length;
  const freeCount = users.filter(u => u.plan !== 'pro').length;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gradient-to-br from-[#12121a] to-[#0d0d14] border-white/10">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <img src={logoImage} alt="TradeX AI" className="h-12 w-auto mx-auto mb-4" />
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="w-6 h-6 text-red-500" />
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
              </div>
              <p className="text-gray-400 text-sm">Login with admin credentials</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@email.com"
                  className="bg-[#0a0a0f] border-white/10"
                  data-testid="input-admin-email"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#0a0a0f] border-white/10"
                  data-testid="input-admin-password"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button
                onClick={handleLogin}
                disabled={isLoggingIn || !email || !password}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                data-testid="button-admin-login"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Login to Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <img src={logoImage} alt="TradeX AI" className="h-8 w-auto" />
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <div className="text-sm text-gray-400">Total Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{proCount}</div>
                  <div className="text-sm text-gray-400">Pro Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{freeCount}</div>
                  <div className="text-sm text-gray-400">Free Users</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income Analytics Section */}
        <Card className="bg-[#12121a] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Income Dashboard
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={isLoadingAnalytics}
                className="border-white/10"
                data-testid="button-refresh-analytics"
              >
                {isLoadingAnalytics ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>

            {isLoadingAnalytics ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : analytics ? (
              <div className="space-y-4">
                {/* Income Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400">${analytics.stats.totalIncome.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">Total Income</div>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-cyan-400">{analytics.stats.totalPayments}</div>
                    <div className="text-xs text-gray-400 mt-1">Total Payments</div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">${analytics.stats.todayIncome.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">Today's Income</div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">${analytics.stats.last7DaysIncome.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">Last 7 Days</div>
                  </div>
                </div>

                {/* Recent Payments Table */}
                {analytics.payments.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Payments</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5 text-left">
                            <th className="py-2 px-3 text-xs text-gray-500 uppercase">User</th>
                            <th className="py-2 px-3 text-xs text-gray-500 uppercase">Network</th>
                            <th className="py-2 px-3 text-xs text-gray-500 uppercase">Amount</th>
                            <th className="py-2 px-3 text-xs text-gray-500 uppercase">Status</th>
                            <th className="py-2 px-3 text-xs text-gray-500 uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.payments.slice(0, 10).map((payment) => (
                            <tr key={payment.id} className="border-b border-white/5">
                              <td className="py-2 px-3 text-gray-300">{payment.userEmail || 'Unknown'}</td>
                              <td className="py-2 px-3">
                                <Badge className={payment.network === 'TRC20' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}>
                                  {payment.network}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-emerald-400 font-mono">${payment.amount}</td>
                              <td className="py-2 px-3">
                                <Badge className={payment.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}>
                                  {payment.status}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-gray-500 text-xs">
                                {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No payment data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#12121a] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                All Users
              </h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="pl-10 bg-[#0a0a0f] border-white/10 w-64"
                  data-testid="input-search-users"
                />
              </div>
            </div>

            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="py-3 px-4 text-xs text-gray-500 uppercase">User</th>
                      <th className="py-3 px-4 text-xs text-gray-500 uppercase">Email</th>
                      <th className="py-3 px-4 text-xs text-gray-500 uppercase">User ID</th>
                      <th className="py-3 px-4 text-xs text-gray-500 uppercase">Subscription</th>
                      <th className="py-3 px-4 text-xs text-gray-500 uppercase">Joined</th>
                      <th className="py-3 px-4 text-xs text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold">
                              {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <span className="font-medium">
                              {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Mail className="w-3 h-3" />
                            {user.email || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                            {user.id.slice(0, 12)}...
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          {user.plan === 'pro' ? (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-black">
                              <Crown className="w-3 h-3 mr-1" />
                              PRO
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400 border-gray-600">
                              FREE
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {user.plan === 'pro' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemovePro(user.id)}
                              disabled={processingUserId === user.id}
                              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                              data-testid={`button-remove-pro-${user.id}`}
                            >
                              {processingUserId === user.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <UserX className="w-3 h-3 mr-1" />
                                  Remove Pro
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleMakePro(user.id)}
                              disabled={processingUserId === user.id}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 text-black"
                              data-testid={`button-make-pro-${user.id}`}
                            >
                              {processingUserId === user.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Crown className="w-3 h-3 mr-1" />
                                  Make Pro
                                </>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No users found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Promo Codes Section */}
        <Card className="bg-[#12121a] border-white/5 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-400" />
              Promo Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Create new promo code */}
            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs text-gray-400 mb-1 block">Code</Label>
                <Input
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  placeholder="PROMO20"
                  className="bg-[#0a0a0f] border-white/10 font-mono uppercase"
                  data-testid="input-promo-code"
                />
              </div>
              <div className="w-24">
                <Label className="text-xs text-gray-400 mb-1 block">Discount %</Label>
                <Input
                  type="number"
                  value={newPromoDiscount}
                  onChange={(e) => setNewPromoDiscount(Number(e.target.value))}
                  min={1}
                  max={100}
                  className="bg-[#0a0a0f] border-white/10"
                  data-testid="input-promo-discount"
                />
              </div>
              <div className="w-24">
                <Label className="text-xs text-gray-400 mb-1 block">Max Uses</Label>
                <Input
                  type="number"
                  value={newPromoMaxUses}
                  onChange={(e) => setNewPromoMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  className="bg-[#0a0a0f] border-white/10"
                  data-testid="input-promo-max-uses"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleCreatePromoCode}
                  disabled={isCreatingPromo || !newPromoCode.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-create-promo"
                >
                  {isCreatingPromo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Create
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Promo codes list */}
            {isLoadingPromos ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : promoCodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No promo codes created yet
              </div>
            ) : (
              <div className="space-y-2">
                {promoCodes.map((promo) => (
                  <div 
                    key={promo.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${promo.isActive ? 'bg-white/[0.02]' : 'bg-red-500/5'}`}
                    data-testid={`promo-code-${promo.code}`}
                  >
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded">
                        {promo.code}
                      </code>
                      <Badge className="bg-emerald-500/20 text-emerald-400">
                        <Percent className="w-3 h-3 mr-1" />
                        {promo.discountPercent}% OFF
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {promo.usedCount}{promo.maxUses ? `/${promo.maxUses}` : ''} uses
                      </span>
                      {!promo.isActive && (
                        <Badge variant="outline" className="text-red-400 border-red-500/30">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePromoCode(promo.id, promo.isActive)}
                        className={promo.isActive ? "text-amber-400 border-amber-500/30" : "text-emerald-400 border-emerald-500/30"}
                        data-testid={`button-toggle-promo-${promo.code}`}
                      >
                        {promo.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePromoCode(promo.id)}
                        disabled={deletingPromoId === promo.id}
                        className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        data-testid={`button-delete-promo-${promo.code}`}
                      >
                        {deletingPromoId === promo.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-[#12121a] border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-cyan-400" />
                Payment Wallet Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <CryptoLogo type="usdt" className="w-5 h-5" />
                  <span className="font-semibold text-amber-400">Pro Subscription Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={proPrice}
                    onChange={(e) => setProPrice(Number(e.target.value))}
                    className="w-24 bg-[#0a0a0f] border-white/10"
                    min={1}
                    data-testid="input-pro-price"
                  />
                  <span className="text-gray-400">USDT / month</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-400">
                    <CryptoLogo type="trc20" className="w-5 h-5" />
                    TRC20 (TRON) Wallet Address
                  </Label>
                  <Input
                    value={trc20Address}
                    onChange={(e) => setTrc20Address(e.target.value)}
                    placeholder="Enter your TRC20 USDT address (starts with T)"
                    className="font-mono text-sm bg-[#0a0a0f] border-white/10"
                    data-testid="input-trc20-address"
                  />
                  {trc20Address && trc20Address.startsWith('T') && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      Valid TRC20 format
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-400">
                    <CryptoLogo type="bep20" className="w-5 h-5" />
                    BEP20 (BSC) Wallet Address
                  </Label>
                  <Input
                    value={bep20Address}
                    onChange={(e) => setBep20Address(e.target.value)}
                    placeholder="Enter your BEP20 USDT address (starts with 0x)"
                    className="font-mono text-sm bg-[#0a0a0f] border-white/10"
                    data-testid="input-bep20-address"
                  />
                  {bep20Address && bep20Address.startsWith('0x') && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCircle className="w-3 h-3" />
                      Valid BEP20 format
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-save-settings"
              >
                {isSavingSettings ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Payment Settings
              </Button>

              {(!trc20Address && !bep20Address) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Add at least one wallet address to receive Pro subscription payments</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-[#12121a] border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-sm text-gray-400">AI Services</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-sm text-gray-400">Database</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-sm text-gray-400">Market Data Feed</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-sm text-gray-400">Blockchain Verification</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-sm flex items-center gap-2 text-gray-400">
                    <CryptoLogo type="trc20" className="w-4 h-4" />
                    TRC20 Payments
                  </span>
                  <Badge className={trc20Address ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
                    {trc20Address ? "Enabled" : "Not Configured"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span className="text-sm flex items-center gap-2 text-gray-400">
                    <CryptoLogo type="bep20" className="w-4 h-4" />
                    BEP20 Payments
                  </span>
                  <Badge className={bep20Address ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
                    {bep20Address ? "Enabled" : "Not Configured"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
