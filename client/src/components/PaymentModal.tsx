import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CryptoLogo } from "./CryptoLogos";
import { 
  Copy, 
  CheckCircle, 
  Loader2, 
  ExternalLink,
  QrCode,
  Shield,
  Zap,
  Clock
} from "lucide-react";
import QRCode from "react-qr-code";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminSettings {
  trc20Address?: string;
  bep20Address?: string;
  proPrice: number;
}

export function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const { toast } = useToast();
  const [selectedNetwork, setSelectedNetwork] = useState<'trc20' | 'bep20'>('trc20');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const { data: settings, isLoading } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
    enabled: isOpen,
  });

  const walletAddress = selectedNetwork === 'trc20' 
    ? settings?.trc20Address 
    : settings?.bep20Address;

  const submitPayment = useMutation({
    mutationFn: async (data: { network: string; txHash: string }) => {
      return apiRequest('POST', '/api/payment/submit', data);
    },
    onSuccess: () => {
      setVerifying(true);
      toast({
        title: "Payment Submitted",
        description: "Verifying your transaction on the blockchain...",
      });
      
      // Poll for verification status
      const checkStatus = async () => {
        try {
          const response = await fetch(`/api/payment/status/${txHash}`);
          const data = await response.json();
          
          if (data.status === 'verified') {
            setVerifying(false);
            toast({
              title: "Payment Verified!",
              description: "Your Pro subscription is now active.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
            onClose();
          } else if (data.status === 'failed') {
            setVerifying(false);
            toast({
              title: "Verification Failed",
              description: "Could not verify the transaction. Please check the transaction hash.",
              variant: "destructive",
            });
          } else {
            // Still pending, check again in 5 seconds
            setTimeout(checkStatus, 5000);
          }
        } catch (error) {
          setVerifying(false);
        }
      };
      
      setTimeout(checkStatus, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit payment",
        variant: "destructive",
      });
    },
  });

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const handleSubmitPayment = () => {
    if (!txHash.trim()) {
      toast({
        title: "Error",
        description: "Please enter your transaction hash",
        variant: "destructive",
      });
      return;
    }
    submitPayment.mutate({ network: selectedNetwork, txHash: txHash.trim() });
  };

  const networkConfig = {
    trc20: {
      name: 'TRC20',
      network: 'TRON Network',
      explorer: 'https://tronscan.org/#/transaction/',
      color: 'from-red-500/20 to-red-600/20',
      borderColor: 'border-red-500/30',
    },
    bep20: {
      name: 'BEP20',
      network: 'BSC (BNB Chain)',
      explorer: 'https://bscscan.com/tx/',
      color: 'from-yellow-500/20 to-amber-500/20',
      borderColor: 'border-yellow-500/30',
    },
  };

  const currentNetwork = networkConfig[selectedNetwork];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[#0f1117] border-blue-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CryptoLogo type="usdt" className="w-6 h-6" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Pay with USDT to unlock unlimited AI analyses and premium features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">Pro Subscription</span>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                <Zap className="w-3 h-3 mr-1" />
                Lifetime Access
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{settings?.proPrice || 10}</span>
              <span className="text-lg text-muted-foreground">USDT</span>
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Unlimited AI Analyses</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Auto-Trade Execution</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Priority Support</span>
              </div>
            </div>
          </div>

          <Tabs value={selectedNetwork} onValueChange={(v) => setSelectedNetwork(v as 'trc20' | 'bep20')}>
            <TabsList className="grid w-full grid-cols-2 bg-background/50">
              <TabsTrigger 
                value="trc20" 
                className="flex items-center gap-2"
                disabled={!settings?.trc20Address}
                data-testid="tab-trc20"
              >
                <CryptoLogo type="trc20" className="w-4 h-4" />
                TRC20
              </TabsTrigger>
              <TabsTrigger 
                value="bep20" 
                className="flex items-center gap-2"
                disabled={!settings?.bep20Address}
                data-testid="tab-bep20"
              >
                <CryptoLogo type="bep20" className="w-4 h-4" />
                BEP20
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trc20" className="mt-4">
              <PaymentDetails 
                network="trc20"
                address={settings?.trc20Address}
                price={settings?.proPrice || 10}
                onCopy={handleCopyAddress}
                copied={copied}
              />
            </TabsContent>

            <TabsContent value="bep20" className="mt-4">
              <PaymentDetails 
                network="bep20"
                address={settings?.bep20Address}
                price={settings?.proPrice || 10}
                onCopy={handleCopyAddress}
                copied={copied}
              />
            </TabsContent>
          </Tabs>

          {walletAddress && (
            <div className="space-y-3">
              <Label className="text-sm">
                After sending payment, paste your transaction hash below:
              </Label>
              <Input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder={selectedNetwork === 'trc20' ? "e.g., a1b2c3d4..." : "e.g., 0xa1b2c3d4..."}
                className="font-mono text-sm bg-background"
                data-testid="input-tx-hash"
              />
              
              <Button 
                onClick={handleSubmitPayment}
                disabled={submitPayment.isPending || verifying || !txHash.trim()}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
                data-testid="button-submit-payment"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying on Blockchain...
                  </>
                ) : submitPayment.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Payment
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Automatic blockchain verification (1-3 minutes)
              </p>
            </div>
          )}

          {!settings?.trc20Address && !settings?.bep20Address && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
              <p className="text-sm text-yellow-400">
                Payment is not available at the moment. Please try again later.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentDetailsProps {
  network: 'trc20' | 'bep20';
  address?: string;
  price: number;
  onCopy: () => void;
  copied: boolean;
}

function PaymentDetails({ network, address, price, onCopy, copied }: PaymentDetailsProps) {
  if (!address) {
    return (
      <div className="p-4 rounded-lg bg-muted/20 text-center text-muted-foreground">
        {network.toUpperCase()} payment is not configured
      </div>
    );
  }

  const networkInfo = {
    trc20: {
      name: 'TRC20',
      network: 'TRON Network',
      explorer: 'https://tronscan.org/#/address/',
      bgColor: 'bg-gradient-to-br from-red-500/10 to-red-600/10',
      borderColor: 'border-red-500/20',
    },
    bep20: {
      name: 'BEP20',
      network: 'BSC (BNB Chain)',
      explorer: 'https://bscscan.com/address/',
      bgColor: 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10',
      borderColor: 'border-yellow-500/20',
    },
  };

  const info = networkInfo[network];

  return (
    <div className={`p-4 rounded-lg ${info.bgColor} ${info.borderColor} border space-y-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CryptoLogo type={network} className="w-5 h-5" />
          <span className="font-medium">{info.network}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          <CryptoLogo type="usdt" className="w-3 h-3 mr-1" />
          USDT
        </Badge>
      </div>

      <div className="flex justify-center p-4 bg-white rounded-lg">
        <QRCode 
          value={address} 
          size={160}
          level="H"
          data-testid={`qr-${network}`}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Wallet Address</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 p-2 rounded bg-background/50 font-mono text-xs break-all">
            {address}
          </div>
          <Button 
            size="icon" 
            variant="outline" 
            onClick={onCopy}
            className="flex-shrink-0"
            data-testid={`button-copy-${network}`}
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between p-2 rounded bg-background/30">
        <span className="text-sm text-muted-foreground">Send exactly:</span>
        <span className="font-bold text-lg flex items-center gap-1">
          <CryptoLogo type="usdt" className="w-4 h-4" />
          {price} USDT
        </span>
      </div>

      <a 
        href={`${info.explorer}${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="w-3 h-3" />
        View on Explorer
      </a>
    </div>
  );
}
