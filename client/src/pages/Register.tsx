import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Loader2, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import logoImage from "@assets/Picsart_26-03-10_23-57-49-090_1773170426667.png";
import { TermsContent } from "@/components/TermsAndConditions";

const COUNTRIES = [
  { code: "AF", name: "Afghanistan", dial: "+93" },
  { code: "AL", name: "Albania", dial: "+355" },
  { code: "DZ", name: "Algeria", dial: "+213" },
  { code: "AR", name: "Argentina", dial: "+54" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "AT", name: "Austria", dial: "+43" },
  { code: "BD", name: "Bangladesh", dial: "+880" },
  { code: "BE", name: "Belgium", dial: "+32" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "CO", name: "Colombia", dial: "+57" },
  { code: "EG", name: "Egypt", dial: "+20" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "GH", name: "Ghana", dial: "+233" },
  { code: "HK", name: "Hong Kong", dial: "+852" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "ID", name: "Indonesia", dial: "+62" },
  { code: "IR", name: "Iran", dial: "+98" },
  { code: "IQ", name: "Iraq", dial: "+964" },
  { code: "IE", name: "Ireland", dial: "+353" },
  { code: "IL", name: "Israel", dial: "+972" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "JO", name: "Jordan", dial: "+962" },
  { code: "KE", name: "Kenya", dial: "+254" },
  { code: "KW", name: "Kuwait", dial: "+965" },
  { code: "LB", name: "Lebanon", dial: "+961" },
  { code: "MY", name: "Malaysia", dial: "+60" },
  { code: "MX", name: "Mexico", dial: "+52" },
  { code: "MA", name: "Morocco", dial: "+212" },
  { code: "NP", name: "Nepal", dial: "+977" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "NZ", name: "New Zealand", dial: "+64" },
  { code: "NG", name: "Nigeria", dial: "+234" },
  { code: "NO", name: "Norway", dial: "+47" },
  { code: "OM", name: "Oman", dial: "+968" },
  { code: "PK", name: "Pakistan", dial: "+92" },
  { code: "PH", name: "Philippines", dial: "+63" },
  { code: "PL", name: "Poland", dial: "+48" },
  { code: "PT", name: "Portugal", dial: "+351" },
  { code: "QA", name: "Qatar", dial: "+974" },
  { code: "RO", name: "Romania", dial: "+40" },
  { code: "RU", name: "Russia", dial: "+7" },
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "ZA", name: "South Africa", dial: "+27" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "LK", name: "Sri Lanka", dial: "+94" },
  { code: "SE", name: "Sweden", dial: "+46" },
  { code: "CH", name: "Switzerland", dial: "+41" },
  { code: "TW", name: "Taiwan", dial: "+886" },
  { code: "TH", name: "Thailand", dial: "+66" },
  { code: "TR", name: "Turkey", dial: "+90" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "VN", name: "Vietnam", dial: "+84" },
];

function countryFlag(code: string) {
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
}

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
  const [notUsTaxpayer, setNotUsTaxpayer] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [step, setStep] = useState<"register" | "verify">("register");
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [phone, setPhone] = useState("");

  const countryObj = COUNTRIES.find(c => c.code === selectedCountry);
  const dialCode = countryObj?.dial || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (!selectedCountry) {
      toast({ title: "Error", description: "Please select your country", variant: "destructive" });
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
      const fullPhone = phone ? `${dialCode}${phone}` : undefined;
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          country: countryObj?.name,
          countryCode: dialCode,
          phone: fullPhone,
        }),
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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <img src={logoImage} alt="TradeX AI" className="h-9 w-9 rounded-full" />
            <span className="text-white font-semibold text-xl tracking-tight">TradeX AI</span>
          </div>
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
          <form onSubmit={handleSubmit} className="space-y-3.5">
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
              <label className="text-xs text-neutral-400 font-medium">Country</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg" data-testid="select-country">
                  <SelectValue placeholder="Select your country">
                    {countryObj && <span>{countryFlag(countryObj.code)} {countryObj.name} ({countryObj.dial})</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-neutral-950 border-white/[0.08] max-h-[240px]">
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code} className="text-white hover:bg-white/[0.05]">
                      <span className="mr-2">{countryFlag(c.code)}</span>{c.name} ({c.dial})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-neutral-400 font-medium">Mobile Number <span className="text-neutral-600">(optional)</span></label>
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-[90px]">
                  <Input
                    value={countryObj ? `${countryFlag(countryObj.code)} ${dialCode}` : dialCode}
                    readOnly
                    className="bg-white/[0.03] border-white/[0.08] text-neutral-400 h-10 rounded-lg text-center text-sm cursor-default"
                    tabIndex={-1}
                  />
                </div>
                <Input
                  type="tel"
                  placeholder="Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="bg-white/[0.04] border-white/[0.08] text-white h-10 rounded-lg placeholder:text-neutral-600 focus:border-white/20 focus:ring-0 font-mono"
                  data-testid="input-phone"
                />
              </div>
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
                id="notUsTaxpayer"
                checked={notUsTaxpayer}
                onCheckedChange={(checked) => setNotUsTaxpayer(checked === true)}
                className="mt-0.5 border-neutral-700 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-black"
                data-testid="checkbox-us-taxpayer"
              />
              <label htmlFor="notUsTaxpayer" className="text-xs text-neutral-500 leading-relaxed cursor-pointer">
                I certify that I am <span className="text-white font-medium">not a US citizen or US tax resident</span> (W-8BEN declaration)
              </label>
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
              disabled={isLoading || !agreedToTerms || !notUsTaxpayer}
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
