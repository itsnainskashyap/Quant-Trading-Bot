import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";
import { TermsContent } from "@/components/TermsAndConditions";

export function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [step, setStep] = useState<"register" | "verify">("register");
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    if (!agreedToTerms) {
      toast({ title: "Error", description: "Please agree to the Terms & Conditions", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      toast({ title: "Code Sent", description: "A verification code has been sent to your email." });
      setStep("verify");
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
      const response = await fetch("/api/auth/verify-registration-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      toast({ title: "Verified!", description: "Your email has been verified successfully." });
      setLocation("/personalize");
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
        body: JSON.stringify({ email, purpose: "registration" }),
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
          {step === "register" ? (
            <>
              <h1 className="text-2xl font-light text-white tracking-tight mb-2">Create account</h1>
              <p className="text-neutral-500 text-sm">Start trading with AI signals</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-light text-white tracking-tight mb-2">Verify your email</h1>
              <p className="text-neutral-500 text-sm">We sent a 6-digit code to <span className="text-white">{email}</span></p>
            </>
          )}
        </div>

        {step === "register" ? (
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
                  placeholder="Min 6 characters"
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

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-medium">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg pr-10 placeholder:text-neutral-600 focus:border-white/20 focus:ring-0"
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 text-xs"
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                className="mt-0.5 border-neutral-700 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black"
                data-testid="checkbox-terms"
              />
              <label htmlFor="terms" className="text-xs text-neutral-500 leading-relaxed cursor-pointer">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-white hover:underline"
                  data-testid="button-view-terms"
                >
                  Terms & Conditions
                </button>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="w-full bg-white text-black hover:bg-neutral-200 h-10 rounded-lg font-medium text-sm mt-2 disabled:opacity-40"
              data-testid="button-register"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp} data-testid="input-registration-otp">
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
              data-testid="button-verify-registration"
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Verify Email
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <button
                onClick={handleResendOTP}
                disabled={isResending}
                className="text-neutral-500 text-xs hover:text-white transition disabled:opacity-40"
                data-testid="button-resend-registration-otp"
              >
                {isResending ? "Sending..." : "Didn't receive the code? Resend"}
              </button>
              <div>
                <button
                  onClick={() => { setStep("register"); setOtp(""); }}
                  className="text-neutral-600 text-xs hover:text-neutral-400 transition"
                  data-testid="button-back-to-register"
                >
                  ← Back to registration
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-neutral-500 text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="bg-neutral-950 border-white/[0.08] text-white max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white font-light text-lg">Terms & Conditions</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <TermsContent />
          </ScrollArea>
          <div className="pt-3 border-t border-white/[0.06]">
            <Button
              onClick={() => {
                setAgreedToTerms(true);
                setShowTermsModal(false);
              }}
              className="w-full bg-white text-black hover:bg-neutral-200 h-10 rounded-lg font-medium text-sm"
              data-testid="button-accept-terms"
            >
              I Accept
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Register;
