import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Mail, 
  Calendar,
  Crown,
  TrendingUp,
  Target
} from "lucide-react";
import logoImage from "@assets/image_1769090256764.png";

interface UserStats {
  totalPredictions: number;
  winRate: number;
  currentStreak: number;
}

export default function Profile() {
  const { user, logout, isLoggingOut } = useAuth();
  
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';

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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="mb-6" data-testid="card-profile">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold" data-testid="text-user-name">
                {user.firstName} {user.lastName}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Mail className="w-4 h-4" />
                <span data-testid="text-user-email">{user.email}</span>
              </div>
              <Badge className="mt-4" data-testid="badge-plan">
                <Crown className="w-3 h-3 mr-1" />
                Free Plan
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6" data-testid="card-stats">
          <CardHeader>
            <CardTitle className="text-lg">Trading Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Target className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold" data-testid="stat-predictions">
                  {stats?.totalPredictions || 0}
                </div>
                <div className="text-xs text-muted-foreground">Predictions</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-success" data-testid="stat-winrate">
                  {stats?.winRate || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold" data-testid="stat-streak">
                  {stats?.currentStreak || 0}
                </div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-subscription">
          <CardHeader>
            <CardTitle className="text-lg">Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Free Plan</p>
                <p className="text-sm text-muted-foreground">10 signals per day</p>
              </div>
              <Button data-testid="button-upgrade">Upgrade to Pro</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
