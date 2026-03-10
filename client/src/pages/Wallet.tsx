import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  IndianRupee,
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

const INR_TO_USD = 92;

function CryptoIcon({ symbol, className = "w-7 h-7" }: { symbol: string; className?: string }) {
  const cdnMap: Record<string, string> = {
    BTC: "https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=040",
    ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.png?v=040",
    USDT: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=040",
    LTC: "https://cryptologos.cc/logos/litecoin-ltc-logo.png?v=040",
    USDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=040",
  };
  const src = cdnMap[symbol];
  if (src) {
    return <img src={src} alt={symbol} className={`${className} rounded-full`} />;
  }
  return (
    <div className={`${className} bg-neutral-700 rounded-full flex items-center justify-center font-semibold text-white text-[10px]`}>
      {symbol[0]}
    </div>
  );
}

function ChainIcon({ chain, className = "w-5 h-5" }: { chain: string; className?: string }) {
  const chainMap: Record<string, { color: string; label: string }> = {
    Bitcoin: { color: "border-orange-500/40 text-orange-400", label: "BTC" },
    ERC20: { color: "border-blue-500/40 text-blue-400", label: "ERC" },
    TRC20: { color: "border-red-500/40 text-red-400", label: "TRC" },
    BEP20: { color: "border-yellow-500/40 text-yellow-400", label: "BSC" },
    Litecoin: { color: "border-neutral-400/40 text-neutral-300", label: "LTC" },
  };
  const config = chainMap[chain] || { color: "border-neutral-500/40 text-neutral-400", label: chain.slice(0, 3) };
  return (
    <div className={`${className} border rounded flex items-center justify-center font-mono font-medium text-[8px] ${config.color}`}>
      {config.label}
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
        if (!res.ok) {
          setPollError(true);
          return;
        }
        setPollError(false);
        const txs = await res.json();
        if (!Array.isArray(txs)) return;
        const tx = txs.find((t: any) => t.orderId === orderId);
        if (tx) {
          setStatus(tx.status);
          if (tx.status === "approved" || tx.status === "rejected") {
            clearInterval(poll);
          }
        }
      } catch {
        setPollError(true);
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [orderId]);

  const handleDone = () => {
    if (status === "approved") {
      setLocation("/dashboard");
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-white/[0.08] rounded-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold text-base">Payment Status</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === "pending" && (
            <>
              <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 flex items-center justify-center">
                <Clock className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium text-sm">Payment Submitted</p>
                <p className="text-neutral-500 text-xs mt-1">Waiting for verification...</p>
              </div>
            </>
          )}

          {status === "processing" && (
            <>
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium text-sm">Verifying Payment</p>
                <p className="text-neutral-500 text-xs mt-1">Your payment is being verified...</p>
              </div>
            </>
          )}

          {status === "approved" && (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-emerald-400 font-semibold text-sm">Payment Approved</p>
                <p className="text-neutral-500 text-xs mt-1">Your balance has been updated</p>
              </div>
            </>
          )}

          {status === "rejected" && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-red-400 font-semibold text-sm">Payment Rejected</p>
                <p className="text-neutral-500 text-xs mt-1">Contact support for assistance</p>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
              status === "pending" || status === "processing" || status === "approved" || status === "rejected"
                ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-600"
            }`}>1</div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-xs text-neutral-300">Submitted</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="ml-3 w-px h-3 bg-white/[0.06]" />
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
              status === "processing" || status === "approved"
                ? "bg-emerald-500/20 text-emerald-400"
                : status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-neutral-800 text-neutral-600"
            }`}>2</div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-xs text-neutral-300">Verifying</span>
              {(status === "processing") && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
              {status === "approved" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
              {status === "rejected" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
              {status === "pending" && <Clock className="w-3.5 h-3.5 text-neutral-600" />}
            </div>
          </div>
          <div className="ml-3 w-px h-3 bg-white/[0.06]" />
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold ${
              status === "approved"
                ? "bg-emerald-500/20 text-emerald-400"
                : status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-neutral-800 text-neutral-600"
            }`}>3</div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-xs text-neutral-300">{status === "rejected" ? "Rejected" : "Completed"}</span>
              {status === "approved" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
              {status === "rejected" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
              {(status === "pending" || status === "processing") && <Clock className="w-3.5 h-3.5 text-neutral-600" />}
            </div>
          </div>
        </div>

        {pollError && (
          <p className="text-center text-[10px] text-amber-500/70 mt-3">Connection issue. Still checking...</p>
        )}

        {orderId && (
          <p className="text-center text-[10px] text-neutral-600 font-mono mt-4">{orderId}</p>
        )}

        <Button
          onClick={handleDone}
          className={`w-full mt-5 ${
            status === "approved" ? "bg-white text-black hover:bg-neutral-200" : "bg-white/[0.06] text-white hover:bg-white/[0.1]"
          }`}
          data-testid="button-status-done"
        >
          {status === "approved" ? "Go to Dashboard" : status === "rejected" ? "Close" : "Continue in Background"}
        </Button>
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
    <span className={`${className} inline-flex items-center justify-center rounded bg-[#1B998B] text-white font-bold text-[10px] leading-none`}>V</span>
  );
}

function BinanceLogo({ className = "w-5 h-5" }: { className?: string }) {
  return <img src={binanceLogo} alt="Binance" className={className} />;
}

function WireTransferLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <span className={`${className} inline-flex items-center justify-center rounded bg-blue-700 text-white font-bold text-[10px] leading-none`}>
      <Landmark className="w-3 h-3" />
    </span>
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
    <div className="space-y-5">
      {depositOrderId && (
        <DepositStatusOverlay orderId={depositOrderId} onClose={() => setDepositOrderId(null)} />
      )}

      <div className="grid grid-cols-5 gap-1.5">
        {([
          { key: "crypto" as const, label: "Crypto", icon: <CryptoIcon symbol="BTC" className="w-4 h-4" /> },
          { key: "upi" as const, label: "UPI", icon: <img src={upiLogo} alt="UPI" className="h-3.5" /> },
          { key: "imps" as const, label: "IMPS", icon: <img src={impsLogo} alt="IMPS" className="h-3.5" /> },
          { key: "skrill" as const, label: "Skrill", icon: <SkrillLogo className="w-4 h-4" /> },
          { key: "volet" as const, label: "Volet", icon: <VoletLogo className="w-4 h-4" /> },
        ]).map(m => (
          <button
            key={m.key}
            onClick={() => setDepositType(m.key)}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
              depositType === m.key
                ? "bg-white/[0.08] text-white border border-white/[0.15]"
                : "text-neutral-500 hover:text-neutral-300 border border-transparent"
            }`}
            data-testid={`button-deposit-${m.key}`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
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
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
            <img src={upiLogo} alt="UPI" className="h-5" />
            <div>
              <p className="text-white text-sm font-medium">UPI Payment</p>
              <p className="text-neutral-600 text-[11px]">Scan QR or use UPI ID to pay</p>
            </div>
          </div>

          <div>
            <Label className="text-neutral-400 text-xs">Amount (INR)</Label>
            <Input
              type="number"
              placeholder="Min ₹2,000"
              value={amountInr}
              onChange={e => handleInrChange(e.target.value)}
              className="bg-black border-white/[0.08] text-white mt-1"
              data-testid="input-inr-amount"
            />
            <p className="text-[10px] text-neutral-600 mt-1">Minimum: ₹2,000 | Rate: ₹{INR_TO_USD} = 1 USD</p>
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 flex items-center justify-between">
              <span className="text-neutral-500 text-xs">You receive</span>
              <span className="text-white font-semibold text-sm">{amount} USD</span>
            </div>
          )}

          {upiMethod ? (
            <div className="border border-white/[0.08] rounded-xl overflow-hidden">
              <div className="bg-white/[0.02] px-4 py-2.5 flex items-center justify-between border-b border-white/[0.06]">
                <span className="text-neutral-400 text-xs font-medium">Pay to UPI</span>
                {allUpiMethods.length > 1 && (
                  <span className="text-[10px] text-neutral-600">{(upiIndex % allUpiMethods.length) + 1} of {allUpiMethods.length}</span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-center py-3 px-4 bg-white rounded-lg mb-3">
                  <QRCode
                    value={amountInr && parseFloat(amountInr) > 0
                      ? `upi://pay?pa=${upiMethod.upiId}&pn=TradeX&am=${amountInr}&cu=INR&tn=TradeX+Deposit`
                      : `upi://pay?pa=${upiMethod.upiId}&pn=TradeX&cu=INR&tn=TradeX+Deposit`}
                    size={160}
                  />
                </div>

                {amountInr && parseFloat(amountInr) > 0 && (
                  <p className="text-center text-emerald-400 font-semibold text-lg mb-3">₹{parseFloat(amountInr).toLocaleString("en-IN")}</p>
                )}

                <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg p-2">
                  <span className="flex-1 text-xs text-neutral-300 font-mono truncate pl-1">{upiMethod.upiId}</span>
                  <button
                    onClick={() => copyText(upiMethod.upiId)}
                    className="shrink-0 text-neutral-500 hover:text-white p-1.5 rounded hover:bg-white/[0.06] transition"
                    data-testid="button-copy-upi"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {allUpiMethods.length > 1 && (
                  <button
                    onClick={handleNewUpi}
                    className="w-full mt-3 text-center text-[11px] text-amber-400/80 hover:text-amber-400 transition py-1.5"
                    data-testid="button-try-another-upi"
                  >
                    <RefreshCw className="w-3 h-3 inline mr-1" />
                    Payment failed? Try another UPI
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-black border border-neutral-800 rounded-lg p-4 text-center">
              <AlertCircle className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
              <p className="text-neutral-500 text-xs">UPI not configured yet</p>
            </div>
          )}

          <div>
            <Label className="text-neutral-400 text-xs">UTR / Reference Number</Label>
            <Input
              placeholder="Enter UTR after payment"
              value={utr}
              onChange={e => setUtr(e.target.value)}
              className="bg-black border-white/[0.08] text-white font-mono text-sm mt-1"
              data-testid="input-utr"
            />
            <p className="text-[10px] text-neutral-600 mt-1">Find this in your UPI app's transaction details</p>
          </div>
        </div>
      )}

      {depositType === "imps" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
            <img src={impsLogo} alt="IMPS" className="h-5" />
            <div>
              <p className="text-white text-sm font-medium">IMPS Bank Transfer</p>
              <p className="text-neutral-600 text-[11px]">Transfer via IMPS/NEFT to our bank account</p>
            </div>
          </div>

          <div>
            <Label className="text-neutral-400 text-xs">Amount (INR)</Label>
            <Input
              type="number"
              placeholder="Min ₹2,000"
              value={amountInr}
              onChange={e => handleInrChange(e.target.value)}
              className="bg-black border-white/[0.08] text-white mt-1"
              data-testid="input-imps-inr-amount"
            />
            <p className="text-[10px] text-neutral-600 mt-1">Minimum: ₹2,000 | Rate: ₹{INR_TO_USD} = 1 USD</p>
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 flex items-center justify-between">
              <span className="text-neutral-500 text-xs">You receive</span>
              <span className="text-white font-semibold text-sm">{amount} USD</span>
            </div>
          )}

          {impsMethod ? (
            <div className="border border-white/[0.08] rounded-xl overflow-hidden">
              <div className="bg-white/[0.02] px-4 py-2.5 flex items-center justify-between border-b border-white/[0.06]">
                <span className="text-neutral-400 text-xs font-medium">Transfer to Bank</span>
                {allImpsMethods.length > 1 && (
                  <span className="text-[10px] text-neutral-600">{(impsIndex % allImpsMethods.length) + 1} of {allImpsMethods.length}</span>
                )}
              </div>
              <div className="p-4 space-y-2">
                {[
                  { label: "Account Holder", value: impsMethod.accountHolderName },
                  { label: "Account Number", value: impsMethod.accountNumber, mono: true },
                  { label: "IFSC Code", value: impsMethod.ifscCode, mono: true },
                  ...(impsMethod.bankName ? [{ label: "Bank Name", value: impsMethod.bankName }] : []),
                ].map((row: any) => (
                  <div key={row.label} className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-lg">
                    <span className="text-neutral-500 text-[11px]">{row.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-white text-xs ${row.mono ? "font-mono" : "font-medium"}`}>{row.value}</span>
                      <button onClick={() => copyText(row.value)} className="text-neutral-600 hover:text-white p-1 rounded hover:bg-white/[0.06] transition">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {amountInr && parseFloat(amountInr) > 0 && (
                  <p className="text-center text-emerald-400 font-semibold text-lg pt-2">₹{parseFloat(amountInr).toLocaleString("en-IN")}</p>
                )}

                {allImpsMethods.length > 1 && (
                  <button
                    onClick={handleNewImps}
                    className="w-full mt-2 text-center text-[11px] text-amber-400/80 hover:text-amber-400 transition py-1.5"
                    data-testid="button-try-another-imps"
                  >
                    <RefreshCw className="w-3 h-3 inline mr-1" />
                    Payment failed? Try another bank
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-black border border-neutral-800 rounded-lg p-4 text-center">
              <AlertCircle className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
              <p className="text-neutral-500 text-xs">IMPS not configured yet</p>
            </div>
          )}

          <div>
            <Label className="text-neutral-400 text-xs">IMPS Reference Number</Label>
            <Input
              placeholder="Enter IMPS reference after transfer"
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
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
            <SkrillLogo className="w-5 h-5" />
            <div>
              <p className="text-white text-sm font-medium">Skrill</p>
              <p className="text-neutral-600 text-[11px]">Deposit via Skrill e-wallet</p>
            </div>
          </div>
          <div>
            <Label className="text-neutral-400 text-xs">Amount (USD)</Label>
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
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
            <VoletLogo className="w-5 h-5" />
            <div>
              <p className="text-white text-sm font-medium">Volet</p>
              <p className="text-neutral-600 text-[11px]">Deposit via Volet e-wallet</p>
            </div>
          </div>
          <div>
            <Label className="text-neutral-400 text-xs">Amount (USD)</Label>
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

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
        data-testid="button-submit-deposit"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
        Submit Deposit
      </Button>
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

      <div className="grid grid-cols-5 gap-1.5">
        {([
          { key: "crypto" as const, label: "Crypto", icon: <CryptoIcon symbol="BTC" className="w-4 h-4" /> },
          { key: "upi" as const, label: "UPI", icon: <img src={upiLogo} alt="UPI" className="h-3.5" /> },
          { key: "imps" as const, label: "IMPS", icon: <img src={impsLogo} alt="IMPS" className="h-3.5" /> },
          { key: "binance_pay" as const, label: "Binance", icon: <BinanceLogo className="w-4 h-4" /> },
          { key: "wire_transfer" as const, label: "Wire", icon: <WireTransferLogo className="w-4 h-4" /> },
        ]).map(m => (
          <button
            key={m.key}
            onClick={() => setWithdrawType(m.key)}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-all ${
              withdrawType === m.key
                ? "bg-white/[0.08] text-white border border-white/[0.15]"
                : "text-neutral-500 hover:text-neutral-300 border border-transparent"
            }`}
            data-testid={`button-withdraw-${m.key}`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
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
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
            <img src={impsLogo} alt="IMPS" className="h-5" />
            <div>
              <p className="text-white text-sm font-medium">IMPS Bank Transfer</p>
              <p className="text-neutral-600 text-[11px]">Enter your bank details to receive funds</p>
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
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
            <BinanceLogo className="w-5 h-5" />
            <div>
              <p className="text-white text-sm font-medium">Binance Pay</p>
              <p className="text-neutral-600 text-[11px]">Withdraw via Binance Pay ID</p>
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
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
            <WireTransferLogo className="w-5 h-5" />
            <div>
              <p className="text-white text-sm font-medium">Wire Transfer</p>
              <p className="text-neutral-600 text-[11px]">International bank wire (SWIFT)</p>
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
