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
  Percent,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  XCircle,
  Bitcoin,
  IndianRupee,
  Upload,
  Landmark,
} from "lucide-react";
import { CryptoLogo } from "@/components/CryptoLogos";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";
import upiLogo from "@assets/image_1773144638368.png";
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

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [adminDeposits, setAdminDeposits] = useState<any[]>([]);
  const [adminWithdrawals, setAdminWithdrawals] = useState<any[]>([]);
  const [newMethodType, setNewMethodType] = useState("crypto");
  const [newMethodCrypto, setNewMethodCrypto] = useState("USDT");
  const [newMethodChain, setNewMethodChain] = useState("TRC20");
  const [newMethodAddress, setNewMethodAddress] = useState("");
  const [newMethodUpiId, setNewMethodUpiId] = useState("");
  const [newMethodQr, setNewMethodQr] = useState("");
  const [newMethodBankName, setNewMethodBankName] = useState("");
  const [newMethodAccountNumber, setNewMethodAccountNumber] = useState("");
  const [newMethodIfsc, setNewMethodIfsc] = useState("");
  const [newMethodAccountHolder, setNewMethodAccountHolder] = useState("");
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);

  const [kycSubmissions, setKycSubmissions] = useState<any[]>([]);
  const [processingKycId, setProcessingKycId] = useState<string | null>(null);

  const fetchKycSubmissions = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch("/api/admin/kyc", { headers: { "x-admin-session": sessionId } });
      if (res.ok) setKycSubmissions(await res.json());
    } catch {}
  };

  const handleKycAction = async (id: string, action: "verified" | "rejected", notes?: string) => {
    if (!sessionId) return;
    setProcessingKycId(id);
    try {
      const res = await fetch(`/api/admin/kyc/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-session": sessionId },
        body: JSON.stringify({ action, notes }),
      });
      if (res.ok) {
        toast({ title: "Success", description: `KYC ${action}` });
        fetchKycSubmissions();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to process KYC", variant: "destructive" });
    } finally {
      setProcessingKycId(null);
    }
  };

  const fetchPaymentMethods = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch("/api/admin/payment-methods", { headers: { "x-admin-session": sessionId } });
      if (res.ok) setPaymentMethods(await res.json());
    } catch {}
  };

  const fetchAdminDeposits = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch("/api/admin/deposits", { headers: { "x-admin-session": sessionId } });
      if (res.ok) setAdminDeposits(await res.json());
    } catch {}
  };

  const fetchAdminWithdrawals = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch("/api/admin/withdrawals", { headers: { "x-admin-session": sessionId } });
      if (res.ok) setAdminWithdrawals(await res.json());
    } catch {}
  };

  const handleAddPaymentMethod = async () => {
    if (!sessionId) return;
    try {
      let body: any;
      if (newMethodType === "crypto") {
        body = { type: "crypto", crypto: newMethodCrypto, chain: newMethodChain, address: newMethodAddress };
      } else if (newMethodType === "upi") {
        body = { type: "upi", upiId: newMethodUpiId, qrImage: newMethodQr };
      } else {
        body = { type: "imps", bankName: newMethodBankName, accountNumber: newMethodAccountNumber, ifscCode: newMethodIfsc, accountHolderName: newMethodAccountHolder };
      }
      const res = await fetch("/api/admin/payment-methods", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-session": sessionId },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast({ title: "Payment method added" });
        setNewMethodAddress("");
        setNewMethodUpiId("");
        setNewMethodQr("");
        setNewMethodBankName("");
        setNewMethodAccountNumber("");
        setNewMethodIfsc("");
        setNewMethodAccountHolder("");
        fetchPaymentMethods();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!sessionId) return;
    try {
      await fetch(`/api/admin/payment-methods/${id}`, { method: "DELETE", headers: { "x-admin-session": sessionId } });
      fetchPaymentMethods();
    } catch {}
  };

  const handleDepositAction = async (id: string, action: string) => {
    if (!sessionId) return;
    setProcessingTxId(id);
    try {
      const res = await fetch(`/api/admin/deposits/${id}/action`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-session": sessionId },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast({ title: `Deposit ${action}` });
        fetchAdminDeposits();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleWithdrawalAction = async (id: string, action: string) => {
    if (!sessionId) return;
    setProcessingTxId(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/action`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-session": sessionId },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast({ title: `Withdrawal ${action}` });
        fetchAdminWithdrawals();
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setNewMethodQr(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchSettings();
      fetchPromoCodes();
      fetchAnalytics();
      fetchPaymentMethods();
      fetchAdminDeposits();
      fetchAdminWithdrawals();
      fetchKycSubmissions();
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
    if (!sessionId) return;
    setIsLoadingAnalytics(true);
    try {
      const response = await fetch("/api/admin/analytics", {
        headers: { "x-admin-session": sessionId },
      });
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/[0.03] border-white/10">
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
                  className="bg-black border-white/10"
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
                  className="bg-black border-white/10"
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
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/5 bg-black/95 backdrop-blur-xl sticky top-0 z-50">
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
          <Card className="bg-white/[0.03] border-white/[0.06]">
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
        <Card className="bg-white/[0.03] border-white/5">
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
                  <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-white">{analytics.stats.totalPayments}</div>
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

        <Card className="bg-white/[0.03] border-white/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-neutral-400" />
                All Users
              </h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="pl-10 bg-black border-white/10 w-64"
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
                            <div className="w-8 h-8 rounded-full bg-white/[0.12] flex items-center justify-center text-xs font-bold">
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
        <Card className="bg-white/[0.03] border-white/5 mb-6">
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
                  className="bg-black border-white/10 font-mono uppercase"
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
                  className="bg-black border-white/10"
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
                  className="bg-black border-white/10"
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
          <Card className="bg-white/[0.03] border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-neutral-400" />
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
                    className="w-24 bg-black border-white/10"
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
                    className="font-mono text-sm bg-black border-white/10"
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
                    className="font-mono text-sm bg-black border-white/10"
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
                className="w-full bg-white text-black hover:bg-neutral-200"
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
          
          {/* Payment Methods Management */}
          <Card className="bg-white/[0.03] border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-neutral-400" />
                Deposit Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 mb-3">
                <Button size="sm" variant={newMethodType === "crypto" ? "default" : "outline"} onClick={() => setNewMethodType("crypto")}>
                  <Bitcoin className="w-3 h-3 mr-1" /> Crypto
                </Button>
                <Button size="sm" variant={newMethodType === "upi" ? "default" : "outline"} onClick={() => setNewMethodType("upi")}>
                  <img src={upiLogo} alt="UPI" className="h-3 mr-1" /> UPI
                </Button>
                <Button size="sm" variant={newMethodType === "imps" ? "default" : "outline"} onClick={() => setNewMethodType("imps")}>
                  <Landmark className="w-3 h-3 mr-1" /> IMPS
                </Button>
              </div>

              {newMethodType === "crypto" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-gray-400 text-xs">Crypto</Label>
                      <select value={newMethodCrypto} onChange={e => setNewMethodCrypto(e.target.value)} className="w-full bg-black border border-white/10 text-white rounded-md p-2 text-sm" data-testid="select-admin-crypto">
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="USDT">Tether (USDT)</option>
                        <option value="LTC">Litecoin (LTC)</option>
                        <option value="USDC">USD Coin (USDC)</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Chain</Label>
                      <select value={newMethodChain} onChange={e => setNewMethodChain(e.target.value)} className="w-full bg-black border border-white/10 text-white rounded-md p-2 text-sm" data-testid="select-admin-chain">
                        <option value="Bitcoin">Bitcoin</option>
                        <option value="ERC20">ERC20</option>
                        <option value="TRC20">TRC20 (TRON)</option>
                        <option value="BEP20">BEP20 (BSC)</option>
                        <option value="Litecoin">Litecoin</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Wallet Address</Label>
                    <Input value={newMethodAddress} onChange={e => setNewMethodAddress(e.target.value)} placeholder="Enter wallet address" className="bg-black border-white/10 font-mono text-sm" data-testid="input-admin-wallet" />
                  </div>
                </div>
              ) : newMethodType === "upi" ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400 text-xs">UPI ID</Label>
                    <Input value={newMethodUpiId} onChange={e => setNewMethodUpiId(e.target.value)} placeholder="Enter UPI ID" className="bg-black border-white/10 text-sm" data-testid="input-admin-upi" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">QR Image (optional)</Label>
                    <div className="flex gap-2">
                      <Input type="file" accept="image/*" onChange={handleQrUpload} className="bg-black border-white/10 text-sm" data-testid="input-admin-qr" />
                    </div>
                    {newMethodQr && <img src={newMethodQr} alt="QR Preview" className="w-24 h-24 mt-2 rounded border border-white/10" />}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-gray-400 text-xs">Account Holder Name</Label>
                    <Input value={newMethodAccountHolder} onChange={e => setNewMethodAccountHolder(e.target.value)} placeholder="Full name as per bank" className="bg-black border-white/10 text-sm" data-testid="input-admin-imps-holder" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Account Number</Label>
                    <Input value={newMethodAccountNumber} onChange={e => setNewMethodAccountNumber(e.target.value)} placeholder="Bank account number" className="bg-black border-white/10 font-mono text-sm" data-testid="input-admin-imps-account" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">IFSC Code</Label>
                    <Input value={newMethodIfsc} onChange={e => setNewMethodIfsc(e.target.value.toUpperCase())} placeholder="e.g., SBIN0001234" className="bg-black border-white/10 font-mono text-sm uppercase" data-testid="input-admin-imps-ifsc" />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Bank Name (optional)</Label>
                    <Input value={newMethodBankName} onChange={e => setNewMethodBankName(e.target.value)} placeholder="e.g., State Bank of India" className="bg-black border-white/10 text-sm" data-testid="input-admin-imps-bank" />
                  </div>
                </div>
              )}

              <Button onClick={handleAddPaymentMethod} className="w-full bg-white text-black hover:bg-neutral-200" size="sm" data-testid="button-add-method">
                <Plus className="w-3 h-3 mr-1" /> Add Payment Method
              </Button>

              {paymentMethods.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-semibold text-gray-400">Active Methods</h3>
                  {paymentMethods.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg" data-testid={`card-method-${m.id}`}>
                      <div className="text-sm">
                        {m.type === "crypto" ? (
                          <span className="text-white">{m.crypto} ({m.chain}): <span className="text-gray-400 font-mono text-xs">{m.address?.slice(0, 16)}...</span></span>
                        ) : m.type === "imps" ? (
                          <span className="text-white">IMPS: {m.accountHolderName} | A/C: ****{m.accountNumber?.slice(-4)} | {m.ifscCode}</span>
                        ) : (
                          <span className="text-white">UPI: {m.upiId}</span>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 h-7" onClick={() => handleDeletePaymentMethod(m.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deposit Requests */}
          <Card className="bg-white/[0.03] border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-green-400" />
                Deposit Requests
                {adminDeposits.filter(d => d.status === "pending").length > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-400 ml-2">{adminDeposits.filter(d => d.status === "pending").length} pending</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {adminDeposits.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No deposit requests</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {adminDeposits.map(d => (
                    <div key={d.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/5" data-testid={`card-admin-deposit-${d.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{d.amountUsdt?.toFixed(2)} USDT</span>
                          <Badge variant="outline" className="text-xs">{d.type === "upi" ? "UPI" : `${d.crypto} (${d.chain})`}</Badge>
                        </div>
                        <Badge className={
                          d.status === "approved" ? "bg-green-500/20 text-green-400" :
                          d.status === "rejected" ? "bg-red-500/20 text-red-400" :
                          d.status === "processing" ? "bg-blue-500/20 text-blue-400" :
                          "bg-amber-500/20 text-amber-400"
                        }>{d.status}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>User: {d.userEmail || d.userName || d.userId?.slice(0, 8)}</p>
                        {d.type === "upi" && d.amountInr && <p>INR: ₹{d.amountInr.toFixed(2)}</p>}
                        {d.txHash && <p className="font-mono">TX: {d.txHash.slice(0, 20)}...</p>}
                        {d.utr && <p className="font-mono">UTR: {d.utr}</p>}
                        <p>{new Date(d.createdAt).toLocaleString()}</p>
                      </div>
                      {d.status === "pending" || d.status === "processing" ? (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => handleDepositAction(d.id, "approved")} disabled={processingTxId === d.id}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs" onClick={() => handleDepositAction(d.id, "processing")} disabled={processingTxId === d.id}>
                            <Clock className="w-3 h-3 mr-1" /> Processing
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDepositAction(d.id, "rejected")} disabled={processingTxId === d.id}>
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal Requests */}
          <Card className="bg-white/[0.03] border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-red-400" />
                Withdrawal Requests
                {adminWithdrawals.filter(w => w.status === "pending").length > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-400 ml-2">{adminWithdrawals.filter(w => w.status === "pending").length} pending</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {adminWithdrawals.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No withdrawal requests</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {adminWithdrawals.map(w => (
                    <div key={w.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/5" data-testid={`card-admin-withdrawal-${w.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{w.amountUsdt?.toFixed(2)} USDT</span>
                          <Badge variant="outline" className="text-xs">{w.type === "imps" ? "IMPS" : w.type === "upi" ? "UPI" : `${w.crypto} (${w.chain})`}</Badge>
                        </div>
                        <Badge className={
                          w.status === "approved" ? "bg-green-500/20 text-green-400" :
                          w.status === "rejected" ? "bg-red-500/20 text-red-400" :
                          w.status === "processing" ? "bg-blue-500/20 text-blue-400" :
                          "bg-amber-500/20 text-amber-400"
                        }>{w.status}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>User: {w.userEmail || w.userName || w.userId?.slice(0, 8)}</p>
                        {w.type === "imps" ? (
                          <>
                            <p>Name: {w.accountHolderName}</p>
                            <p className="font-mono">A/C: {w.accountNumber} | IFSC: {w.ifscCode}</p>
                            {w.bankName && <p>Bank: {w.bankName}</p>}
                          </>
                        ) : (
                          <p className="font-mono">To: {w.toAddress}</p>
                        )}
                        {(w.type === "upi" || w.type === "imps") && w.amountInr && <p>INR: ₹{w.amountInr.toFixed(2)}</p>}
                        <p>{new Date(w.createdAt).toLocaleString()}</p>
                      </div>
                      {w.status === "pending" || w.status === "processing" ? (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => handleWithdrawalAction(w.id, "approved")} disabled={processingTxId === w.id}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs" onClick={() => handleWithdrawalAction(w.id, "processing")} disabled={processingTxId === w.id}>
                            <Clock className="w-3 h-3 mr-1" /> Processing
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleWithdrawalAction(w.id, "rejected")} disabled={processingTxId === w.id}>
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                KYC Submissions
                {kycSubmissions.filter(k => k.status === "pending").length > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-400 ml-2">{kycSubmissions.filter(k => k.status === "pending").length} pending</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kycSubmissions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No KYC submissions</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {kycSubmissions.map(k => (
                    <div key={k.id} className="p-3 bg-white/[0.02] rounded-lg border border-white/5" data-testid={`card-admin-kyc-${k.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white capitalize">{k.documentType?.replace("_", " ")}</span>
                          <Badge className={
                            k.status === "verified" ? "bg-green-500/20 text-green-400" :
                            k.status === "rejected" ? "bg-red-500/20 text-red-400" :
                            "bg-amber-500/20 text-amber-400"
                          }>{k.status}</Badge>
                        </div>
                        <span className="text-xs text-gray-500">{k.userName || k.userEmail || "Unknown"}</span>
                      </div>
                      <div className="text-xs text-gray-400 space-y-1 mb-2">
                        {k.extractedName && <p>Name: <span className="text-white">{k.extractedName}</span></p>}
                        {k.extractedDob && <p>DOB: <span className="text-white">{k.extractedDob}</span></p>}
                        {k.extractedDocNumber && <p>Doc #: <span className="text-white font-mono">{k.extractedDocNumber}</span></p>}
                        {k.extractedGender && <p>Gender: <span className="text-white">{k.extractedGender}</span></p>}
                        <p>Submitted: {new Date(k.createdAt).toLocaleString()}</p>
                      </div>
                      {(k.documentImage || k.documentImageBack) && (
                        <div className="mb-2 flex gap-2 flex-wrap">
                          {k.documentImage && (
                            <div>
                              <p className="text-[10px] text-gray-500 mb-1">Front</p>
                              <img src={k.documentImage} alt="Front" className="max-h-32 rounded border border-white/10" data-testid={`img-kyc-front-${k.id}`} />
                            </div>
                          )}
                          {k.documentImageBack && (
                            <div>
                              <p className="text-[10px] text-gray-500 mb-1">Back</p>
                              <img src={k.documentImageBack} alt="Back" className="max-h-32 rounded border border-white/10" data-testid={`img-kyc-back-${k.id}`} />
                            </div>
                          )}
                        </div>
                      )}
                      {k.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-500/20 text-green-400 hover:bg-green-500/30 h-7 text-xs"
                            onClick={() => handleKycAction(k.id, "verified")}
                            disabled={processingKycId === k.id}
                            data-testid={`button-kyc-approve-${k.id}`}
                          >
                            {processingKycId === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 h-7 text-xs"
                            onClick={() => {
                              const reason = prompt("Rejection reason:");
                              if (reason) handleKycAction(k.id, "rejected", reason);
                            }}
                            disabled={processingKycId === k.id}
                            data-testid={`button-kyc-reject-${k.id}`}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {k.adminNotes && (
                        <p className="text-xs text-amber-400 mt-2">Note: {k.adminNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/[0.03] border-white/5">
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
