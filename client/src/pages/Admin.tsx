import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  CreditCard,
  Activity,
  Shield
} from "lucide-react";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";

interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  totalPredictions: number;
  avgWinRate: number;
}

export default function Admin() {
  const { user, logout, isLoggingOut } = useAuth();
  
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user,
  });

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
          <Card data-testid="card-recent-users">
            <CardHeader>
              <CardTitle className="text-lg">Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                User management features coming soon.
              </p>
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
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
