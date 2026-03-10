import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";

export function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      const userRes = await fetch("/api/auth/user", { credentials: "include" });
      const user = await userRes.json();
      
      if (!user.onboardingCompleted) {
        if (!user.firstName) {
          setLocation("/personalize");
        } else {
          setLocation("/plans");
        }
      } else {
        setLocation("/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img src={logoImage} alt="TradeX AI" className="h-9 mx-auto mb-8" />
          <h1 className="text-2xl font-light text-white tracking-tight mb-2">Welcome back</h1>
          <p className="text-neutral-500 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-400 font-medium">Email</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg placeholder:text-neutral-600 focus:border-white/20 focus:ring-0"
              data-testid="input-email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-neutral-400 font-medium">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg pr-10 placeholder:text-neutral-600 focus:border-white/20 focus:ring-0"
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 text-xs"
                data-testid="button-toggle-password"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black hover:bg-neutral-200 h-10 rounded-lg font-medium text-sm mt-2"
            data-testid="button-login"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-neutral-500 text-sm">
            Don't have an account?{" "}
            <Link href="/register" className="text-white hover:underline" data-testid="link-register">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
