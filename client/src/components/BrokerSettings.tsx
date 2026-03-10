import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link2, Trash2, TestTube, Power, Zap, AlertTriangle, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { ExchangeLogo } from "./ExchangeLogos";

interface SupportedExchange {
  id: string;
  name: string;
  description?: string;
  hasTestnet: boolean;
  needsPassphrase: boolean;
  isVirtual?: boolean;
}

interface BrokerConnection {
  id: string;
  exchange: string;
  isActive: boolean;
  autoTrade: boolean;
  testMode: boolean;
  lastConnected: string | null;
  apiKeyPreview: string;
}

export function BrokerSettings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: supportedExchanges } = useQuery<SupportedExchange[]>({
    queryKey: ['/api/brokers/supported'],
  });

  const { data: connections, isLoading } = useQuery<BrokerConnection[]>({
    queryKey: ['/api/brokers'],
  });

  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/brokers/connect', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brokers'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Broker connected!", description: "Your exchange account has been linked successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Connection failed", description: error.message || "Failed to connect broker", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const res = await apiRequest('PATCH', `/api/brokers/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brokers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/brokers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brokers'] });
      toast({ title: "Broker disconnected" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingId(id);
      const res = await apiRequest('POST', `/api/brokers/${id}/test`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setTestingId(null);
      if (data.success) {
        const balance = data.balance?.USDT?.free || 0;
        toast({ 
          title: "Connection successful!", 
          description: `USDT Balance: $${Number(balance).toFixed(2)}` 
        });
      } else {
        toast({ title: "Connection failed", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: any) => {
      setTestingId(null);
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedExchange("");
    setApiKey("");
    setApiSecret("");
    setPassphrase("");
    setTestMode(true);
  };

  const handleConnect = () => {
    if (!selectedExchange || !apiKey || !apiSecret) {
      toast({ title: "Missing fields", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    connectMutation.mutate({
      exchange: selectedExchange,
      apiKey,
      apiSecret,
      passphrase: passphrase || undefined,
      testMode,
    });
  };

  const selectedExchangeData = supportedExchanges?.find(e => e.id === selectedExchange);
  const hasAutoTradeEnabled = connections?.some(c => c.autoTrade);

  return (
    <Card className="bg-white/[0.03] border-white/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Link2 className="w-4 h-4 text-neutral-400" />
            Broker Connections
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs" data-testid="button-add-broker">
                + Add Broker
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/[0.03] border-white/10">
              <DialogHeader>
                <DialogTitle>Connect Exchange</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Exchange</Label>
                  <Select value={selectedExchange} onValueChange={setSelectedExchange}>
                    <SelectTrigger className="bg-black border-white/10" data-testid="select-exchange">
                      <SelectValue placeholder="Select exchange" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/[0.03] border-white/10">
                      {supportedExchanges?.filter(ex => !ex.isVirtual).map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          <span className="flex items-center gap-2">
                            <ExchangeLogo exchange={ex.id} className="w-5 h-5" />
                            <span>{ex.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="bg-black border-white/10"
                    data-testid="input-api-key"
                  />
                </div>

                <div>
                  <Label>API Secret</Label>
                  <Input
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your API secret"
                    className="bg-black border-white/10"
                    data-testid="input-api-secret"
                  />
                </div>

                {selectedExchangeData?.needsPassphrase && (
                  <div>
                    <Label>Passphrase (required for {selectedExchangeData.name})</Label>
                    <Input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter passphrase"
                      className="bg-black border-white/10"
                      data-testid="input-passphrase"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <TestTube className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-sm font-medium text-amber-400">Test Mode (Sandbox)</div>
                      <div className="text-[10px] text-gray-400">Use testnet - no real money</div>
                    </div>
                  </div>
                  <Switch
                    checked={testMode}
                    onCheckedChange={setTestMode}
                    data-testid="switch-test-mode"
                  />
                </div>

                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                    <div className="text-[11px] text-gray-400">
                      <strong className="text-red-400">Warning:</strong> Auto-trading uses real money when test mode is OFF. 
                      TradeX AI is not responsible for any losses. Trade at your own risk.
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleConnect} 
                  disabled={connectMutation.isPending}
                  className="w-full bg-white text-black hover:bg-neutral-200"
                  data-testid="button-connect-broker"
                >
                  {connectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Exchange"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500 text-xs">Loading...</div>
        ) : connections?.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-xs">
            <Link2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No brokers connected
            <div className="text-[10px] mt-1">Connect a broker to enable auto-trading</div>
          </div>
        ) : (
          <div className="space-y-2">
            {hasAutoTradeEnabled && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                  <Zap className="w-3 h-3" />
                  Auto-trading is ACTIVE
                </div>
              </div>
            )}
            
            {connections?.map((conn) => {
              const exchangeData = supportedExchanges?.find(e => e.id === conn.exchange);
              return (
                <div 
                  key={conn.id} 
                  className="p-2 rounded-lg bg-black border border-white/5"
                  data-testid={`broker-connection-${conn.exchange}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ExchangeLogo exchange={conn.exchange} className="w-6 h-6" />
                      <div>
                        <div className="text-sm font-medium">{exchangeData?.name || conn.exchange}</div>
                        <div className="text-[10px] text-gray-500">{conn.apiKeyPreview}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {conn.testMode && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-400">TEST</span>
                      )}
                      {conn.isActive ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Power className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500">Auto-Trade:</span>
                        <Switch
                          checked={conn.autoTrade}
                          onCheckedChange={(checked) => updateMutation.mutate({ id: conn.id, autoTrade: checked })}
                          className="scale-75"
                          data-testid={`switch-auto-trade-${conn.exchange}`}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => testMutation.mutate(conn.id)}
                        disabled={testingId === conn.id}
                        data-testid={`button-test-${conn.exchange}`}
                      >
                        {testingId === conn.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <TestTube className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                        onClick={() => deleteMutation.mutate(conn.id)}
                        data-testid={`button-delete-${conn.exchange}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
