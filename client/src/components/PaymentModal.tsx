import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CryptoLogo } from "./CryptoLogos";
import { Copy, CheckCircle, Loader2, ExternalLink } from "lucide-react";
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

  const { data: settings } = useQuery<AdminSettings>({
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
        description: "Verifying your transaction...",
      });
      
      const checkStatus = async () => {
        try {
          const response = await fetch(`/api/payment/status/${txHash}`);
          const data = await response.json();
          
          if (data.status === 'verified') {
            setVerifying(false);
            toast({
              title: "Payment Verified",
              description: "Your Pro subscription is now active.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
            onClose();
          } else if (data.status === 'failed') {
            setVerifying(false);
            toast({
              title: "Verification Failed",
              description: "Could not verify the transaction.",
              variant: "destructive",
            });
          } else {
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

  const price = settings?.proPrice || 10;
  const hasTrc20 = !!settings?.trc20Address;
  const hasBep20 = !!settings?.bep20Address;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0f1117] border-white/10 p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle className="text-lg font-medium">
            Upgrade to Pro
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 pt-3 space-y-5">
          {/* Price display */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/5">
            <span className="text-gray-400 text-sm">Amount</span>
            <div className="flex items-center gap-2">
              <CryptoLogo type="usdt" className="w-5 h-5" />
              <span className="text-xl font-semibold">{price} USDT</span>
            </div>
          </div>

          {/* Network selector */}
          <div className="space-y-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Select Network</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => hasTrc20 && setSelectedNetwork('trc20')}
                disabled={!hasTrc20}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  selectedNetwork === 'trc20' 
                    ? 'bg-red-500/10 border-red-500/30 text-white' 
                    : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.04]'
                } ${!hasTrc20 ? 'opacity-40 cursor-not-allowed' : ''}`}
                data-testid="tab-trc20"
              >
                <CryptoLogo type="trc20" className="w-5 h-5" />
                <span className="text-sm font-medium">TRC20</span>
              </button>
              <button
                onClick={() => hasBep20 && setSelectedNetwork('bep20')}
                disabled={!hasBep20}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  selectedNetwork === 'bep20' 
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-white' 
                    : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.04]'
                } ${!hasBep20 ? 'opacity-40 cursor-not-allowed' : ''}`}
                data-testid="tab-bep20"
              >
                <CryptoLogo type="bep20" className="w-5 h-5" />
                <span className="text-sm font-medium">BEP20</span>
              </button>
            </div>
          </div>

          {/* QR and address */}
          {walletAddress ? (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCode 
                  value={walletAddress} 
                  size={140}
                  level="H"
                  data-testid={`qr-${selectedNetwork}`}
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs text-gray-500">Wallet Address</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 rounded-lg bg-white/[0.03] border border-white/5 font-mono text-xs text-gray-300 break-all">
                    {walletAddress}
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={handleCopyAddress}
                    className="flex-shrink-0 h-10 w-10"
                    data-testid={`button-copy-${selectedNetwork}`}
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <a 
                href={selectedNetwork === 'trc20' 
                  ? `https://tronscan.org/#/address/${walletAddress}`
                  : `https://bscscan.com/address/${walletAddress}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on Explorer
              </a>

              <div className="pt-2 border-t border-white/5 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs text-gray-500">Transaction Hash</span>
                  <Input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste your transaction hash here"
                    className="font-mono text-sm bg-white/[0.03] border-white/5"
                    data-testid="input-tx-hash"
                  />
                </div>
                
                <Button 
                  onClick={handleSubmitPayment}
                  disabled={submitPayment.isPending || verifying || !txHash.trim()}
                  className="w-full bg-white text-black hover:bg-gray-100 font-medium"
                  data-testid="button-submit-payment"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : submitPayment.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Confirm Payment'
                  )}
                </Button>

                <p className="text-[11px] text-gray-600 text-center">
                  Verification usually takes 1-3 minutes
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">
              Payment is not available at the moment.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
