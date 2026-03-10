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
  LayoutDashboard,
  Settings,
  FileText,
  Eye,
  Copy,
  RefreshCw,
  DollarSign,
  BanknoteIcon,
  ChevronRight,
  CircleDot,
  Hash,
} from "lucide-react";
import { CryptoLogo } from "@/components/CryptoLogos";
import logoImage from "@assets/Picsart_26-03-10_23-57-49-090_1773167302165.png";
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

type AdminTab = "dashboard" | "users" | "deposits" | "withdrawals" | "kyc" | "settings" | "promos";

export default function Admin() {
  const { toast } = useToast();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  
  const [trc20Address, setTrc20Address] = useState('');
  const [bep20Address, setBep20Address] = useState('');
  const [proPrice, setProPrice] = useState(10);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState(10);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState<string>('');
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);
  
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

      const interval = setInterval(() => {
        fetchAdminDeposits();
        fetchAdminWithdrawals();
        fetchKycSubmissions();
        fetchAnalytics();
      }, 10000);
      return () => clearInterval(interval);
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
  const pendingDeposits = adminDeposits.filter(d => d.status === "pending");
  const approvedDeposits = adminDeposits.filter(d => d.status === "approved");
  const pendingWithdrawals = adminWithdrawals.filter(w => w.status === "pending");
  const approvedWithdrawals = adminWithdrawals.filter(w => w.status === "approved");
  const pendingKyc = kycSubmissions.filter(k => k.status === "pending");
  const verifiedKyc = kycSubmissions.filter(k => k.status === "verified");
  const totalDepositAmount = approvedDeposits.reduce((sum, d) => sum + (d.amountUsdt || 0), 0);
  const totalWithdrawalAmount = approvedWithdrawals.reduce((sum, w) => sum + (w.amountUsdt || 0), 0);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/[0.03] border-white/10">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img src={logoImage} alt="TradeX AI" className="h-10 w-10 rounded-full" />
                <span className="text-white font-semibold text-xl tracking-tight">TradeX AI</span>
              </div>
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
                  placeholder="Enter password"
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

  const navItems: { id: AdminTab; label: string; icon: any; count?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users, count: users.length },
    { id: "deposits", label: "Deposits", icon: ArrowDownToLine, count: pendingDeposits.length },
    { id: "withdrawals", label: "Withdrawals", icon: ArrowUpFromLine, count: pendingWithdrawals.length },
    { id: "kyc", label: "KYC", icon: Shield, count: pendingKyc.length },
    { id: "promos", label: "Promo Codes", icon: Tag, count: promoCodes.length },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/5 bg-black/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <img src={logoImage} alt="TradeX AI" className="h-8 w-8 rounded-full" />
            <span className="text-white font-semibold text-base tracking-tight">TradeX AI</span>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>
            <div className="hidden md:flex items-center gap-1 ml-2 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 hidden md:block">{email}</span>
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
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        <aside className="hidden lg:block w-56 min-h-[calc(100vh-57px)] border-r border-white/5 py-4 px-2 sticky top-[57px] self-start">
          <nav className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === item.id 
                    ? "bg-white/[0.08] text-white font-medium" 
                    : "text-neutral-400 hover:text-white hover:bg-white/[0.03]"
                }`}
                data-testid={`tab-${item.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <Badge className={`text-[10px] h-5 min-w-[20px] justify-center ${
                    (item.id === "deposits" || item.id === "withdrawals" || item.id === "kyc") && item.count > 0
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-white/[0.08] text-neutral-400"
                  }`}>
                    {item.count}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <div className="lg:hidden border-b border-white/5 w-full overflow-x-auto sticky top-[57px] bg-black z-40">
          <div className="flex px-2 py-1.5 gap-1 min-w-max">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  activeTab === item.id
                    ? "bg-white/[0.08] text-white font-medium"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
                {item.count !== undefined && item.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    (item.id === "deposits" || item.id === "withdrawals" || item.id === "kyc") && item.count > 0
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-white/[0.08] text-neutral-400"
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 px-4 lg:px-6 py-6 space-y-6 min-w-0">

          {activeTab === "dashboard" && (
            <>
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold" data-testid="text-dashboard-title">Dashboard Overview</h1>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <RefreshCw className="w-3 h-3" />
                  Auto-refresh: 10s
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-white/[0.03] border-white/[0.06]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-xl font-bold" data-testid="text-total-users">{users.length}</div>
                        <div className="text-[11px] text-gray-500">Total Users</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/[0.03] border-white/[0.06]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-xl font-bold" data-testid="text-pro-users">{proCount}</div>
                        <div className="text-[11px] text-gray-500">Pro Users</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/[0.03] border-white/[0.06]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <ArrowDownToLine className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <div className="text-xl font-bold" data-testid="text-total-deposits">{adminDeposits.length}</div>
                        <div className="text-[11px] text-gray-500">Total Deposits</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/[0.03] border-white/[0.06]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                        <ArrowUpFromLine className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <div className="text-xl font-bold" data-testid="text-total-withdrawals">{adminWithdrawals.length}</div>
                        <div className="text-[11px] text-gray-500">Total Withdrawals</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                    <div className="text-lg font-bold text-emerald-400" data-testid="text-deposit-total">${totalDepositAmount.toFixed(2)}</div>
                    <div className="text-[11px] text-gray-500">Approved Deposits</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/20">
                  <CardContent className="p-4 text-center">
                    <BanknoteIcon className="w-5 h-5 mx-auto text-red-400 mb-1" />
                    <div className="text-lg font-bold text-red-400" data-testid="text-withdrawal-total">${totalWithdrawalAmount.toFixed(2)}</div>
                    <div className="text-[11px] text-gray-500">Approved Withdrawals</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/20">
                  <CardContent className="p-4 text-center">
                    <Clock className="w-5 h-5 mx-auto text-amber-400 mb-1" />
                    <div className="text-lg font-bold text-amber-400" data-testid="text-pending-count">{pendingDeposits.length + pendingWithdrawals.length}</div>
                    <div className="text-[11px] text-gray-500">Pending Transactions</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
                  <CardContent className="p-4 text-center">
                    <Shield className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                    <div className="text-lg font-bold text-blue-400" data-testid="text-kyc-verified">{verifiedKyc.length}/{kycSubmissions.length}</div>
                    <div className="text-[11px] text-gray-500">KYC Verified</div>
                  </CardContent>
                </Card>
              </div>

              {analytics && (
                <Card className="bg-white/[0.03] border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-400" />
                      Income Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-emerald-400">${analytics.stats.totalIncome.toFixed(2)}</div>
                        <div className="text-[11px] text-gray-500">Total Income</div>
                      </div>
                      <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-center">
                        <div className="text-lg font-bold">{analytics.stats.totalPayments}</div>
                        <div className="text-[11px] text-gray-500">Total Payments</div>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-amber-400">${analytics.stats.todayIncome.toFixed(2)}</div>
                        <div className="text-[11px] text-gray-500">Today</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-purple-400">${analytics.stats.last7DaysIncome.toFixed(2)}</div>
                        <div className="text-[11px] text-gray-500">Last 7 Days</div>
                      </div>
                    </div>

                    {analytics.payments.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/5 text-left">
                              <th className="py-2 px-3 text-[11px] text-gray-500 uppercase font-medium">User</th>
                              <th className="py-2 px-3 text-[11px] text-gray-500 uppercase font-medium">Network</th>
                              <th className="py-2 px-3 text-[11px] text-gray-500 uppercase font-medium">Amount</th>
                              <th className="py-2 px-3 text-[11px] text-gray-500 uppercase font-medium">Status</th>
                              <th className="py-2 px-3 text-[11px] text-gray-500 uppercase font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.payments.slice(0, 10).map((payment) => (
                              <tr key={payment.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="py-2 px-3 text-gray-300 text-xs">{payment.userEmail || 'Unknown'}</td>
                                <td className="py-2 px-3">
                                  <Badge className={payment.network === 'TRC20' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'} >
                                    {payment.network}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-emerald-400 font-mono text-xs">${payment.amount}</td>
                                <td className="py-2 px-3">
                                  <Badge className={payment.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}>
                                    {payment.status}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-gray-500 text-xs">
                                  {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {pendingDeposits.length > 0 && (
                <Card className="bg-white/[0.03] border-amber-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-400">
                      <AlertCircle className="w-5 h-5" />
                      Pending Deposits Requiring Action ({pendingDeposits.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingDeposits.slice(0, 5).map(d => (
                        <div key={d.id} className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10" data-testid={`card-pending-deposit-${d.id}`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              {d.orderId && <code className="text-[10px] text-neutral-500 font-mono bg-black/30 px-1.5 py-0.5 rounded">{d.orderId}</code>}
                              <span className="text-sm font-semibold">${d.amountUsdt?.toFixed(2)}</span>
                              <Badge variant="outline" className="text-xs">{d.type === "upi" ? "UPI" : d.type === "imps" ? "IMPS" : d.type === "skrill" ? "Skrill" : d.type === "volet" ? "Volet" : `${d.crypto} (${d.chain})`}</Badge>
                              <span className="text-xs text-gray-500">{d.userEmail || d.userName || d.userId?.slice(0, 8)}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => handleDepositAction(d.id, "approved")} disabled={processingTxId === d.id}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDepositAction(d.id, "rejected")} disabled={processingTxId === d.id}>
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {pendingDeposits.length > 5 && (
                        <Button variant="ghost" className="w-full text-amber-400 text-xs" onClick={() => setActiveTab("deposits")}>
                          View all {pendingDeposits.length} pending deposits <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {pendingWithdrawals.length > 0 && (
                <Card className="bg-white/[0.03] border-amber-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-400">
                      <AlertCircle className="w-5 h-5" />
                      Pending Withdrawals Requiring Action ({pendingWithdrawals.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingWithdrawals.slice(0, 5).map(w => (
                        <div key={w.id} className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10" data-testid={`card-pending-withdrawal-${w.id}`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              {w.orderId && <code className="text-[10px] text-neutral-500 font-mono bg-black/30 px-1.5 py-0.5 rounded">{w.orderId}</code>}
                              <span className="text-sm font-semibold">${w.amountUsdt?.toFixed(2)}</span>
                              <Badge variant="outline" className="text-xs">{w.type === "imps" ? "IMPS" : w.type === "upi" ? "UPI" : w.type === "binance_pay" ? "Binance Pay" : w.type === "wire_transfer" ? "Wire Transfer" : `${w.crypto} (${w.chain})`}</Badge>
                              <span className="text-xs text-gray-500">{w.userEmail || w.userName || w.userId?.slice(0, 8)}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => handleWithdrawalAction(w.id, "approved")} disabled={processingTxId === w.id}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleWithdrawalAction(w.id, "rejected")} disabled={processingTxId === w.id}>
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {pendingWithdrawals.length > 5 && (
                        <Button variant="ghost" className="w-full text-amber-400 text-xs" onClick={() => setActiveTab("withdrawals")}>
                          View all {pendingWithdrawals.length} pending withdrawals <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-white/[0.03] border-white/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { name: "AI Services (GPT-4o, Claude, Gemini)", status: "Operational" },
                      { name: "Database", status: "Operational" },
                      { name: "Market Data Feed", status: "Operational" },
                      { name: "KYC Verification", status: "Active" },
                      { name: "Email Service (Resend)", status: "Active" },
                      { name: "TRC20 Payments", status: trc20Address ? "Enabled" : "Not Set" },
                      { name: "BEP20 Payments", status: bep20Address ? "Enabled" : "Not Set" },
                      { name: "Payment Methods", status: `${paymentMethods.length} active` },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">
                        <span className="text-xs text-gray-400">{item.name}</span>
                        <Badge className={
                          item.status === "Not Set" 
                            ? "bg-gray-500/20 text-gray-400 text-[10px]" 
                            : "bg-emerald-500/20 text-emerald-400 text-[10px]"
                        }>
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "users" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                  <Badge className="bg-white/[0.08] text-neutral-400 ml-1">{users.length}</Badge>
                </h1>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 text-xs">
                    <Badge className="bg-amber-500/20 text-amber-400"><Crown className="w-3 h-3 mr-1" />{proCount} Pro</Badge>
                    <Badge className="bg-white/[0.08] text-neutral-400">{freeCount} Free</Badge>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, email, ID..."
                      className="pl-10 bg-black border-white/10 w-72"
                      data-testid="input-search-users"
                    />
                  </div>
                </div>
              </div>

              <Card className="bg-white/[0.03] border-white/5">
                <CardContent className="p-0">
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5 text-left bg-white/[0.02]">
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">#</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">User</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Email</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">User ID</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Plan</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Joined</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((user, idx) => (
                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="py-3 px-4 text-xs text-gray-600">{idx + 1}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-white/[0.12] flex items-center justify-center text-xs font-bold">
                                    {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-medium text-sm block">
                                      {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3 h-3 text-gray-600" />
                                  <span className="text-sm text-gray-400">{user.email || 'N/A'}</span>
                                  {user.email && (
                                    <button onClick={() => copyToClipboard(user.email!)} className="text-gray-600 hover:text-white">
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <code className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded font-mono">
                                    {user.id.slice(0, 12)}...
                                  </code>
                                  <button onClick={() => copyToClipboard(user.id)} className="text-gray-600 hover:text-white">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
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
                                <div className="flex items-center gap-1 text-xs text-gray-400">
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
                                    className="text-red-400 border-red-500/30 hover:bg-red-500/10 h-7 text-xs"
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
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-black h-7 text-xs"
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
                        <div className="text-center py-16 text-gray-500">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "deposits" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-green-400" />
                  Deposit Requests
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {pendingDeposits.length > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400">{pendingDeposits.length} pending</Badge>
                  )}
                </h1>
                <div className="flex gap-3 text-xs">
                  <Badge className="bg-green-500/20 text-green-400">{approvedDeposits.length} Approved</Badge>
                  <Badge className="bg-white/[0.08] text-neutral-400">Total: ${totalDepositAmount.toFixed(2)}</Badge>
                </div>
              </div>

              <Card className="bg-white/[0.03] border-white/5">
                <CardContent className="p-0">
                  {adminDeposits.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <ArrowDownToLine className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No deposit requests yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5 text-left bg-white/[0.02]">
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Order ID</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">User</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Amount</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Type</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Details</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Status</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Date</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminDeposits.map(d => (
                            <tr key={d.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${d.status === "pending" ? "bg-amber-500/[0.03]" : ""}`} data-testid={`row-deposit-${d.id}`}>
                              <td className="py-3 px-4">
                                <code className="text-[10px] text-neutral-500 font-mono">{d.orderId || '-'}</code>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm text-gray-300">{d.userEmail || d.userName || 'Unknown'}</div>
                                <div className="text-[10px] text-gray-600 font-mono">{d.userId?.slice(0, 10)}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm font-semibold text-white">${d.amountUsdt?.toFixed(2)}</div>
                                {(d.type === "upi" || d.type === "imps") && d.amountInr && (
                                  <div className="text-[10px] text-gray-500">INR ₹{d.amountInr.toFixed(2)}</div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="text-xs">
                                  {d.type === "upi" ? "UPI" : d.type === "imps" ? "IMPS" : d.type === "skrill" ? "Skrill" : d.type === "volet" ? "Volet" : `${d.crypto} (${d.chain})`}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-[11px] text-gray-400 space-y-0.5 max-w-[200px]">
                                  {d.txHash && <p className="font-mono truncate" title={d.txHash}>TX: {d.txHash}</p>}
                                  {d.utr && <p className="font-mono">UTR: {d.utr}</p>}
                                  {d.type === "skrill" && d.skrillEmail && <p>Skrill: {d.skrillEmail}</p>}
                                  {d.type === "volet" && d.voletEmail && <p>Volet: {d.voletEmail}</p>}
                                  {(d.type === "skrill" || d.type === "volet") && d.transactionId && <p className="font-mono">Txn: {d.transactionId}</p>}
                                  {!d.txHash && !d.utr && !d.skrillEmail && !d.voletEmail && <p className="text-gray-600">-</p>}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={
                                  d.status === "approved" ? "bg-green-500/20 text-green-400" :
                                  d.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                  d.status === "processing" ? "bg-blue-500/20 text-blue-400" :
                                  "bg-amber-500/20 text-amber-400"
                                }>{d.status}</Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-xs text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</div>
                                <div className="text-[10px] text-gray-600">{new Date(d.createdAt).toLocaleTimeString()}</div>
                              </td>
                              <td className="py-3 px-4">
                                {(d.status === "pending" || d.status === "processing") ? (
                                  <div className="flex gap-1.5">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2" onClick={() => handleDepositAction(d.id, "approved")} disabled={processingTxId === d.id} data-testid={`button-approve-deposit-${d.id}`}>
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2" onClick={() => handleDepositAction(d.id, "processing")} disabled={processingTxId === d.id}>
                                      <Clock className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => handleDepositAction(d.id, "rejected")} disabled={processingTxId === d.id}>
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-600">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "withdrawals" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <ArrowUpFromLine className="w-5 h-5 text-red-400" />
                  Withdrawal Requests
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {pendingWithdrawals.length > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400">{pendingWithdrawals.length} pending</Badge>
                  )}
                </h1>
                <div className="flex gap-3 text-xs">
                  <Badge className="bg-green-500/20 text-green-400">{approvedWithdrawals.length} Approved</Badge>
                  <Badge className="bg-white/[0.08] text-neutral-400">Total: ${totalWithdrawalAmount.toFixed(2)}</Badge>
                </div>
              </div>

              <Card className="bg-white/[0.03] border-white/5">
                <CardContent className="p-0">
                  {adminWithdrawals.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <ArrowUpFromLine className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No withdrawal requests yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5 text-left bg-white/[0.02]">
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Order ID</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">User</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Amount</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Type</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Payment Details</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Status</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Date</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminWithdrawals.map(w => (
                            <tr key={w.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${w.status === "pending" ? "bg-amber-500/[0.03]" : ""}`} data-testid={`row-withdrawal-${w.id}`}>
                              <td className="py-3 px-4">
                                <code className="text-[10px] text-neutral-500 font-mono">{w.orderId || '-'}</code>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm text-gray-300">{w.userEmail || w.userName || 'Unknown'}</div>
                                <div className="text-[10px] text-gray-600 font-mono">{w.userId?.slice(0, 10)}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-sm font-semibold text-white">${w.amountUsdt?.toFixed(2)}</div>
                                {(w.type === "upi" || w.type === "imps") && w.amountInr && (
                                  <div className="text-[10px] text-gray-500">INR ₹{w.amountInr.toFixed(2)}</div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="text-xs">
                                  {w.type === "imps" ? "IMPS" : w.type === "upi" ? "UPI" : w.type === "binance_pay" ? "Binance Pay" : w.type === "wire_transfer" ? "Wire Transfer" : `${w.crypto} (${w.chain})`}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-[11px] text-gray-400 space-y-0.5 max-w-[250px]">
                                  {w.type === "imps" && (
                                    <>
                                      <p>Name: <span className="text-white">{w.accountHolderName}</span></p>
                                      <p className="font-mono">A/C: {w.accountNumber}</p>
                                      <p className="font-mono">IFSC: {w.ifscCode}</p>
                                      {w.bankName && <p>Bank: {w.bankName}</p>}
                                    </>
                                  )}
                                  {w.type === "upi" && w.toAddress && (
                                    <p>UPI: <span className="font-mono">{w.toAddress}</span></p>
                                  )}
                                  {w.type === "binance_pay" && w.binancePayId && (
                                    <p className="font-mono">Pay ID: {w.binancePayId}</p>
                                  )}
                                  {w.type === "wire_transfer" && (
                                    <>
                                      {w.wireBankName && <p>Bank: {w.wireBankName}</p>}
                                      {w.wireAccountHolderName && <p>Name: <span className="text-white">{w.wireAccountHolderName}</span></p>}
                                      {w.wireAccountNumber && <p className="font-mono">A/C: {w.wireAccountNumber}</p>}
                                      {w.wireSwiftCode && <p className="font-mono">SWIFT: {w.wireSwiftCode}</p>}
                                      {w.wireIban && <p className="font-mono">IBAN: {w.wireIban}</p>}
                                    </>
                                  )}
                                  {w.type === "crypto" && w.toAddress && (
                                    <p className="font-mono truncate" title={w.toAddress}>To: {w.toAddress}</p>
                                  )}
                                  {!w.toAddress && !w.accountNumber && !w.binancePayId && !w.wireAccountNumber && <p className="text-gray-600">-</p>}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={
                                  w.status === "approved" ? "bg-green-500/20 text-green-400" :
                                  w.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                  w.status === "processing" ? "bg-blue-500/20 text-blue-400" :
                                  "bg-amber-500/20 text-amber-400"
                                }>{w.status}</Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-xs text-gray-500">{new Date(w.createdAt).toLocaleDateString()}</div>
                                <div className="text-[10px] text-gray-600">{new Date(w.createdAt).toLocaleTimeString()}</div>
                              </td>
                              <td className="py-3 px-4">
                                {(w.status === "pending" || w.status === "processing") ? (
                                  <div className="flex gap-1.5">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2" onClick={() => handleWithdrawalAction(w.id, "approved")} disabled={processingTxId === w.id} data-testid={`button-approve-withdrawal-${w.id}`}>
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-2" onClick={() => handleWithdrawalAction(w.id, "processing")} disabled={processingTxId === w.id}>
                                      <Clock className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => handleWithdrawalAction(w.id, "rejected")} disabled={processingTxId === w.id}>
                                      <XCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-600">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "kyc" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  KYC Submissions
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {pendingKyc.length > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400">{pendingKyc.length} pending</Badge>
                  )}
                </h1>
                <div className="flex gap-3 text-xs">
                  <Badge className="bg-green-500/20 text-green-400">{verifiedKyc.length} Verified</Badge>
                  <Badge className="bg-red-500/20 text-red-400">{kycSubmissions.filter(k => k.status === "rejected").length} Rejected</Badge>
                  <Badge className="bg-white/[0.08] text-neutral-400">{kycSubmissions.length} Total</Badge>
                </div>
              </div>

              {kycSubmissions.length === 0 ? (
                <Card className="bg-white/[0.03] border-white/5">
                  <CardContent className="py-16 text-center text-gray-500">
                    <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No KYC submissions yet
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {kycSubmissions.map(k => (
                    <Card key={k.id} className={`border ${k.status === "pending" ? "bg-amber-500/[0.03] border-amber-500/20" : "bg-white/[0.03] border-white/5"}`} data-testid={`card-kyc-${k.id}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  k.status === "verified" ? "bg-green-500/20 text-green-400" :
                                  k.status === "rejected" ? "bg-red-500/20 text-red-400" :
                                  "bg-amber-500/20 text-amber-400"
                                }>{k.status}</Badge>
                                <span className="text-sm font-semibold capitalize">{k.documentType?.replace("_", " ")}</span>
                              </div>
                              <span className="text-xs text-gray-500">{new Date(k.createdAt).toLocaleString()}</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-white/[0.03] rounded-lg p-2.5">
                                <div className="text-[10px] text-gray-500 uppercase mb-0.5">User</div>
                                <div className="text-sm text-white">{k.userName || k.userEmail || "Unknown"}</div>
                              </div>
                              {k.extractedName && (
                                <div className="bg-white/[0.03] rounded-lg p-2.5">
                                  <div className="text-[10px] text-gray-500 uppercase mb-0.5">Name on Document</div>
                                  <div className="text-sm text-white">{k.extractedName}</div>
                                </div>
                              )}
                              {k.extractedDocNumber && (
                                <div className="bg-white/[0.03] rounded-lg p-2.5">
                                  <div className="text-[10px] text-gray-500 uppercase mb-0.5">Document Number</div>
                                  <div className="text-sm text-white font-mono">{k.extractedDocNumber}</div>
                                </div>
                              )}
                              {k.extractedDob && (
                                <div className="bg-white/[0.03] rounded-lg p-2.5">
                                  <div className="text-[10px] text-gray-500 uppercase mb-0.5">Date of Birth</div>
                                  <div className="text-sm text-white">{k.extractedDob}</div>
                                </div>
                              )}
                              {k.extractedGender && (
                                <div className="bg-white/[0.03] rounded-lg p-2.5">
                                  <div className="text-[10px] text-gray-500 uppercase mb-0.5">Gender</div>
                                  <div className="text-sm text-white">{k.extractedGender}</div>
                                </div>
                              )}
                            </div>

                            {k.status === "pending" && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                                  onClick={() => handleKycAction(k.id, "verified")}
                                  disabled={processingKycId === k.id}
                                  data-testid={`button-kyc-approve-${k.id}`}
                                >
                                  {processingKycId === k.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                                  Verify KYC
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs"
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
                              <div className="bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
                                <p className="text-xs text-amber-400"><span className="font-medium">Note:</span> {k.adminNotes}</p>
                              </div>
                            )}
                          </div>

                          {(k.documentImage || k.documentImageBack) && (
                            <div className="flex gap-3 lg:flex-col">
                              {k.documentImage && (
                                <div>
                                  <p className="text-[10px] text-gray-500 mb-1 uppercase">Front Side</p>
                                  <img src={k.documentImage} alt="Front" className="max-h-40 rounded-lg border border-white/10 cursor-pointer hover:border-white/30 transition-colors" data-testid={`img-kyc-front-${k.id}`} onClick={() => window.open(k.documentImage, '_blank')} />
                                </div>
                              )}
                              {k.documentImageBack && (
                                <div>
                                  <p className="text-[10px] text-gray-500 mb-1 uppercase">Back Side</p>
                                  <img src={k.documentImageBack} alt="Back" className="max-h-40 rounded-lg border border-white/10 cursor-pointer hover:border-white/30 transition-colors" data-testid={`img-kyc-back-${k.id}`} onClick={() => window.open(k.documentImageBack, '_blank')} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "promos" && (
            <>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-purple-400" />
                Promo Codes
                <Badge className="bg-white/[0.08] text-neutral-400 ml-1">{promoCodes.length}</Badge>
              </h1>

              <Card className="bg-white/[0.03] border-white/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Create New Promo Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
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
                    <div className="w-28">
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
                    <div className="w-28">
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
                </CardContent>
              </Card>

              <Card className="bg-white/[0.03] border-white/5">
                <CardContent className="p-0">
                  {isLoadingPromos ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    </div>
                  ) : promoCodes.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No promo codes created yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5 text-left bg-white/[0.02]">
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Code</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Discount</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Usage</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Status</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Created</th>
                            <th className="py-3 px-4 text-[11px] text-gray-500 uppercase font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {promoCodes.map((promo) => (
                            <tr key={promo.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${!promo.isActive ? 'opacity-50' : ''}`} data-testid={`row-promo-${promo.code}`}>
                              <td className="py-3 px-4">
                                <code className="text-sm font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded">
                                  {promo.code}
                                </code>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className="bg-emerald-500/20 text-emerald-400">
                                  {promo.discountPercent}% OFF
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-300">
                                  {promo.usedCount}{promo.maxUses ? `/${promo.maxUses}` : ''} uses
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <Badge className={promo.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                                  {promo.isActive ? "Active" : "Disabled"}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-xs text-gray-500">
                                {promo.createdAt ? new Date(promo.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleTogglePromoCode(promo.id, promo.isActive)}
                                    className={`h-7 text-xs ${promo.isActive ? "text-amber-400 border-amber-500/30" : "text-emerald-400 border-emerald-500/30"}`}
                                    data-testid={`button-toggle-promo-${promo.code}`}
                                  >
                                    {promo.isActive ? 'Disable' : 'Enable'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeletePromoCode(promo.id)}
                                    disabled={deletingPromoId === promo.id}
                                    className="text-red-400 border-red-500/30 hover:bg-red-500/10 h-7 text-xs"
                                    data-testid={`button-delete-promo-${promo.code}`}
                                  >
                                    {deletingPromoId === promo.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "settings" && (
            <>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Settings
              </h1>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="bg-white/[0.03] border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-neutral-400" />
                      Payment Wallet Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
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
                
                <Card className="bg-white/[0.03] border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
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
                        <h3 className="text-sm font-semibold text-gray-400">Active Methods ({paymentMethods.length})</h3>
                        {paymentMethods.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-lg border border-white/5" data-testid={`card-method-${m.id}`}>
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
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}