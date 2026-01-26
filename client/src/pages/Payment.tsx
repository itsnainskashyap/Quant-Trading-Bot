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
  ExternalLink
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";

export function Payment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [selectedNetwork, setSelectedNetwork] = useState<"trc20" | "bep20">("trc20");

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
        body: JSON.stringify({ txHash, network: selectedNetwork }),
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!paymentConfig?.enabled) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <Card className="bg-[#12121a] border-[#1a1a2e] max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Payment Unavailable</h2>
            <p className="text-gray-400 mb-6">Crypto payment is currently not configured. Please contact support.</p>
            <Button onClick={() => setLocation("/plans")} variant="outline" className="border-[#2a2a3e]">
              Back to Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <img src={logoImage} alt="TradeX AI" className="h-10 mx-auto mb-4" />
            <div className="flex items-center justify-center gap-2 text-cyan-400 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">Complete Your Upgrade</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Pay with Crypto</h1>
          </div>

          <Card className="bg-[#12121a]/80 backdrop-blur-xl border-[#1a1a2e] mb-6">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-gray-500 line-through text-lg">$199</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">95% OFF</Badge>
                </div>
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  10 USDT
                </div>
                <p className="text-gray-400 text-sm mt-1">One-time payment for Pro plan</p>
              </div>

              <div className="flex gap-2 mb-6">
                <Button
                  onClick={() => setSelectedNetwork("trc20")}
                  variant={selectedNetwork === "trc20" ? "default" : "outline"}
                  className={`flex-1 ${selectedNetwork === "trc20" ? "bg-gradient-to-r from-red-500 to-orange-500" : "border-[#2a2a3e]"}`}
                  data-testid="button-network-trc20"
                >
                  TRC20 (TRON)
                </Button>
                <Button
                  onClick={() => setSelectedNetwork("bep20")}
                  variant={selectedNetwork === "bep20" ? "default" : "outline"}
                  className={`flex-1 ${selectedNetwork === "bep20" ? "bg-gradient-to-r from-yellow-500 to-amber-500" : "border-[#2a2a3e]"}`}
                  data-testid="button-network-bep20"
                >
                  BEP20 (BSC)
                </Button>
              </div>

              <div className="bg-[#0a0a0f] rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Send USDT to:</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedNetwork.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-cyan-400 text-sm break-all font-mono bg-[#1a1a2e] p-3 rounded-lg">
                    {currentAddress || "Not configured"}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyAddress}
                    className="border-[#2a2a3e] flex-shrink-0"
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
                    <li>Send exactly 10 USDT</li>
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
                    className="bg-[#0a0a0f] border-[#2a2a3e] text-white font-mono"
                    data-testid="input-tx-hash"
                  />
                </div>

                <Button
                  onClick={verifyPayment}
                  disabled={isVerifying || verificationStatus === "success"}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium"
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
            </CardContent>
          </Card>

          <div className="text-center">
            <div className="inline-flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cyan-500" />
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
