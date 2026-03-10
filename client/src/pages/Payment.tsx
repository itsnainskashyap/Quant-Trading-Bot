import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Loader2, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Wallet, 
  Shield, 
  Sparkles,
  AlertCircle,
  ExternalLink,
  Tag,
  Check,
  X
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import logoImage from "@assets/Picsart_26-03-10_23-57-49-090_1773167302165.png";

export function Payment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [selectedNetwork, setSelectedNetwork] = useState<"trc20" | "bep20">("trc20");
  
  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoApplied, setPromoApplied] = useState(false);

  const { data: paymentConfig, isLoading: configLoading } = useQuery<{
    trc20Address: string;
    bep20Address: string;
    amount: number;
    enabled: boolean;
  }>({
    queryKey: ["/api/payment/config"],
  });

  const copyAddress = () => {
    const address = selectedNetwork === "trc20" ? paymentConfig?.trc20Address : paymentConfig?.bep20Address;
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast({ title: "Address Copied", description: "Payment address copied to clipboard" });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    
    setIsValidatingPromo(true);
    setPromoError(null);
    
    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (data.valid) {
        setPromoDiscount(data.discount);
        setPromoApplied(true);
        toast({ title: "Promo Code Applied!", description: `${data.discount}% discount applied` });
      } else {
        setPromoError(data.message);
        setPromoDiscount(null);
        setPromoApplied(false);
      }
    } catch (error: any) {
      setPromoError("Failed to validate promo code");
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const removePromoCode = () => {
    setPromoCode("");
    setPromoDiscount(null);
    setPromoApplied(false);
    setPromoError(null);
  };

  // Calculate final price
  const basePrice = paymentConfig?.amount || 10;
  const finalPrice = promoDiscount ? basePrice * (1 - promoDiscount / 100) : basePrice;
  const isFreeActivation = promoDiscount === 100;

  // Activate subscription for 100% discount promo codes
  const activateFreeSubscription = async () => {
    if (!promoApplied || !promoCode) return;
    
    setIsVerifying(true);
    setVerificationStatus("pending");
    
    try {
      const response = await fetch("/api/payment/activate-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoCode }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (data.success) {
        setVerificationStatus("success");
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ 
          title: "Subscription Activated!", 
          description: "Your Pro plan is now active. Enjoy unlimited signals!" 
        });
        setTimeout(() => setLocation("/dashboard"), 2000);
      } else {
        setVerificationStatus("failed");
        toast({ 
          title: "Activation Failed", 
          description: data.message || "Could not activate. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setVerificationStatus("failed");
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyPayment = async () => {
    if (!txHash.trim()) {
      toast({ title: "Error", description: "Please enter your transaction hash", variant: "destructive" });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus("pending");

    try {
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          txHash, 
          network: selectedNetwork,
          promoCode: promoApplied ? promoCode : undefined,
        }),
        credentials: "include",
      });

      const data = await response.json();
      
      if (data.success) {
        setVerificationStatus("success");
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ 
          title: "Payment Verified!", 
          description: "Your Pro plan is now active. Enjoy unlimited signals!" 
        });
        setTimeout(() => setLocation("/dashboard"), 2000);
      } else {
        setVerificationStatus("failed");
        toast({ 
          title: "Verification Failed", 
          description: data.message || "Could not verify payment. Please try again or contact support.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setVerificationStatus("failed");
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const currentAddress = selectedNetwork === "trc20" ? paymentConfig?.trc20Address : paymentConfig?.bep20Address;

  if (configLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!paymentConfig?.enabled) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <Card className="bg-white/[0.03] border-white/[0.06] max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Payment Unavailable</h2>
            <p className="text-gray-400 mb-6">Crypto payment is currently not configured. Please contact support.</p>
            <Button onClick={() => setLocation("/plans")} variant="outline" className="border-white/[0.08]">
              Back to Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <img src={logoImage} alt="TradeX AI" className="h-10 mx-auto mb-4" />
            <div className="flex items-center justify-center gap-2 text-neutral-400 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">Complete Your Upgrade</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Pay with Crypto</h1>
          </div>

          <Card className="bg-white/[0.04] backdrop-blur-xl border-white/[0.06] mb-6">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-gray-500 line-through text-lg">$199</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">95% OFF</Badge>
                  {promoDiscount && (
                    <Badge className="bg-purple-500/20 text-purple-400">
                      +{promoDiscount}% PROMO
                    </Badge>
                  )}
                </div>
                <div className="text-4xl font-bold text-white">
                  {promoDiscount ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="line-through text-2xl text-gray-500">{basePrice} USDT</span>
                      <span>{finalPrice.toFixed(2)} USDT</span>
                    </span>
                  ) : (
                    `${basePrice} USDT`
                  )}
                </div>
                <p className="text-gray-400 text-sm mt-1">One-time payment for Pro plan</p>
              </div>
              
              {/* Promo Code Input */}
              <div className="mb-6">
                <label className="text-gray-300 text-sm mb-2 block flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  Have a promo code?
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoError(null);
                      }}
                      disabled={promoApplied}
                      className={`bg-black border-white/[0.08] text-white font-mono uppercase ${promoApplied ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
                      data-testid="input-promo-code"
                    />
                    {promoApplied && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  {promoApplied ? (
                    <Button
                      variant="outline"
                      onClick={removePromoCode}
                      className="border-red-500/30 text-red-400"
                      data-testid="button-remove-promo"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={validatePromoCode}
                      disabled={isValidatingPromo || !promoCode.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                      data-testid="button-apply-promo"
                    >
                      {isValidatingPromo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  )}
                </div>
                {promoError && (
                  <p className="text-red-400 text-sm mt-1">{promoError}</p>
                )}
                {promoApplied && (
                  <p className="text-emerald-400 text-sm mt-1">
                    Promo code applied! You save {promoDiscount}%
                  </p>
                )}
              </div>

              {/* Show FREE activation button for 100% discount */}
              {isFreeActivation ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-emerald-500/10 rounded-xl">
                    <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-emerald-200">
                      <p className="font-medium mb-1">100% Discount Applied!</p>
                      <p className="text-emerald-300/80">No payment required. Click below to activate your Pro subscription instantly.</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={activateFreeSubscription}
                    disabled={isVerifying || verificationStatus === "success"}
                    className="w-full bg-white text-black hover:bg-neutral-200 font-medium h-12 text-lg"
                    data-testid="button-activate-free"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Activating...
                      </>
                    ) : verificationStatus === "success" ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Subscription Activated!
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Activate Pro for FREE
                      </>
                    )}
                  </Button>
                </div>
              ) : (
              <>
              <div className="flex gap-2 mb-6">
                <Button
                  onClick={() => setSelectedNetwork("trc20")}
                  variant={selectedNetwork === "trc20" ? "default" : "outline"}
                  className={`flex-1 ${selectedNetwork === "trc20" ? "bg-gradient-to-r from-red-500 to-orange-500" : "border-white/[0.08]"}`}
                  data-testid="button-network-trc20"
                >
                  TRC20 (TRON)
                </Button>
                <Button
                  onClick={() => setSelectedNetwork("bep20")}
                  variant={selectedNetwork === "bep20" ? "default" : "outline"}
                  className={`flex-1 ${selectedNetwork === "bep20" ? "bg-gradient-to-r from-yellow-500 to-amber-500" : "border-white/[0.08]"}`}
                  data-testid="button-network-bep20"
                >
                  BEP20 (BSC)
                </Button>
              </div>

              <div className="bg-black rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Send USDT to:</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedNetwork.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-neutral-300 text-sm break-all font-mono bg-white/[0.06] p-3 rounded-lg">
                    {currentAddress || "Not configured"}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyAddress}
                    className="border-white/[0.08] flex-shrink-0"
                    data-testid="button-copy-address"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl mb-6">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200">
                  <p className="font-medium mb-1">Important:</p>
                  <ul className="list-disc list-inside text-amber-300/80 space-y-1">
                    <li>Send exactly <strong>{finalPrice.toFixed(2)} USDT</strong></li>
                    <li>Use only {selectedNetwork.toUpperCase()} network</li>
                    <li>Payment auto-verifies in 1-3 minutes</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Transaction Hash (after sending)</label>
                  <Input
                    placeholder="Enter your transaction hash"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    className="bg-black border-white/[0.08] text-white font-mono"
                    data-testid="input-tx-hash"
                  />
                </div>

                <Button
                  onClick={verifyPayment}
                  disabled={isVerifying || verificationStatus === "success"}
                  className="w-full bg-white text-black hover:bg-neutral-200 font-medium"
                  data-testid="button-verify-payment"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying on Blockchain...
                    </>
                  ) : verificationStatus === "success" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Payment Verified!
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Verify Payment
                    </>
                  )}
                </Button>
              </div>
              </>
              )}
            </CardContent>
          </Card>

          <div className="text-center">
            <div className="inline-flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-neutral-400" />
                Secure Wallet
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                Fast Verification
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/plans")}
              className="text-gray-400"
            >
              Back to Plans
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payment;
