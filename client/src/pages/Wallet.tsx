import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
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
  QrCode,
  IndianRupee,
  Bitcoin,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Landmark,
} from "lucide-react";
import QRCode from "react-qr-code";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";
import upiLogo from "@assets/image_1773144638368.png";
import impsLogo from "@assets/Picsart_26-03-10_19-32-00-972_1773166568501.png";
import binanceLogo from "@assets/binance_logo.png";

const INR_TO_USDT = 92;

function CryptoIcon({ symbol, className = "w-7 h-7" }: { symbol: string; className?: string }) {
  const icons: Record<string, { bg: string; text: string; label: string }> = {
    BTC: { bg: "bg-orange-500", text: "text-white", label: "₿" },
    ETH: { bg: "bg-blue-500", text: "text-white", label: "Ξ" },
    USDT: { bg: "bg-emerald-500", text: "text-white", label: "₮" },
    LTC: { bg: "bg-gray-400", text: "text-white", label: "Ł" },
    USDC: { bg: "bg-blue-400", text: "text-white", label: "$" },
  };
  const config = icons[symbol] || { bg: "bg-gray-500", text: "text-white", label: symbol[0] };
  return (
    <div className={`${className} ${config.bg} rounded-full flex items-center justify-center font-bold ${config.text} text-xs`}>
      {config.label}
    </div>
  );
}

function ChainIcon({ chain, className = "w-5 h-5" }: { chain: string; className?: string }) {
  const icons: Record<string, { bg: string; label: string }> = {
    Bitcoin: { bg: "bg-orange-500", label: "₿" },
    ERC20: { bg: "bg-blue-500", label: "Ξ" },
    TRC20: { bg: "bg-red-500", label: "T" },
    BEP20: { bg: "bg-yellow-500", label: "B" },
    Litecoin: { bg: "bg-gray-400", label: "Ł" },
  };
  const config = icons[chain] || { bg: "bg-gray-500", label: chain[0] };
  return (
    <div className={`${className} ${config.bg} rounded-full flex items-center justify-center font-bold text-white text-[9px]`}>
      {config.label}
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
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="6" fill="#862165" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">S</text>
    </svg>
  );
}

function VoletLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <rect width="24" height="24" rx="6" fill="#00B4D8" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="sans-serif">V</text>
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

  const upiMethod = paymentMethods.find(m => m.type === "upi");
  const impsMethod = paymentMethods.find(m => m.type === "imps");

  const handleInrChange = (val: string) => {
    setAmountInr(val);
    const inr = parseFloat(val);
    if (!isNaN(inr) && inr > 0) {
      setAmount((inr / INR_TO_USDT).toFixed(2));
    } else {
      setAmount("");
    }
  };

  const handleUsdtChange = (val: string) => {
    setAmount(val);
    const usdt = parseFloat(val);
    if (!isNaN(usdt) && usdt > 0) {
      setAmountInr((usdt * INR_TO_USDT).toFixed(2));
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

    if (depositType === "crypto" && !txHash.trim()) {
      toast({ title: "Error", description: "Enter transaction hash", variant: "destructive" });
      return;
    }
    if ((depositType === "upi" || depositType === "imps") && !utr.trim()) {
      toast({ title: "Error", description: "Enter UTR/Reference number", variant: "destructive" });
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
      <div className="grid grid-cols-5 gap-2">
        <Button
          variant={depositType === "crypto" ? "default" : "outline"}
          onClick={() => setDepositType("crypto")}
          className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
          data-testid="button-deposit-crypto"
        >
          <Bitcoin className="w-4 h-4" /> Crypto
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
            <Label className="text-gray-300">Amount (USDT)</Label>
            <Input
              type="number"
              placeholder="Enter USDT amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-deposit-amount"
            />
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
          <div>
            <Label className="text-gray-300">Amount (INR)</Label>
            <Input
              type="number"
              placeholder="Enter INR amount"
              value={amountInr}
              onChange={e => handleInrChange(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-inr-amount"
            />
          </div>
          <div className="bg-black border border-white/[0.06] rounded-lg p-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm">You will receive</span>
            <span className="text-white font-bold">{amount ? `${amount} USDT` : "0 USDT"}</span>
          </div>
          <p className="text-xs text-gray-500">Conversion Rate: ₹{INR_TO_USDT} = 1 USDT</p>

          {upiMethod ? (
            <div className="bg-black border border-white/[0.06] rounded-lg p-4 space-y-3">
              <Label className="text-gray-300">Pay to UPI</Label>
              {amountInr && parseFloat(amountInr) > 0 ? (
                <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                  <QRCode value={`upi://pay?pa=${upiMethod.upiId}&am=${amountInr}&cu=INR&tn=TradeX+Deposit`} size={180} />
                </div>
              ) : upiMethod.qrImage ? (
                <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                  <img src={upiMethod.qrImage} alt="UPI QR" className="max-w-[180px]" />
                </div>
              ) : (
                <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                  <QRCode value={`upi://pay?pa=${upiMethod.upiId}&cu=INR&tn=TradeX+Deposit`} size={180} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input value={upiMethod.upiId} readOnly className="bg-white/[0.03] text-sm text-gray-300" />
                <Button size="sm" variant="outline" onClick={() => copyText(upiMethod.upiId)} data-testid="button-copy-upi">
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {amountInr && parseFloat(amountInr) > 0 && (
                <p className="text-center text-green-400 font-semibold">Pay ₹{amountInr}</p>
              )}
            </div>
          ) : (
            <div className="bg-black border border-amber-500/30 rounded-lg p-4 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-amber-400 text-sm">UPI payment method not configured</p>
            </div>
          )}

          <div>
            <Label className="text-gray-300">UTR Number</Label>
            <Input
              placeholder="Enter UTR after payment"
              value={utr}
              onChange={e => setUtr(e.target.value)}
              className="bg-black border-white/[0.06] text-white font-mono text-sm"
              data-testid="input-utr"
            />
            <p className="text-xs text-gray-500 mt-1">Enter the UTR/Reference number from your UPI app</p>
          </div>
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
              placeholder="Enter INR amount"
              value={amountInr}
              onChange={e => handleInrChange(e.target.value)}
              className="bg-black border-white/[0.06] text-white"
              data-testid="input-imps-inr-amount"
            />
          </div>
          <div className="bg-black border border-white/[0.06] rounded-lg p-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm">You will receive</span>
            <span className="text-white font-bold">{amount ? `${amount} USDT` : "0 USDT"}</span>
          </div>
          <p className="text-xs text-gray-500">Conversion Rate: ₹{INR_TO_USDT} = 1 USDT</p>

          {impsMethod ? (
            <div className="bg-black border border-white/[0.06] rounded-lg p-4 space-y-3">
              <Label className="text-gray-300">Transfer to Bank Account</Label>
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
            <Label className="text-gray-300">Amount (USDT)</Label>
            <Input
              type="number"
              placeholder="Enter USDT amount"
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
            <Label className="text-gray-300">Amount (USDT)</Label>
            <Input
              type="number"
              placeholder="Enter USDT amount"
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
  const amountInr = (withdrawType === "upi" || withdrawType === "imps") ? (amountUsdt * INR_TO_USDT).toFixed(2) : null;

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
        <span className="text-white font-bold text-lg">{balance.toFixed(2)} USDT</span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <Button
          variant={withdrawType === "crypto" ? "default" : "outline"}
          onClick={() => setWithdrawType("crypto")}
          className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
          data-testid="button-withdraw-crypto"
        >
          <Bitcoin className="w-4 h-4" /> Crypto
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
        <Label className="text-gray-300">Amount (USDT)</Label>
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
          {(withdrawType === "upi" || withdrawType === "imps") && amountUsdt > 0 && (
            <span className="text-xs text-green-400">You will receive ₹{amountInr}</span>
          )}
        </div>
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
            <span className="text-white font-bold">{tx.amountUsdt.toFixed(2)} USDT</span>
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
          <img src={logoImage} alt="TradeX AI" className="h-8" />
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
            <p className="text-3xl font-bold text-white" data-testid="text-balance">{balance.toFixed(2)} USDT</p>
            <p className="text-sm text-gray-500 mt-1">≈ ₹{(balance * INR_TO_USDT).toFixed(2)} INR</p>
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
      </div>
    </div>
  );
}
