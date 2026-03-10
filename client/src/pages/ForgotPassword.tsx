import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowLeft, Mail, KeyRound, Lock } from "lucide-react";
import logoImage from "@assets/Picsart_26-03-10_23-57-49-090_1773170426667.png";

type Step = "email" | "otp" | "newPassword";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast({ title: "Error", description: "Enter your email", variant: "destructive" });

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Code Sent", description: "If an account exists with this email, a reset code has been sent" });
      setStep("otp");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return toast({ title: "Error", description: "Enter the verification code", variant: "destructive" });

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResetToken(data.resetToken);
      setStep("newPassword");
      toast({ title: "Verified", description: "Now set your new password" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
    }
    if (newPassword.length < 6) {
      return toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Password Reset", description: "You can now sign in with your new password" });
      setLocation("/login");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to resend");
      toast({ title: "Code Resent", description: "A new verification code has been sent to your email" });
    } catch {
      toast({ title: "Error", description: "Failed to resend code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4" data-testid="page-forgot-password">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-8">
            <img src={logoImage} alt="TradeX AI" className="h-9 w-9 rounded-full" />
            <span className="text-white font-semibold text-xl tracking-tight">TradeX AI</span>
          </div>
          <h1 className="text-2xl font-light text-white tracking-tight mb-2">
            {step === "email" ? "Reset Password" : step === "otp" ? "Enter Code" : "New Password"}
          </h1>
          <p className="text-neutral-500 text-sm">
            {step === "email"
              ? "Enter your email to receive a reset code"
              : step === "otp"
                ? `We sent a 6-digit code to ${email}`
                : "Create a new password for your account"}
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg pl-10 placeholder:text-neutral-600 focus:border-white/20 focus:ring-0"
                  data-testid="input-forgot-email"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-neutral-200 h-10 rounded-lg font-medium text-sm"
              data-testid="button-send-code"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Code"}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-medium">Verification Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg pl-10 text-center font-mono text-lg tracking-[0.5em] placeholder:text-neutral-600 placeholder:tracking-normal placeholder:text-sm focus:border-white/20 focus:ring-0"
                  maxLength={6}
                  data-testid="input-forgot-otp"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-white text-black hover:bg-neutral-200 h-10 rounded-lg font-medium text-sm"
              data-testid="button-verify-otp"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Code"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="text-neutral-500 text-xs hover:text-white transition"
                data-testid="button-resend-code"
              >
                Didn't receive a code? Resend
              </button>
            </div>
          </form>
        )}

        {step === "newPassword" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-medium">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg pl-10 placeholder:text-neutral-600 focus:border-white/20 focus:ring-0"
                  data-testid="input-new-password"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg pl-10 placeholder:text-neutral-600 focus:border-white/20 focus:ring-0"
                  data-testid="input-confirm-new-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-neutral-200 h-10 rounded-lg font-medium text-sm"
              data-testid="button-reset-password"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
            </Button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/login" className="text-neutral-500 text-sm hover:text-white inline-flex items-center gap-1" data-testid="link-back-login">
            <ArrowLeft className="w-3 h-3" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
