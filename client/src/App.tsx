import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import { Landing } from "@/pages/Landing";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import Personalize from "@/pages/Personalize";
import Plans from "@/pages/Plans";
import Payment from "@/pages/Payment";
import Wallet from "@/pages/Wallet";
import KYC from "@/pages/KYC";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!user.firstName && location !== "/personalize") {
    return <Redirect to="/personalize" />;
  }

  if (!user.onboardingCompleted && user.firstName && location !== "/plans" && location !== "/payment") {
    return <Redirect to="/plans" />;
  }

  return <>{children}</>;
}

function AuthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/">
        <OnboardingGuard>
          <Home />
        </OnboardingGuard>
      </Route>
      <Route path="/dashboard">
        <OnboardingGuard>
          <Home />
        </OnboardingGuard>
      </Route>
      <Route path="/trade">
        <OnboardingGuard>
          <Dashboard />
        </OnboardingGuard>
      </Route>
      <Route path="/profile">
        <OnboardingGuard>
          <Profile />
        </OnboardingGuard>
      </Route>
      <Route path="/admin">
        <OnboardingGuard>
          <Admin />
        </OnboardingGuard>
      </Route>
      <Route path="/personalize">
        <Personalize />
      </Route>
      <Route path="/plans">
        <Plans />
      </Route>
      <Route path="/payment">
        <Payment />
      </Route>
      <Route path="/wallet">
        <OnboardingGuard>
          <Wallet />
        </OnboardingGuard>
      </Route>
      <Route path="/kyc">
        <OnboardingGuard>
          <KYC />
        </OnboardingGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function UnauthenticatedRoutes() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/personalize">
        <Redirect to="/login" />
      </Route>
      <Route path="/plans">
        <Redirect to="/login" />
      </Route>
      <Route path="/dashboard">
        <Redirect to="/login" />
      </Route>
      <Route path="/trade">
        <Redirect to="/login" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <UnauthenticatedRoutes />;
  }
  
  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
