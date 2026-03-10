import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Wallet as WalletIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Loader2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Landmark,
  RefreshCw,
  X,
} from "lucide-react";
import QRCode from "react-qr-code";
import logoImage from "@assets/Picsart_26-03-10_23-57-49-090_1773170426667.png";
import upiLogo from "@assets/image_1773144638368.png";
import impsLogo from "@assets/Picsart_26-03-10_19-32-00-972_1773166568501.png";
import binanceLogo from "@assets/binance_logo.png";
import skrillLogo from "@assets/Picsart_26-03-10_23-54-36-981_1773167153469.png";
import pciDssLogo from "@assets/pcidss_(1)_1773166833303.png";
import sectigoLogo from "@assets/Picsart_26-03-10_23-48-41-180_1773166854206.png";

const INR_TO_USD = 93.5;

function CryptoIcon({ symbol, className = "w-7 h-7" }: { symbol: string; className?: string }) {
  if (symbol === "BTC") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.1 4.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.2.3 4.9.9 4.4 3.1zm.5-5.4c-.5 1.9-3.5.9-4.4.7l.9-3.4c1 .2 4.1.7 3.5 2.7z" fill="white"/></svg>
  );
  if (symbol === "ETH") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#627EEA"/><path d="M16.5 4v8.9l7.5 3.3L16.5 4z" fill="white" fillOpacity=".6"/><path d="M16.5 4L9 16.2l7.5-3.3V4z" fill="white"/><path d="M16.5 21.9v6.1l7.5-10.4-7.5 4.3z" fill="white" fillOpacity=".6"/><path d="M16.5 28v-6.1L9 17.6l7.5 10.4z" fill="white"/><path d="M16.5 20.6l7.5-4.4-7.5-3.3v7.7z" fill="white" fillOpacity=".2"/><path d="M9 16.2l7.5 4.4v-7.7L9 16.2z" fill="white" fillOpacity=".6"/></svg>
  );
  if (symbol === "USDT") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#26A17B"/><path d="M17.9 17.1v0c-.1 0-.7.1-2 .1-1 0-1.7 0-1.9-.1v0c-3.7-.2-6.5-.9-6.5-1.7s2.8-1.6 6.5-1.7v2.7c.3 0 .9.1 2 .1 1.2 0 1.7-.1 1.9-.1v-2.7c3.7.2 6.4.9 6.4 1.7s-2.7 1.6-6.4 1.7zm0-3.7v-2.4h5.5V7.8H8.6V11h5.5v2.4c-4.2.2-7.4 1.1-7.4 2.2s3.2 2 7.4 2.2v7.9h3.8v-7.9c4.2-.2 7.3-1.1 7.3-2.2s-3.1-2-7.3-2.2z" fill="white"/></svg>
  );
  if (symbol === "LTC") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#BFBBBB"/><path d="M10.7 24l1-3.8-2.3.9.5-2 2.3-.9 2-7.4H10l.6-2.3h4.3l1.5-5.7h2.8l-1.5 5.7h3.5l-.6 2.3h-3.5l-1.6 6 2.3-.9-.5 2-2.3.9-.9 3.2H10.7z" fill="white"/></svg>
  );
  if (symbol === "USDC") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#2775CA"/><path d="M20.5 18.2c0-2.1-1.3-2.8-3.8-3.1-1.8-.3-2.1-.7-2.1-1.5s.7-1.3 1.9-1.3c1.1 0 1.7.4 2 1.3.1.1.2.2.3.2h1.1c.2 0 .3-.1.3-.3-.3-1.3-1.2-2.3-2.6-2.5V9.5c0-.2-.1-.3-.3-.3h-1c-.2 0-.3.1-.3.3V11c-1.8.2-2.9 1.4-2.9 2.8 0 2 1.2 2.7 3.7 3 1.6.3 2.2.6 2.2 1.6s-.9 1.5-2.1 1.5c-1.6 0-2.2-.7-2.4-1.5-.1-.2-.2-.2-.3-.2h-1.1c-.2 0-.3.1-.3.3.3 1.5 1.2 2.4 3 2.7v1.6c0 .2.1.3.3.3h1c.2 0 .3-.1.3-.3v-1.6c1.8-.3 3-1.4 3-3z" fill="white"/><path d="M13 24.7c-4.8-1.7-7.3-7-5.6-11.8 1-2.7 3-4.7 5.6-5.6.2-.1.3-.2.3-.4v-1c0-.2-.1-.3-.3-.3h-.1c-5.6 1.8-8.7 7.7-6.9 13.3 1.1 3.4 3.6 5.9 6.9 6.9h.1c.2 0 .3-.1.3-.3v-1c0-.1-.1-.3-.3-.4zm6-.4c5.6-1.8 8.7-7.7 6.9-13.3-1.1-3.4-3.6-5.9-6.9-6.9H19c-.2 0-.3.1-.3.3v1c0 .2.1.3.3.4 4.8 1.7 7.3 7 5.6 11.8-1 2.7-3 4.7-5.6 5.6-.2.1-.3.2-.3.4v1c0 .2.1.3.3.3h.1z" fill="white"/></svg>
  );
  return (
    <div className={`${className} bg-gray-500 rounded-full flex items-center justify-center font-bold text-white text-xs`}>
      {symbol[0]}
    </div>
  );
}

function ChainIcon({ chain, className = "w-5 h-5" }: { chain: string; className?: string }) {
  if (chain === "Bitcoin") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.2 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.3-.1-.7-.2-1-.3l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.1 4.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.2.3 4.9.9 4.4 3.1zm.5-5.4c-.5 1.9-3.5.9-4.4.7l.9-3.4c1 .2 4.1.7 3.5 2.7z" fill="white"/></svg>
  );
  if (chain === "ERC20") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#627EEA"/><path d="M16.5 4v8.9l7.5 3.3L16.5 4z" fill="white" fillOpacity=".6"/><path d="M16.5 4L9 16.2l7.5-3.3V4z" fill="white"/><path d="M16.5 20.6l7.5-4.4-7.5-3.3v7.7z" fill="white" fillOpacity=".2"/><path d="M9 16.2l7.5 4.4v-7.7L9 16.2z" fill="white" fillOpacity=".6"/></svg>
  );
  if (chain === "TRC20") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#EF0027"/><path d="M21.9 10.3L8.3 7l-.3.5 5.4 14.8.3.3 8.9-11.6-.7-.7zm-8.2 2.7l-2.5-1.5 6.7-1.5-4.2 3zm.9.6l5.3-3.8-6.5 8.4 1.2-4.6zm-1.7-.1l-1.3 5-2.5-6.8 3.8 1.8z" fill="white"/></svg>
  );
  if (chain === "BEP20") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#F3BA2F"/><path d="M12.1 14.1L16 10.2l3.9 3.9 2.3-2.3L16 5.6l-6.2 6.2 2.3 2.3zm-6.5 1.9l2.3-2.3 2.3 2.3-2.3 2.3-2.3-2.3zm6.5 1.9L16 21.8l3.9-3.9 2.3 2.3L16 26.4l-6.2-6.2 2.3-2.3zm10.3-1.9l2.3-2.3 2.3 2.3-2.3 2.3-2.3-2.3zM18.6 16L16 13.4 14 15.4l-.2.2-.4.4L16 18.6l2.6-2.6z" fill="white"/></svg>
  );
  if (chain === "Litecoin") return (
    <svg viewBox="0 0 32 32" className={className}><circle cx="16" cy="16" r="16" fill="#BFBBBB"/><path d="M10.7 24l1-3.8-2.3.9.5-2 2.3-.9 2-7.4H10l.6-2.3h4.3l1.5-5.7h2.8l-1.5 5.7h3.5l-.6 2.3h-3.5l-1.6 6 2.3-.9-.5 2-2.3.9-.9 3.2H10.7z" fill="white"/></svg>
  );
  return (
    <div className={`${className} bg-gray-500 rounded-full flex items-center justify-center font-bold text-white text-[9px]`}>
      {chain[0]}
    </div>
  );
}

function DepositStatusOverlay({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [status, setStatus] = useState<"pending" | "processing" | "approved" | "rejected">("pending");
  const [pollError, setPollError] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 120;
    const poll = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(poll);
        return;
      }
      try {
        const res = await fetch("/api/transactions", { credentials: "include" });
        if (!res.ok) { setPollError(true); return; }
        setPollError(false);
        const txs = await res.json();
        if (!Array.isArray(txs)) return;
        const tx = txs.find((t: any) => t.orderId === orderId);
        if (tx) {
          setStatus(tx.status);
          if (tx.status === "approved" || tx.status === "rejected") clearInterval(poll);
        }
      } catch { setPollError(true); }
    }, 3000);
    return () => clearInterval(poll);
  }, [orderId]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-white/[0.08] rounded-xl max-w-sm w-full p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Payment Status</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center py-6">
          {status === "pending" && (
            <>
              <Clock className="w-10 h-10 text-amber-400 animate-pulse mb-3" />
              <p className="text-white font-medium">Verifying Payment</p>
              <p className="text-gray-500 text-sm mt-1">Please wait while we verify your payment...</p>
            </>
          )}
          {status === "processing" && (
            <>
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
              <p className="text-white font-medium">Processing</p>
              <p className="text-gray-500 text-sm mt-1">Your payment is being processed...</p>
            </>
          )}
          {status === "approved" && (
            <>
              <CheckCircle className="w-10 h-10 text-green-400 mb-3" />
              <p className="text-green-400 font-semibold">Payment Approved!</p>
              <p className="text-gray-500 text-sm mt-1">Your balance has been updated</p>
            </>
          )}
          {status === "rejected" && (
            <>
              <XCircle className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-red-400 font-semibold">Payment Rejected</p>
              <p className="text-gray-500 text-sm mt-1">Contact support for assistance</p>
            </>
          )}
        </div>

        {pollError && (
          <p className="text-center text-xs text-amber-400/70 mb-2">Connection issue. Retrying...</p>
        )}

        {orderId && (
          <p className="text-center text-[10px] text-gray-600 font-mono mb-4">{orderId}</p>
        )}

        {status === "approved" ? (
          <Button onClick={() => setLocation("/dashboard")} className="w-full bg-green-500 hover:bg-green-600 text-white" data-testid="button-status-done">
            Go to Dashboard
          </Button>
        ) : status === "rejected" ? (
          <Button onClick={onClose} variant="outline" className="w-full" data-testid="button-status-done">
            Close
          </Button>
        ) : (
          <Button onClick={onClose} variant="outline" className="w-full border-white/[0.06] text-gray-400" data-testid="button-status-done">
            Continue in Background
          </Button>
        )}
      </div>
    </div>
  );
}

const CRYPTO_OPTIONS = [
  { value: "BTC", label: "Bitcoin (BTC)", chains: [{ value: "Bitcoin", label: "Bitcoin Network" }] },
  { value: "ETH", label: "Ethereum (ETH)", chains: [{ value: "ERC20", label: "ERC20" }] },
  { value: "USDT", label: "Tether (USDT)", chains: [{ value: "ERC20", label: "ERC20" }, { value: "TRC20", label: "TRC20 (TRON)" }, { value: "BEP20", label: "BEP20 (BSC)" }] },
  { value: "LTC", label: "Litecoin (LTC)", chains: [{ value: "Litecoin", label: "Litecoin Network" }] },
  { value: "USDC", label: "USD Coin (USDC)", chains: [{ value: "ERC20", label: "ERC20" }, { value: "TRC20", label: "TRC20 (TRON)" }, { value: "BEP20", label: "BEP20 (BSC)" }] },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
    pending: { variant: "outline", icon: Clock, label: "Pending" },
    processing: { variant: "secondary", icon: Loader2, label: "Processing" },
    approved: { variant: "default", icon: CheckCircle, label: "Approved" },
    rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="gap-1" data-testid={`badge-status-${status}`}>
      <Icon className={`w-3 h-3 ${status === "processing" ? "animate-spin" : ""}`} />
      {c.label}
    </Badge>
  );
}

function SkrillLogo({ className = "w-5 h-5" }: { className?: string }) {
  return <img src={skrillLogo} alt="Skrill" className={`${className} rounded`} />;
}

function VoletLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className}>
      <rect width="256" height="256" rx="40" fill="#1B998B" />
      <path d="M68 72h28l32 84 32-84h28L144 192h-32L68 72z" fill="white" />
    </svg>
  );
}

function BinanceLogo({ className = "w-5 h-5" }: { className?: string }) {
  return <img src={binanceLogo} alt="Binance" className={className} />;
}

function WireTransferLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="6" fill="#1A56DB" />
      <path d="M4 8h16M4 8l8-3 8 3M6 8v8M10 8v8M14 8v8M18 8v8M4 16h16M5 18h14" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function DepositTab() {
  const { toast } = useToast();
  const [depositType, setDepositType] = useState<"crypto" | "upi" | "imps" | "skrill" | "volet">("crypto");
  const [selectedCrypto, setSelectedCrypto] = useState("USDT");
  const [selectedChain, setSelectedChain] = useState("TRC20");
  const [amount, setAmount] = useState("");
  const [amountInr, setAmountInr] = useState("");
  const [txHash, setTxHash] = useState("");
  const [utr, setUtr] = useState("");
  const [skrillEmail, setSkrillEmail] = useState("");
  const [voletEmail, setVoletEmail] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [upiIndex, setUpiIndex] = useState(0);
  const [impsIndex, setImpsIndex] = useState(0);
  const [depositOrderId, setDepositOrderId] = useState<string | null>(null);


  useEffect(() => {
    fetch("/api/payment-methods", { credentials: "include" })
      .then(r => r.json())
      .then(setPaymentMethods)
      .catch(() => {});
  }, []);

  const cryptoOption = CRYPTO_OPTIONS.find(c => c.value === selectedCrypto);
  const availableChains = cryptoOption?.chains || [];

  useEffect(() => {
    if (availableChains.length > 0 && !availableChains.find(c => c.value === selectedChain)) {
      setSelectedChain(availableChains[0].value);
    }
  }, [selectedCrypto]);

  const depositAddress = paymentMethods.find(
    m => m.type === "crypto" && m.crypto === selectedCrypto && m.chain === selectedChain
  )?.address;

  const allUpiMethods = paymentMethods.filter(m => m.type === "upi");
  const allImpsMethods = paymentMethods.filter(m => m.type === "imps");
  const upiMethod = allUpiMethods.length > 0 ? allUpiMethods[upiIndex % allUpiMethods.length] : null;
  const impsMethod = allImpsMethods.length > 0 ? allImpsMethods[impsIndex % allImpsMethods.length] : null;

  const handleNewUpi = () => {
    if (allUpiMethods.length > 1) {
      setUpiIndex(prev => (prev + 1) % allUpiMethods.length);
      toast({ title: "New UPI Generated", description: "A different UPI ID has been assigned for your payment." });
    }
  };

  const handleNewImps = () => {
    if (allImpsMethods.length > 1) {
      setImpsIndex(prev => (prev + 1) % allImpsMethods.length);
      toast({ title: "New Bank Details", description: "Different bank account details have been assigned." });
    }
  };

  const handleInrChange = (val: string) => {
    setAmountInr(val);
    const inr = parseFloat(val);
    if (!isNaN(inr) && inr > 0) {
      setAmount((inr / INR_TO_USD).toFixed(2));
    } else {
      setAmount("");
    }
  };

  const handleUsdtChange = (val: string) => {
    setAmount(val);
    const usdt = parseFloat(val);
    if (!isNaN(usdt) && usdt > 0) {
      setAmountInr((usdt * INR_TO_USD).toFixed(2));
    } else {
      setAmountInr("");
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Copied to clipboard" });
  };

  const handleSubmit = async () => {
    const amountUsdt = parseFloat(amount);
    if (!amountUsdt || amountUsdt <= 0) {
      toast({ title: "Error", description: "Enter a valid amount", variant: "destructive" });
      return;
    }

    if (depositType === "crypto" && amountUsdt < 20) {
      toast({ title: "Error", description: "Minimum crypto deposit is $20 USD", variant: "destructive" });
      return;
    }
    if ((depositType === "upi" || depositType === "imps") && parseFloat(amountInr) < 2000) {
      toast({ title: "Error", description: "Minimum UPI/IMPS deposit is ₹2,000 INR", variant: "destructive" });
      return;
    }

    if (depositType === "crypto" && !txHash.trim()) {
      toast({ title: "Error", description: "Enter transaction hash", variant: "destructive" });
      return;
    }
    if ((depositType === "upi" || depositType === "imps") && !utr.trim()) {
      toast({ title: "Error", description: "Enter UTR/Reference number", variant: "destructive" });
      return;
    }
    if ((depositType === "skrill" || depositType === "volet") && amountUsdt < 20) {
      toast({ title: "Error", description: "Minimum deposit is $20 USD", variant: "destructive" });
      return;
    }
    if (depositType === "skrill" && !skrillEmail.trim()) {
      toast({ title: "Error", description: "Enter your Skrill email", variant: "destructive" });
      return;
    }
    if (depositType === "volet" && !voletEmail.trim()) {
      toast({ title: "Error", description: "Enter your Volet email", variant: "destructive" });
      return;
    }
    if ((depositType === "skrill" || depositType === "volet") && !transactionId.trim()) {
      toast({ title: "Error", description: "Enter the transaction ID", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: depositType,
          crypto: depositType === "crypto" ? selectedCrypto : null,
          chain: depositType === "crypto" ? selectedChain : null,
          amountInr: (depositType === "upi" || depositType === "imps") ? parseFloat(amountInr) : null,
          amountUsdt,
          txHash: depositType === "crypto" ? txHash : null,
          utr: (depositType === "upi" || depositType === "imps") ? utr : null,
          toAddress: depositType === "crypto" ? depositAddress : depositType === "upi" ? upiMethod?.upiId : depositType === "imps" ? impsMethod?.accountNumber : null,
          skrillEmail: depositType === "skrill" ? skrillEmail : null,
          voletEmail: depositType === "volet" ? voletEmail : null,
          transactionId: (depositType === "skrill" || depositType === "volet") ? transactionId : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      const result = await res.json();
      const oid = result?.orderId || result?.deposit?.orderId || null;
      if (oid) {
        setDepositOrderId(oid);
      }
      toast({ title: "Deposit Submitted", description: "Your deposit request has been submitted for verification." });
      setAmount("");
      setAmountInr("");
      setTxHash("");
      setUtr("");
      setSkrillEmail("");
      setVoletEmail("");
      setTransactionId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {depositOrderId && (
        <DepositStatusOverlay orderId={depositOrderId} onClose={() => setDepositOrderId(null)} />
      )}

      <div className="grid grid-cols-5 gap-2">
          <Button
            variant={depositType === "crypto" ? "default" : "outline"}
            onClick={() => setDepositType("crypto")}
            className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
            data-testid="button-deposit-crypto"
          >
            <CryptoIcon symbol="BTC" className="w-4 h-4" /> Crypto
          </Button>
          <Button
            variant={depositType === "upi" ? "default" : "outline"}
            onClick={() => setDepositType("upi")}
            className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
            data-testid="button-deposit-upi"
          >
            <img src={upiLogo} alt="UPI" className="h-4" /> UPI
          </Button>
          <Button
            variant={depositType === "imps" ? "default" : "outline"}
            onClick={() => setDepositType("imps")}
            className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
            data-testid="button-deposit-imps"
          >
            <Landmark className="w-4 h-4" /> IMPS
          </Button>
          <Button
            variant={depositType === "skrill" ? "default" : "outline"}
            onClick={() => setDepositType("skrill")}
            className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
            data-testid="button-deposit-skrill"
          >
            <SkrillLogo className="w-4 h-4" /> Skrill
          </Button>
          <Button
            variant={depositType === "volet" ? "default" : "outline"}
            onClick={() => setDepositType("volet")}
            className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
            data-testid="button-deposit-volet"
          >
            <VoletLogo className="w-4 h-4" /> Volet
          </Button>
        </div>

      {depositType === "crypto" && (
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Select Cryptocurrency</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {CRYPTO_OPTIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCrypto(c.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                    selectedCrypto === c.value
                      ? "border-white/20 bg-white/[0.06]"
                      : "border-white/[0.06] bg-black hover:border-white/20"
                  }`}
                  data-testid={`button-crypto-${c.value}`}
                >
                  <CryptoIcon symbol={c.value} className="w-7 h-7" />
                  <span className="text-[10px] font-semibold text-white">{c.value}</span>
                </button>
              ))}
            </div>
          </div>

          {availableChains.length > 1 && (
            <div>
              <Label className="text-gray-300">Select Chain</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {availableChains.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedChain(c.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                      selectedChain === c.value
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/[0.06] bg-black hover:border-white/20"
                    }`}
                    data-testid={`button-chain-${c.value}`}
                  >
                    <ChainIcon chain={c.value} className="w-5 h-5" />
                    <span className="text-xs text-white">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {depositAddress ? (
            <div className="bg-black border border-white/[0.06] rounded-lg p-4 space-y-3">
              <Label className="text-gray-300">Deposit Address</Label>
              <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                <QRCode value={depositAddress} size={180} />
              </div>
              <div className="flex items-center gap-2">
                <Input value={depositAddress} readOnly className="bg-white/[0.03] text-xs text-gray-300 font-mono" />
                <Button size="sm" variant="outline" onClick={() => copyText(depositAddress)} data-testid="button-copy-address">
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-amber-400">Only send {selectedCrypto} on {selectedChain} network to this address</p>
            </div>
          ) : (
            <div className="bg-black border border-amber-500/30 rounded-lg p-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-amber-400 text-sm">No deposit address configured for {selectedCrypto} ({selectedChain})</p>
              <p className="text-gray-500 text-xs mt-1">Contact admin to set up this payment method</p>
            </div>
          )}

          <div>
            <Label className="text-gray-300">Amount (USD)</Label>
            <Input
              type="number"
              placeholder="Min $20 USD"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-deposit-amount"
            />
            <p className="text-[11px] text-amber-400/70 mt-1">Minimum deposit: $20 USD</p>
          </div>

          <div>
            <Label className="text-gray-300">Transaction Hash</Label>
            <Input
              placeholder="Enter tx hash after sending"
              value={txHash}
              onChange={e => setTxHash(e.target.value)}
              className="bg-black border-white/[0.06] text-white font-mono text-sm"
              data-testid="input-tx-hash"
            />
          </div>
        </div>
      )}

      {depositType === "upi" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <img src={upiLogo} alt="UPI" className="h-6" />
            <div>
              <p className="text-white text-sm font-medium">UPI Deposit</p>
              <p className="text-gray-500 text-xs">Pay via GPay, PhonePe, Paytm or any UPI app</p>
            </div>
          </div>
          <Link href="/upi-payment">
            <Button className="w-full bg-white text-black hover:bg-gray-200 font-semibold h-11" data-testid="button-open-upi-payment">
              <img src={upiLogo} alt="UPI" className="h-4 mr-2" />
              Pay with UPI
            </Button>
          </Link>
        </div>
      )}

      {depositType === "imps" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <img src={impsLogo} alt="IMPS" className="h-6" />
            <div>
              <p className="text-white text-sm font-medium">IMPS Bank Transfer</p>
              <p className="text-gray-500 text-xs">Immediate Payment Service - Instant bank transfer</p>
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Amount (INR)</Label>
            <Input
              type="number"
              placeholder="Min ₹2,000"
              value={amountInr}
              onChange={e => handleInrChange(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-imps-inr-amount"
            />
            <p className="text-[11px] text-amber-400/70 mt-1">Minimum deposit: ₹2,000 INR</p>
          </div>
          <div className="bg-black border border-white/[0.06] rounded-lg p-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm">You will receive</span>
            <span className="text-white font-bold">{amount ? `${amount} USD` : "0 USD"}</span>
          </div>
          <p className="text-xs text-gray-500">Conversion Rate: ₹{INR_TO_USD} = 1 USD</p>

          {impsMethod ? (
            <div className="bg-black border border-white/[0.06] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Transfer to Bank Account</Label>
                {allImpsMethods.length > 1 && (
                  <span className="text-[10px] text-gray-500">{(impsIndex % allImpsMethods.length) + 1}/{allImpsMethods.length}</span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-lg">
                  <span className="text-gray-400 text-xs">Account Holder</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{impsMethod.accountHolderName}</span>
                    <button onClick={() => copyText(impsMethod.accountHolderName)} className="text-gray-400 hover:text-white">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-lg">
                  <span className="text-gray-400 text-xs">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-mono">{impsMethod.accountNumber}</span>
                    <button onClick={() => copyText(impsMethod.accountNumber)} className="text-gray-400 hover:text-white">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-lg">
                  <span className="text-gray-400 text-xs">IFSC Code</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-mono">{impsMethod.ifscCode}</span>
                    <button onClick={() => copyText(impsMethod.ifscCode)} className="text-gray-400 hover:text-white">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {impsMethod.bankName && (
                  <div className="flex items-center justify-between p-2.5 bg-white/[0.03] rounded-lg">
                    <span className="text-gray-400 text-xs">Bank Name</span>
                    <span className="text-white text-sm">{impsMethod.bankName}</span>
                  </div>
                )}
              </div>
              {amountInr && parseFloat(amountInr) > 0 && (
                <p className="text-center text-green-400 font-semibold">Transfer ₹{amountInr} via IMPS</p>
              )}
              {allImpsMethods.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewImps}
                  className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 mt-2"
                  data-testid="button-try-another-imps"
                >
                  <RefreshCw className="w-3 h-3 mr-2" />
                  Payment Failed? Try Another Bank
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-black border border-amber-500/30 rounded-lg p-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-amber-400 text-sm">IMPS payment method not configured</p>
              <p className="text-gray-500 text-xs mt-1">Contact admin to set up bank details</p>
            </div>
          )}

          <div>
            <Label className="text-gray-300">IMPS Reference Number</Label>
            <Input
              placeholder="Enter IMPS reference number after transfer"
              value={utr}
              onChange={e => setUtr(e.target.value)}
              className="bg-black border-white/[0.06] text-white font-mono text-sm"
              data-testid="input-imps-ref"
            />
            <p className="text-xs text-gray-500 mt-1">Enter the IMPS transaction reference from your bank</p>
          </div>
        </div>
      )}

      {depositType === "skrill" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <SkrillLogo className="w-7 h-7" />
            <div>
              <p className="text-white text-sm font-medium">Skrill</p>
              <p className="text-gray-500 text-xs">Deposit via Skrill e-wallet</p>
            </div>
          </div>
          <div>
            <Label className="text-gray-300">Amount (USD)</Label>
            <Input
              type="number"
              placeholder="Enter USD amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-skrill-amount"
            />
          </div>
          <div>
            <Label className="text-gray-300">Your Skrill Email</Label>
            <Input
              type="email"
              placeholder="your@skrill-email.com"
              value={skrillEmail}
              onChange={e => setSkrillEmail(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-skrill-email"
            />
          </div>
          <div>
            <Label className="text-gray-300">Transaction ID</Label>
            <Input
              placeholder="Enter Skrill transaction ID"
              value={transactionId}
              onChange={e => setTransactionId(e.target.value)}
              className="bg-black border-white/[0.06] text-white font-mono text-sm"
              data-testid="input-skrill-txid"
            />
          </div>
        </div>
      )}

      {depositType === "volet" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <VoletLogo className="w-7 h-7" />
            <div>
              <p className="text-white text-sm font-medium">Volet</p>
              <p className="text-gray-500 text-xs">Deposit via Volet e-wallet</p>
            </div>
          </div>
          <div>
            <Label className="text-gray-300">Amount (USD)</Label>
            <Input
              type="number"
              placeholder="Enter USD amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-volet-amount"
            />
          </div>
          <div>
            <Label className="text-gray-300">Your Volet Email</Label>
            <Input
              type="email"
              placeholder="your@volet-email.com"
              value={voletEmail}
              onChange={e => setVoletEmail(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-volet-email"
            />
          </div>
          <div>
            <Label className="text-gray-300">Transaction ID</Label>
            <Input
              placeholder="Enter Volet transaction ID"
              value={transactionId}
              onChange={e => setTransactionId(e.target.value)}
              className="bg-black border-white/[0.06] text-white font-mono text-sm"
              data-testid="input-volet-txid"
            />
          </div>
        </div>
      )}

      {depositType !== "upi" && (
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
          data-testid="button-submit-deposit"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
          Submit Deposit
        </Button>
      )}
    </div>
  );
}

function WithdrawTab() {
  const { toast } = useToast();
  const [withdrawType, setWithdrawType] = useState<"crypto" | "upi" | "imps" | "binance_pay" | "wire_transfer">("crypto");
  const [selectedCrypto, setSelectedCrypto] = useState("USDT");
  const [selectedChain, setSelectedChain] = useState("TRC20");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [otpStep, setOtpStep] = useState<"form" | "otp">("form");
  const [withdrawOtp, setWithdrawOtp] = useState("");
  const [withdrawalToken, setWithdrawalToken] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [binancePayId, setBinancePayId] = useState("");
  const [binancePayIdLocked, setBinancePayIdLocked] = useState(false);
  const [wireSwiftCode, setWireSwiftCode] = useState("");
  const [wireIban, setWireIban] = useState("");
  const [wireBankNameVal, setWireBankNameVal] = useState("");
  const [wireAccountNumberVal, setWireAccountNumberVal] = useState("");
  const [wireAccountHolderNameVal, setWireAccountHolderNameVal] = useState("");

  useEffect(() => {
    fetch("/api/user/balance", { credentials: "include" })
      .then(r => r.json())
      .then(d => setBalance(d.balance || 0))
      .catch(() => {});
    fetch("/api/user/binance-pay-id", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.binancePayId) {
          setBinancePayId(d.binancePayId);
          setBinancePayIdLocked(true);
        }
      })
      .catch(() => {});
  }, []);

  const cryptoOption = CRYPTO_OPTIONS.find(c => c.value === selectedCrypto);
  const availableChains = cryptoOption?.chains || [];

  useEffect(() => {
    if (availableChains.length > 0 && !availableChains.find(c => c.value === selectedChain)) {
      setSelectedChain(availableChains[0].value);
    }
  }, [selectedCrypto]);

  const amountUsdt = parseFloat(amount) || 0;
  const withdrawFeePercent = (withdrawType === "imps" || withdrawType === "upi") ? 4 : (withdrawType === "binance_pay" || withdrawType === "crypto") ? 1 : 2;
  const withdrawFee = amountUsdt * (withdrawFeePercent / 100);
  const amountAfterFee = amountUsdt - withdrawFee;
  const amountInr = (withdrawType === "upi" || withdrawType === "imps") ? (amountAfterFee * INR_TO_USD).toFixed(2) : null;

  const validateForm = (): boolean => {
    if (!amountUsdt || amountUsdt <= 0) {
      toast({ title: "Error", description: "Enter a valid amount", variant: "destructive" });
      return false;
    }
    if (amountUsdt > balance) {
      toast({ title: "Error", description: "Insufficient balance", variant: "destructive" });
      return false;
    }
    if (withdrawType === "crypto" && !address.trim()) {
      toast({ title: "Error", description: "Enter wallet address", variant: "destructive" });
      return false;
    }
    if (withdrawType === "upi" && !address.trim()) {
      toast({ title: "Error", description: "Enter UPI ID", variant: "destructive" });
      return false;
    }
    if (withdrawType === "imps") {
      if (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim()) {
        toast({ title: "Error", description: "Fill all bank details", variant: "destructive" });
        return false;
      }
      if (accountNumber !== confirmAccountNumber) {
        toast({ title: "Error", description: "Account numbers do not match", variant: "destructive" });
        return false;
      }
    }
    if (withdrawType === "binance_pay" && !binancePayId.trim()) {
      toast({ title: "Error", description: "Enter Binance Pay ID", variant: "destructive" });
      return false;
    }
    if (withdrawType === "wire_transfer") {
      if (!wireBankNameVal.trim() || !wireAccountNumberVal.trim() || !wireAccountHolderNameVal.trim() || !wireSwiftCode.trim()) {
        toast({ title: "Error", description: "Fill all wire transfer details", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateForm()) return;
    setIsSendingOtp(true);
    try {
      const res = await fetch("/api/withdrawal/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amountUsdt, type: withdrawType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "OTP Sent", description: "Check your email for the verification code" });
      setOtpStep("otp");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyAndSubmit = async () => {
    if (withdrawOtp.length !== 6) {
      toast({ title: "Error", description: "Enter the 6-digit code", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const verifyRes = await fetch("/api/withdrawal/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: withdrawOtp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.message);

      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: withdrawType,
          crypto: withdrawType === "crypto" ? selectedCrypto : null,
          chain: withdrawType === "crypto" ? selectedChain : null,
          toAddress: (withdrawType === "crypto" || withdrawType === "upi") ? address : null,
          amountUsdt,
          bankName: withdrawType === "imps" ? bankName : null,
          accountNumber: withdrawType === "imps" ? accountNumber : null,
          ifscCode: withdrawType === "imps" ? ifscCode : null,
          accountHolderName: withdrawType === "imps" ? accountHolderName : null,
          binancePayId: withdrawType === "binance_pay" ? binancePayId : null,
          wireSwiftCode: withdrawType === "wire_transfer" ? wireSwiftCode : null,
          wireIban: withdrawType === "wire_transfer" ? wireIban : null,
          wireBankName: withdrawType === "wire_transfer" ? wireBankNameVal : null,
          wireAccountNumber: withdrawType === "wire_transfer" ? wireAccountNumberVal : null,
          wireAccountHolderName: withdrawType === "wire_transfer" ? wireAccountHolderNameVal : null,
          withdrawalToken: verifyData.withdrawalToken,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      toast({ title: "Withdrawal Submitted", description: "Your withdrawal request has been submitted." });
      setAmount("");
      setAddress("");
      setBankName("");
      setAccountNumber("");
      setConfirmAccountNumber("");
      setIfscCode("");
      setAccountHolderName("");
      setBalance(prev => prev - amountUsdt);
      setOtpStep("form");
      setWithdrawOtp("");
      setWithdrawalToken("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-black border border-white/[0.06] rounded-lg p-3 flex items-center justify-between">
        <span className="text-gray-400">Available Balance</span>
        <span className="text-white font-bold text-lg">{balance.toFixed(2)} USD</span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <Button
          variant={withdrawType === "crypto" ? "default" : "outline"}
          onClick={() => setWithdrawType("crypto")}
          className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
          data-testid="button-withdraw-crypto"
        >
          <CryptoIcon symbol="BTC" className="w-4 h-4" /> Crypto
        </Button>
        <Button
          variant={withdrawType === "upi" ? "default" : "outline"}
          onClick={() => setWithdrawType("upi")}
          className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
          data-testid="button-withdraw-upi"
        >
          <img src={upiLogo} alt="UPI" className="h-4" /> UPI
        </Button>
        <Button
          variant={withdrawType === "imps" ? "default" : "outline"}
          onClick={() => setWithdrawType("imps")}
          className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
          data-testid="button-withdraw-imps"
        >
          <Landmark className="w-4 h-4" /> IMPS
        </Button>
        <Button
          variant={withdrawType === "binance_pay" ? "default" : "outline"}
          onClick={() => setWithdrawType("binance_pay")}
          className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
          data-testid="button-withdraw-binance"
        >
          <BinanceLogo className="w-4 h-4" /> Binance
        </Button>
        <Button
          variant={withdrawType === "wire_transfer" ? "default" : "outline"}
          onClick={() => setWithdrawType("wire_transfer")}
          className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
          data-testid="button-withdraw-wire"
        >
          <WireTransferLogo className="w-4 h-4" /> Wire
        </Button>
      </div>

      {withdrawType === "crypto" && (
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Cryptocurrency</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {CRYPTO_OPTIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCrypto(c.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                    selectedCrypto === c.value
                      ? "border-white/20 bg-white/[0.06]"
                      : "border-white/[0.06] bg-black hover:border-white/20"
                  }`}
                  data-testid={`button-wcrypto-${c.value}`}
                >
                  <CryptoIcon symbol={c.value} className="w-7 h-7" />
                  <span className="text-[10px] font-semibold text-white">{c.value}</span>
                </button>
              ))}
            </div>
          </div>

          {availableChains.length > 1 && (
            <div>
              <Label className="text-gray-300">Chain</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {availableChains.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedChain(c.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                      selectedChain === c.value
                        ? "border-white/20 bg-white/[0.06]"
                        : "border-white/[0.06] bg-black hover:border-white/20"
                    }`}
                    data-testid={`button-wchain-${c.value}`}
                  >
                    <ChainIcon chain={c.value} className="w-5 h-5" />
                    <span className="text-xs text-white">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-gray-300">Wallet Address</Label>
            <Input
              placeholder={`Enter ${selectedCrypto} ${selectedChain} address`}
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="bg-black border-white/[0.06] text-white font-mono text-sm"
              data-testid="input-withdraw-address"
            />
          </div>
        </div>
      )}

      {withdrawType === "upi" && (
        <div>
          <Label className="text-gray-300">UPI ID</Label>
          <Input
            placeholder="Enter your UPI ID (e.g., name@upi)"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="bg-black border-white/[0.06] text-white"
            data-testid="input-withdraw-upi"
          />
        </div>
      )}

      {withdrawType === "imps" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <img src={impsLogo} alt="IMPS" className="h-6" />
            <div>
              <p className="text-white text-sm font-medium">IMPS Bank Transfer</p>
              <p className="text-gray-500 text-xs">Enter your bank details to receive funds</p>
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Account Holder Name</Label>
            <Input
              placeholder="Full name as per bank account"
              value={accountHolderName}
              onChange={e => setAccountHolderName(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-imps-holder"
            />
          </div>

          <div>
            <Label className="text-gray-300">Account Number</Label>
            <Input
              placeholder="Enter bank account number"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              className="bg-black border-white/[0.06] text-white font-mono"
              data-testid="input-imps-account"
            />
          </div>

          <div>
            <Label className="text-gray-300">Confirm Account Number</Label>
            <Input
              placeholder="Re-enter account number"
              value={confirmAccountNumber}
              onChange={e => setConfirmAccountNumber(e.target.value)}
              className={`bg-black border-white/[0.06] text-white font-mono ${confirmAccountNumber && confirmAccountNumber !== accountNumber ? "border-red-500/50" : ""}`}
              data-testid="input-imps-confirm-account"
            />
            {confirmAccountNumber && confirmAccountNumber !== accountNumber && (
              <p className="text-xs text-red-400 mt-1">Account numbers do not match</p>
            )}
          </div>

          <div>
            <Label className="text-gray-300">IFSC Code</Label>
            <Input
              placeholder="e.g., SBIN0001234"
              value={ifscCode}
              onChange={e => setIfscCode(e.target.value.toUpperCase())}
              className="bg-black border-white/[0.06] text-white font-mono uppercase"
              data-testid="input-imps-ifsc"
            />
          </div>

          <div>
            <Label className="text-gray-300">Bank Name (optional)</Label>
            <Input
              placeholder="e.g., State Bank of India"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-imps-bank"
            />
          </div>
        </div>
      )}

      {withdrawType === "binance_pay" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <BinanceLogo className="w-7 h-7" />
            <div>
              <p className="text-white text-sm font-medium">Binance Pay</p>
              <p className="text-gray-500 text-xs">Withdraw via Binance Pay ID</p>
            </div>
          </div>
          <div>
            <Label className="text-gray-300">Binance Pay ID</Label>
            <Input
              placeholder="Enter your Binance Pay ID"
              value={binancePayId}
              onChange={e => !binancePayIdLocked && setBinancePayId(e.target.value)}
              readOnly={binancePayIdLocked}
              className={`bg-black border-white/[0.06] text-white font-mono ${binancePayIdLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              data-testid="input-binance-pay-id"
            />
            {binancePayIdLocked && (
              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Binance Pay ID is locked and cannot be changed
              </p>
            )}
          </div>
        </div>
      )}

      {withdrawType === "wire_transfer" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
            <WireTransferLogo className="w-7 h-7" />
            <div>
              <p className="text-white text-sm font-medium">Wire Transfer</p>
              <p className="text-gray-500 text-xs">International bank wire (SWIFT)</p>
            </div>
          </div>
          <div>
            <Label className="text-gray-300">Account Holder Name</Label>
            <Input
              placeholder="Full name on bank account"
              value={wireAccountHolderNameVal}
              onChange={e => setWireAccountHolderNameVal(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-wire-holder"
            />
          </div>
          <div>
            <Label className="text-gray-300">Bank Name</Label>
            <Input
              placeholder="Your bank name"
              value={wireBankNameVal}
              onChange={e => setWireBankNameVal(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-wire-bank"
            />
          </div>
          <div>
            <Label className="text-gray-300">Account Number</Label>
            <Input
              placeholder="Bank account number"
              value={wireAccountNumberVal}
              onChange={e => setWireAccountNumberVal(e.target.value)}
              className="bg-black border-white/[0.06] text-white font-mono"
              data-testid="input-wire-account"
            />
          </div>
          <div>
            <Label className="text-gray-300">SWIFT/BIC Code</Label>
            <Input
              placeholder="e.g. ABCDINBB"
              value={wireSwiftCode}
              onChange={e => setWireSwiftCode(e.target.value.toUpperCase())}
              className="bg-black border-white/[0.06] text-white font-mono"
              data-testid="input-wire-swift"
            />
          </div>
          <div>
            <Label className="text-gray-300">IBAN (Optional)</Label>
            <Input
              placeholder="International Bank Account Number"
              value={wireIban}
              onChange={e => setWireIban(e.target.value.toUpperCase())}
              className="bg-black border-white/[0.06] text-white font-mono"
              data-testid="input-wire-iban"
            />
          </div>
        </div>
      )}

      <div>
        <Label className="text-gray-300">Amount (USD)</Label>
        <Input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="bg-black border-white/[0.06] text-white"
          data-testid="input-withdraw-amount"
        />
        <div className="flex justify-between mt-1">
          <button onClick={() => setAmount(String(balance))} className="text-xs text-white hover:underline" data-testid="button-max-amount">Max</button>
        </div>
        {amountUsdt > 0 && (
          <div className="mt-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Withdrawal Amount</span>
              <span className="text-white">${amountUsdt.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Fee ({withdrawFeePercent}%)</span>
              <span className="text-red-400">-${withdrawFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/[0.06] pt-1.5 flex justify-between text-sm">
              <span className="text-gray-400 font-medium">You will receive</span>
              <span className="text-green-400 font-bold">${amountAfterFee.toFixed(2)}</span>
            </div>
            {(withdrawType === "upi" || withdrawType === "imps") && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">In INR</span>
                <span className="text-green-400">₹{amountInr}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {otpStep === "form" ? (
        <Button
          onClick={handleSendOtp}
          disabled={isSendingOtp}
          className="w-full bg-gradient-to-r from-red-500 to-orange-600"
          data-testid="button-submit-withdraw"
        >
          {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpFromLine className="w-4 h-4 mr-2" />}
          Continue Withdrawal
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 space-y-3">
            <p className="text-sm text-gray-400 text-center">Enter the 6-digit code sent to your email</p>
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={withdrawOtp}
              onChange={e => setWithdrawOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="bg-black border-white/[0.06] text-white text-center font-mono text-lg tracking-[0.5em]"
              maxLength={6}
              data-testid="input-withdraw-otp"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setOtpStep("form"); setWithdrawOtp(""); }}
                className="flex-1 border-white/[0.06]"
                data-testid="button-cancel-otp"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyAndSubmit}
                disabled={isSubmitting || withdrawOtp.length !== 6}
                className="flex-1 bg-gradient-to-r from-red-500 to-orange-600"
                data-testid="button-confirm-withdraw"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm
              </Button>
            </div>
            <button
              onClick={handleSendOtp}
              disabled={isSendingOtp}
              className="text-xs text-neutral-500 hover:text-white transition w-full text-center"
              data-testid="button-resend-withdraw-otp"
            >
              Didn't receive? Resend code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/transactions", { credentials: "include" })
      .then(r => r.json())
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-12 h-12 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx: any, i: number) => (
        <div key={tx.id} className="bg-black border border-white/[0.06] rounded-lg p-3" data-testid={`card-transaction-${i}`}>
          {tx.orderId && (
            <p className="text-[10px] text-neutral-500 font-mono mb-1.5">Order: {tx.orderId}</p>
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {tx.txType === "deposit" ? (
                <ArrowDownToLine className="w-4 h-4 text-green-400" />
              ) : (
                <ArrowUpFromLine className="w-4 h-4 text-red-400" />
              )}
              <span className={`font-semibold text-sm ${tx.txType === "deposit" ? "text-green-400" : "text-red-400"}`}>
                {tx.txType === "deposit" ? "Deposit" : "Withdrawal"}
              </span>
              <Badge variant="outline" className="text-xs">
                {tx.type === "imps" ? "IMPS" : tx.type === "upi" ? "UPI" : tx.type === "skrill" ? "Skrill" : tx.type === "volet" ? "Volet" : tx.type === "binance_pay" ? "Binance Pay" : tx.type === "wire_transfer" ? "Wire Transfer" : `${tx.crypto} (${tx.chain})`}
              </Badge>
            </div>
            <StatusBadge status={tx.status} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {(tx.type === "upi" || tx.type === "imps") && tx.amountInr ? `₹${tx.amountInr.toFixed(2)}` : ""}
            </span>
            <span className="text-white font-bold">{tx.amountUsdt.toFixed(2)} USD</span>
          </div>
          {(tx.txHash || tx.utr) && (
            <p className="text-xs text-gray-500 mt-1 font-mono truncate">
              {tx.txHash ? `TX: ${tx.txHash}` : `Ref: ${tx.utr}`}
            </p>
          )}
          {tx.type === "imps" && tx.accountNumber && (
            <p className="text-xs text-gray-500 mt-1">
              A/C: ****{tx.accountNumber.slice(-4)} | IFSC: {tx.ifscCode}
            </p>
          )}
          {tx.type === "skrill" && tx.skrillEmail && (
            <p className="text-xs text-gray-500 mt-1">Skrill: {tx.skrillEmail}</p>
          )}
          {tx.type === "volet" && tx.voletEmail && (
            <p className="text-xs text-gray-500 mt-1">Volet: {tx.voletEmail}</p>
          )}
          {tx.type === "binance_pay" && tx.binancePayId && (
            <p className="text-xs text-gray-500 mt-1 font-mono">Binance Pay ID: {tx.binancePayId}</p>
          )}
          {tx.type === "wire_transfer" && tx.wireBankName && (
            <p className="text-xs text-gray-500 mt-1">Bank: {tx.wireBankName} | SWIFT: {tx.wireSwiftCode}</p>
          )}
          {(tx.type === "skrill" || tx.type === "volet") && tx.transactionId && (
            <p className="text-xs text-gray-500 mt-1 font-mono">Txn: {tx.transactionId}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            {new Date(tx.createdAt).toLocaleString()}
          </p>
          {tx.adminNotes && (
            <p className="text-xs text-amber-400 mt-1">Note: {tx.adminNotes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [kycStatus, setKycStatus] = useState<string>("loading");

  useEffect(() => {
    fetch("/api/user/balance", { credentials: "include" })
      .then(r => r.json())
      .then(d => setBalance(d.balance || 0))
      .catch(() => {});

    fetch("/api/kyc/status", { credentials: "include" })
      .then(r => r.json())
      .then(d => setKycStatus(d.status || "not_submitted"))
      .catch(() => setKycStatus("not_submitted"));
  }, []);

  const isKycVerified = kycStatus === "verified";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <img src={logoImage} alt="TradeX AI" className="h-8 w-8 rounded-full" />
          <span className="text-white font-semibold text-lg tracking-tight">TradeX AI</span>
          <h1 className="text-xl font-bold">Wallet</h1>
        </div>

        {!isKycVerified && kycStatus !== "loading" && (
          <Card className={`mb-4 ${kycStatus === "pending" ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20"}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className={`w-6 h-6 flex-shrink-0 ${kycStatus === "pending" ? "text-amber-400" : "text-red-400"}`} />
                <div className="flex-1">
                  <h3 className={`font-semibold text-sm ${kycStatus === "pending" ? "text-amber-400" : "text-red-400"}`}>
                    {kycStatus === "pending" ? "KYC Verification Pending" : "KYC Verification Required"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {kycStatus === "pending"
                      ? "Your identity is being verified. Deposits will be enabled once approved."
                      : "Complete KYC verification to enable deposits. Upload a valid government ID to get started."}
                  </p>
                  {kycStatus !== "pending" && (
                    <Link href="/kyc">
                      <Button size="sm" className="mt-3 bg-white text-black hover:bg-neutral-200 font-semibold" data-testid="button-verify-kyc">
                        <Shield className="w-4 h-4 mr-1" /> Verify Identity
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isKycVerified && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">KYC Verified</span>
          </div>
        )}

        <Card className="bg-white/[0.03] border-white/[0.08] mb-6">
          <CardContent className="p-6 text-center">
            <WalletIcon className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Total Balance</p>
            <p className="text-3xl font-bold text-white" data-testid="text-balance">{balance.toFixed(2)} USD</p>
            <p className="text-sm text-gray-500 mt-1">≈ ₹{(balance * INR_TO_USD).toFixed(2)} INR</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="w-full bg-white/[0.03] border border-white/[0.06]">
            <TabsTrigger value="deposit" className="flex-1 data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 relative" data-testid="tab-deposit">
              <ArrowDownToLine className="w-4 h-4 mr-1" /> Deposit
              {isKycVerified && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400" data-testid="tab-withdraw">
              <ArrowUpFromLine className="w-4 h-4 mr-1" /> Withdraw
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-white/[0.08] data-[state=active]:text-white" data-testid="tab-history">
              <History className="w-4 h-4 mr-1" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="mt-4">
            <Card className={`${isKycVerified ? "bg-white/[0.03] border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]" : "bg-white/[0.03] border-white/[0.06]"}`}>
              <CardContent className="p-4">
                {isKycVerified ? (
                  <DepositTab />
                ) : (
                  <div className="text-center py-8">
                    <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-white font-semibold mb-2">KYC Required for Deposits</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      {kycStatus === "pending"
                        ? "Your KYC is being reviewed. Please wait for verification."
                        : "Verify your identity to start making deposits."}
                    </p>
                    {kycStatus !== "pending" && (
                      <Link href="/kyc">
                        <Button className="bg-white text-black hover:bg-neutral-200 font-semibold px-6" data-testid="button-kyc-from-deposit">
                          <Shield className="w-4 h-4 mr-2" /> Complete KYC Verification
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="mt-4">
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <WithdrawTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4">
                <HistoryTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-center gap-6 mt-8 mb-4">
          <img src={pciDssLogo} alt="PCI DSS Compliant" className="h-10 opacity-60" />
          <img src={sectigoLogo} alt="Secured by Sectigo" className="h-8 opacity-80" />
        </div>
      </div>
    </div>
  );
}
