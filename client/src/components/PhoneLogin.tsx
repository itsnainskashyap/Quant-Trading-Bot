import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Phone, ArrowRight, Loader2, Shield, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PhoneLoginProps {
  onSuccess?: () => void;
}

type Step = "phone" | "otp" | "profile";

export function PhoneLogin({ onSuccess }: PhoneLoginProps) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const { toast } = useToast();

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = countryCode.replace("+", "") + phone.replace(/\D/g, "");
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await response.json();
      if (data.success) {
        setStep("otp");
        toast({
          title: "OTP Sent",
          description: "Check your phone for the verification code",
        });
      } else {
        toast({
          title: "Failed to send OTP",
          description: data.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = countryCode.replace("+", "") + phone.replace(/\D/g, "");
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: fullPhone, code: otp }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Verified",
          description: "Phone number verified successfully",
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        if (data.needsProfile) {
          setNeedsProfile(true);
          setStep("profile");
        } else {
          onSuccess?.();
        }
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Invalid code",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Verification failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const countryCodes = [
    { code: "+1", country: "US/CA" },
    { code: "+44", country: "UK" },
    { code: "+49", country: "DE" },
    { code: "+33", country: "FR" },
    { code: "+86", country: "CN" },
    { code: "+91", country: "IN" },
    { code: "+81", country: "JP" },
    { code: "+82", country: "KR" },
    { code: "+65", country: "SG" },
    { code: "+971", country: "UAE" },
    { code: "+234", country: "NG" },
    { code: "+27", country: "ZA" },
    { code: "+55", country: "BR" },
    { code: "+52", country: "MX" },
    { code: "+61", country: "AU" },
  ];

  return (
    <Card className="w-full max-w-md bg-white/[0.03] border-white/10">
      <CardHeader className="text-center pb-2">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.08] flex items-center justify-center">
          <Phone className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          {step === "phone" && "Login with Phone"}
          {step === "otp" && "Enter Verification Code"}
          {step === "profile" && "Complete Your Profile"}
        </h2>
        <p className="text-gray-400 text-sm">
          {step === "phone" && "We'll send you a verification code"}
          {step === "otp" && `Code sent to ${countryCode} ${phone}`}
          {step === "profile" && "Tell us a bit about yourself"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "phone" && (
          <>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-[#1a1a24] border border-white/10 rounded-lg px-3 py-2 text-white text-sm w-24"
                data-testid="select-country-code"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} {c.country}
                  </option>
                ))}
              </select>
              <Input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 bg-[#1a1a24] border-white/10 text-white"
                data-testid="input-phone"
              />
            </div>
            <Button
              onClick={handleSendOTP}
              disabled={isLoading || !phone}
              className="w-full bg-white text-black hover:bg-neutral-200 h-12"
              data-testid="button-send-otp"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Send Code <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
              <Shield className="w-4 h-4" />
              <span>Your phone number is encrypted and secure</span>
            </div>
          </>
        )}

        {step === "otp" && (
          <>
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="bg-[#1a1a24] border-white/10 text-white text-center text-2xl tracking-widest"
              maxLength={6}
              data-testid="input-otp"
            />
            <Button
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.length !== 6}
              className="w-full bg-white text-black hover:bg-neutral-200 h-12"
              data-testid="button-verify-otp"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Verify <CheckCircle2 className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setStep("phone")}
              className="w-full text-gray-400"
              data-testid="button-back-phone"
            >
              Change phone number
            </Button>
            <Button
              variant="ghost"
              onClick={handleSendOTP}
              disabled={isLoading}
              className="w-full text-neutral-400 hover:text-white"
              data-testid="button-resend-otp"
            >
              Resend code
            </Button>
          </>
        )}

        {step === "profile" && needsProfile && (
          <ProfileSetup onComplete={() => onSuccess?.()} />
        )}
      </CardContent>
    </Card>
  );
}

function ProfileSetup({ onComplete }: { onComplete: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveProfile = async () => {
    if (!firstName) {
      toast({
        title: "Name required",
        description: "Please enter your first name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, email }),
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: "Profile saved",
          description: "Welcome to TradeX AI!",
        });
        onComplete();
      } else {
        toast({
          title: "Failed to save",
          description: "Please try again",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="First name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="bg-[#1a1a24] border-white/10 text-white"
        data-testid="input-first-name"
      />
      <Input
        type="text"
        placeholder="Last name (optional)"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className="bg-[#1a1a24] border-white/10 text-white"
        data-testid="input-last-name"
      />
      <Input
        type="email"
        placeholder="Email (optional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-[#1a1a24] border-white/10 text-white"
        data-testid="input-email"
      />
      <Button
        onClick={handleSaveProfile}
        disabled={isLoading || !firstName}
        className="w-full bg-white text-black hover:bg-neutral-200 h-12"
        data-testid="button-save-profile"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Start Trading <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
