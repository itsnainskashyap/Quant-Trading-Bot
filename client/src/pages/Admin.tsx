import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  AlertCircle
} from "lucide-react";
import { CryptoLogo } from "@/components/CryptoLogos";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";
import { useToast } from "@/hooks/use-toast";

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  totalPredictions: number;
  avgWinRate: number;
}

interface AdminSettings {
  trc20Address?: string;
  bep20Address?: string;
  proPrice: number;
}

export default function Admin() {
  const { user, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  
  const [trc20Address, setTrc20Address] = useState('');
  const [bep20Address, setBep20Address] = useState('');
  const [proPrice, setProPrice] = useState(10);
  
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
    enabled: !!user,
  });

  useEffect(() => {
    if (settings) {
      setTrc20Address(settings.trc20Address || '');
      setBep20Address(settings.bep20Address || '');
      setProPrice(settings.proPrice || 10);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (data: { trc20Address: string; bep20Address: string; proPrice: number }) => {
      return apiRequest('POST', '/api/admin/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Settings Updated",
        description: "Payment wallet addresses have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    if (!trc20Address && !bep20Address) {
      toast({
        title: "Error",
        description: "Please enter at least one wallet address",
        variant: "destructive",
      });
      return;
    }
    updateSettings.mutate({ trc20Address, bep20Address, proPrice });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <img src={logoImage} alt="TradeX AI" className="h-8 w-auto" data-testid="img-logo" />
              <Badge variant="destructive" data-testid="badge-admin">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            </div>
            <Button 
              variant="outline" 
              onClick={() => logout()}
              disabled={isLoggingOut}
              data-testid="button-logout"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" data-testid="text-admin-title">Admin Dashboard</h1>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card data-testid="card-stat-users">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stat-free">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Free Users</p>
                  <p className="text-2xl font-bold">{stats?.freeUsers || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stat-pro">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pro Users</p>
                  <p className="text-2xl font-bold">{stats?.proUsers || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card data-testid="card-stat-predictions">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Predictions</p>
                  <p className="text-2xl font-bold">{stats?.totalPredictions || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card data-testid="card-payment-settings">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5" />
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
                    className="w-24 bg-background"
                    min={1}
                    data-testid="input-pro-price"
                  />
                  <span className="text-muted-foreground">USDT</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CryptoLogo type="trc20" className="w-5 h-5" />
                    TRC20 (TRON) Wallet Address
                  </Label>
                  <Input
                    value={trc20Address}
                    onChange={(e) => setTrc20Address(e.target.value)}
                    placeholder="Enter your TRC20 USDT address (starts with T)"
                    className="font-mono text-sm"
                    data-testid="input-trc20-address"
                  />
                  {trc20Address && trc20Address.startsWith('T') && (
                    <div className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle className="w-3 h-3" />
                      Valid TRC20 format
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CryptoLogo type="bep20" className="w-5 h-5" />
                    BEP20 (BSC) Wallet Address
                  </Label>
                  <Input
                    value={bep20Address}
                    onChange={(e) => setBep20Address(e.target.value)}
                    placeholder="Enter your BEP20 USDT address (starts with 0x)"
                    className="font-mono text-sm"
                    data-testid="input-bep20-address"
                  />
                  {bep20Address && bep20Address.startsWith('0x') && (
                    <div className="flex items-center gap-1 text-xs text-green-500">
                      <CheckCircle className="w-3 h-3" />
                      Valid BEP20 format
                    </div>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
                className="w-full"
                data-testid="button-save-settings"
              >
                {updateSettings.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Payment Settings
                  </>
                )}
              </Button>

              {(!trc20Address && !bep20Address) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Add at least one wallet address to receive Pro subscription payments</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card data-testid="card-system-health">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">AI Services</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Market Data Feed</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Blockchain Verification</span>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <CryptoLogo type="trc20" className="w-4 h-4" />
                    TRC20 Payments
                  </span>
                  <Badge variant="outline" className={trc20Address ? "bg-success/10 text-success border-success/20" : "bg-muted/50 text-muted-foreground"}>
                    {trc20Address ? "Enabled" : "Not Configured"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <CryptoLogo type="bep20" className="w-4 h-4" />
                    BEP20 Payments
                  </span>
                  <Badge variant="outline" className={bep20Address ? "bg-success/10 text-success border-success/20" : "bg-muted/50 text-muted-foreground"}>
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
