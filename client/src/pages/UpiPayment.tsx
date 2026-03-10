import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  ArrowDownToLine,
  X,
} from "lucide-react";
import QRCode from "react-qr-code";
import logoImage from "@assets/Picsart_26-03-10_23-57-49-090_1773170426667.png";
import upiLogo from "@assets/image_1773144638368.png";
import pciDssLogo from "@assets/pcidss_(1)_1773166833303.png";
import sectigoLogo from "@assets/Picsart_26-03-10_23-48-41-180_1773166854206.png";

const INR_TO_USD = 92;

export default function UpiPaymentPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [amountInr, setAmountInr] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [utr, setUtr] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [upiIndex, setUpiIndex] = useState(0);
  const [step, setStep] = useState<"amount" | "pay" | "status">("amount");
  const [depositOrderId, setDepositOrderId] = useState<string | null>(null);
  const [depositStatus, setDepositStatus] = useState<"pending" | "processing" | "approved" | "rejected">("pending");
  const [pollError, setPollError] = useState(false);

  useEffect(() => {
    fetch("/api/payment-methods", { credentials: "include" })
      .then(r => r.json())
      .then(setPaymentMethods)
      .catch(() => {});
  }, []);

  const allUpiMethods = paymentMethods.filter((m: any) => m.type === "upi" && m.isActive);
  const upiMethod = allUpiMethods.length > 0 ? allUpiMethods[upiIndex % allUpiMethods.length] : null;

  const handleInrChange = (val: string) => {
    setAmountInr(val);
    if (val && parseFloat(val) > 0) {
      setAmountUsd((parseFloat(val) / INR_TO_USD).toFixed(2));
    } else {
      setAmountUsd("");
    }
  };

  const handleNextUpi = () => setUpiIndex(prev => prev + 1);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    if (!amountInr || parseFloat(amountInr) < 2000) {
      toast({ title: "Invalid Amount", description: "Minimum deposit is ₹2,000 INR", variant: "destructive" });
      return;
    }
    if (!upiMethod) {
      toast({ title: "Error", description: "UPI payment not available. Contact support.", variant: "destructive" });
      return;
    }
    setStep("pay");
  };

  const handleSubmit = async () => {
    if (!utr.trim()) {
      toast({ title: "UTR Required", description: "Enter the UTR number from your UPI app", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "upi",
          amountInr: parseFloat(amountInr),
          amountUsdt: parseFloat(amountUsd),
          utr,
          toAddress: upiMethod?.upiId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      const result = await res.json();
      const oid = result?.orderId || null;
      setDepositOrderId(oid);
      setStep("status");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (step !== "status" || !depositOrderId) return;
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      if (attempts > 120) { clearInterval(poll); return; }
      try {
        const res = await fetch("/api/transactions", { credentials: "include" });
        if (!res.ok) { setPollError(true); return; }
        setPollError(false);
        const txs = await res.json();
        if (!Array.isArray(txs)) return;
        const tx = txs.find((t: any) => t.orderId === depositOrderId);
        if (tx) {
          setDepositStatus(tx.status);
          if (tx.status === "approved" || tx.status === "rejected") clearInterval(poll);
        }
      } catch { setPollError(true); }
    }, 3000);
    return () => clearInterval(poll);
  }, [step, depositOrderId]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => {
            if (step === "pay") setStep("amount");
            else setLocation("/wallet");
          }} data-testid="button-upi-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={logoImage} alt="TradeX AI" className="h-8 w-8 rounded-full" />
          <span className="text-white font-semibold text-lg tracking-tight">TradeX AI</span>
          <h1 className="text-xl font-bold">UPI Payment</h1>
        </div>

        {step === "amount" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <img src={upiLogo} alt="UPI" className="h-7" />
              <div>
                <p className="text-white font-medium">UPI Deposit</p>
                <p className="text-gray-500 text-xs">Pay via any UPI app - GPay, PhonePe, Paytm</p>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Amount (INR)</Label>
              <Input
                type="number"
                placeholder="Enter amount in INR"
                value={amountInr}
                onChange={e => handleInrChange(e.target.value)}
                className="bg-black border-white/[0.06] text-white text-lg mt-1"
                data-testid="input-upi-amount"
              />
              <p className="text-[11px] text-amber-400/70 mt-1">Minimum deposit: ₹2,000 INR</p>
            </div>

            {amountUsd && parseFloat(amountUsd) > 0 && (
              <div className="bg-black border border-white/[0.06] rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-white">₹{parseFloat(amountInr).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-400">You will receive</span>
                  <span className="text-green-400 font-bold">{amountUsd} USD</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">Rate: ₹{INR_TO_USD} = 1 USD</p>
              </div>
            )}

            <Button
              onClick={handleContinue}
              className="w-full bg-white text-black hover:bg-gray-200 font-semibold h-12"
              data-testid="button-continue-upi"
            >
              <img src={upiLogo} alt="UPI" className="h-4 mr-2" />
              Continue to Payment
            </Button>
          </div>
        )}

        {step === "pay" && upiMethod && (
          <div className="space-y-5">
            <div className="text-center py-2">
              <p className="text-gray-400 text-sm">Pay</p>
              <p className="text-white text-3xl font-bold mt-1">₹{parseFloat(amountInr).toLocaleString("en-IN")}</p>
              <p className="text-gray-500 text-sm mt-1">≈ {amountUsd} USD</p>
            </div>

            <div className="bg-white rounded-xl p-5 flex justify-center">
              <QRCode
                value={`upi://pay?pa=${upiMethod.upiId}&pn=TradeX&am=${amountInr}&cu=INR&tn=TradeX+Deposit`}
                size={200}
              />
            </div>

            <p className="text-center text-gray-500 text-xs">Scan with any UPI app to pay</p>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <p className="text-gray-500 text-xs mb-2">Or pay manually to this UPI ID</p>
              <div className="flex items-center justify-between bg-black rounded-lg p-3 border border-white/[0.06]">
                <span className="text-white font-mono text-sm">{upiMethod.upiId}</span>
                <button
                  onClick={() => copyText(upiMethod.upiId)}
                  className="text-gray-400 hover:text-white transition p-1"
                  data-testid="button-copy-upi"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {allUpiMethods.length > 1 && (
                <button
                  onClick={handleNextUpi}
                  className="w-full text-center text-xs text-amber-400 hover:underline mt-3 py-1"
                  data-testid="button-try-another-upi"
                >
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  Payment Failed? Try Another UPI ({(upiIndex % allUpiMethods.length) + 1}/{allUpiMethods.length})
                </button>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-gray-300">UTR / Reference Number</Label>
              <Input
                placeholder="Enter 12-digit UTR number"
                value={utr}
                onChange={e => setUtr(e.target.value)}
                className="bg-black border-white/[0.06] text-white font-mono"
                data-testid="input-utr"
              />
              <p className="text-xs text-gray-500">Find this in your UPI app after completing payment</p>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !utr.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 h-12 font-semibold"
                data-testid="button-submit-upi"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
                I've Paid - Submit Deposit
              </Button>
            </div>
          </div>
        )}

        {step === "status" && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center">
              {depositStatus === "pending" && (
                <>
                  <Clock className="w-14 h-14 text-amber-400 animate-pulse mb-4" />
                  <p className="text-white text-lg font-semibold">Verifying Payment</p>
                  <p className="text-gray-500 text-sm mt-1">Please wait while we verify your payment...</p>
                </>
              )}
              {depositStatus === "processing" && (
                <>
                  <Loader2 className="w-14 h-14 text-blue-400 animate-spin mb-4" />
                  <p className="text-white text-lg font-semibold">Processing</p>
                  <p className="text-gray-500 text-sm mt-1">Your payment is being processed...</p>
                </>
              )}
              {depositStatus === "approved" && (
                <>
                  <CheckCircle className="w-14 h-14 text-green-400 mb-4" />
                  <p className="text-green-400 text-lg font-bold">Payment Approved!</p>
                  <p className="text-gray-500 text-sm mt-1">₹{parseFloat(amountInr).toLocaleString("en-IN")} has been added to your wallet</p>
                </>
              )}
              {depositStatus === "rejected" && (
                <>
                  <XCircle className="w-14 h-14 text-red-400 mb-4" />
                  <p className="text-red-400 text-lg font-bold">Payment Rejected</p>
                  <p className="text-gray-500 text-sm mt-1">Please contact support for assistance</p>
                </>
              )}
            </div>

            {pollError && (
              <p className="text-center text-xs text-amber-400/70">Connection issue. Retrying...</p>
            )}

            {depositOrderId && (
              <p className="text-center text-[10px] text-gray-600 font-mono">{depositOrderId}</p>
            )}

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount</span>
                <span className="text-white">₹{parseFloat(amountInr).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">USD Value</span>
                <span className="text-white">{amountUsd} USD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">UTR</span>
                <span className="text-white font-mono text-xs">{utr}</span>
              </div>
            </div>

            {depositStatus === "approved" ? (
              <Button
                onClick={() => setLocation("/dashboard")}
                className="w-full bg-green-500 hover:bg-green-600 h-12 font-semibold"
                data-testid="button-go-dashboard"
              >
                Go to Dashboard
              </Button>
            ) : depositStatus === "rejected" ? (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setLocation("/wallet")} className="flex-1 border-white/[0.06]">
                  Back to Wallet
                </Button>
                <Button variant="outline" onClick={() => setLocation("/support")} className="flex-1 border-white/[0.06]">
                  Contact Support
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setLocation("/wallet")}
                className="w-full border-white/[0.06] text-gray-400"
                data-testid="button-back-wallet"
              >
                Continue in Background
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-6 mt-8 mb-4">
          <img src={pciDssLogo} alt="PCI DSS Compliant" className="h-10 opacity-60" />
          <img src={sectigoLogo} alt="Secured by Sectigo" className="h-8 opacity-80" />
        </div>
      </div>
    </div>
  );
}