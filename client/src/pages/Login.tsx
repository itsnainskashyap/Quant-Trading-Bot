import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { queryClient } from "@/lib/queryClient";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";

export function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");

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

      if (data.requiresOTP) {
        setChallengeToken(data.challengeToken);
        toast({ title: "Code Sent", description: "A verification code has been sent to your email." });
        setStep("otp");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({ title: "Error", description: "Please enter the 6-digit code", variant: "destructive" });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/auth/verify-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, challengeToken }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
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
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "login", challengeToken }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to resend code");
      }

      toast({ title: "Code Resent", description: "A new verification code has been sent." });
      setOtp("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img src={logoImage} alt="TradeX AI" className="h-9 mx-auto mb-8" />
          {step === "credentials" ? (
            <>
              <h1 className="text-2xl font-light text-white tracking-tight mb-2">Welcome back</h1>
              <p className="text-neutral-500 text-sm">Sign in to your account</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-light text-white tracking-tight mb-2">Verify login</h1>
              <p className="text-neutral-500 text-sm">Enter the code sent to <span className="text-white">{email}</span></p>
            </>
          )}
        </div>

        {step === "credentials" ? (
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

            <div className="text-right">
              <Link href="/forgot-password" className="text-neutral-500 text-xs hover:text-white transition" data-testid="link-forgot-password">
                Forgot password?
              </Link>
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
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="input-login-otp">
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="bg-white/[0.04] border-white/[0.08] text-white text-lg h-12 w-12" />
                  <InputOTPSlot index={1} className="bg-white/[0.04] border-white/[0.08] text-white text-lg h-12 w-12" />
                  <InputOTPSlot index={2} className="bg-white/[0.04] border-white/[0.08] text-white text-lg h-12 w-12" />
                  <InputOTPSlot index={3} className="bg-white/[0.04] border-white/[0.08] text-white text-lg h-12 w-12" />
                  <InputOTPSlot index={4} className="bg-white/[0.04] border-white/[0.08] text-white text-lg h-12 w-12" />
                  <InputOTPSlot index={5} className="bg-white/[0.04] border-white/[0.08] text-white text-lg h-12 w-12" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <p className="text-center text-neutral-500 text-xs">
              Code expires in 10 minutes. Check your spam folder if not received.
            </p>

            <Button
              onClick={handleVerifyOTP}
              disabled={isVerifying || otp.length !== 6}
              className="w-full bg-white text-black hover:bg-neutral-200 h-10 rounded-lg font-medium text-sm disabled:opacity-40"
              data-testid="button-verify-login"
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Verify & Sign In
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <button
                onClick={handleResendOTP}
                disabled={isResending}
                className="text-neutral-500 text-xs hover:text-white transition disabled:opacity-40"
                data-testid="button-resend-login-otp"
              >
                {isResending ? "Sending..." : "Didn't receive the code? Resend"}
              </button>
              <div>
                <button
                  onClick={() => { setStep("credentials"); setOtp(""); setChallengeToken(""); }}
                  className="text-neutral-600 text-xs hover:text-neutral-400 transition"
                  data-testid="button-back-to-login"
                >
                  ← Back to login
                </button>
              </div>
            </div>
          </div>
        )}

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
