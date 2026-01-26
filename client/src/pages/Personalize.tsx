import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, User, ArrowRight, TrendingUp, BarChart2, Zap } from "lucide-react";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";

const experienceLevels = [
  { id: "beginner", label: "Beginner", desc: "New to crypto trading" },
  { id: "intermediate", label: "Intermediate", desc: "Some trading experience" },
  { id: "advanced", label: "Advanced", desc: "Experienced trader" },
  { id: "professional", label: "Professional", desc: "Full-time trader" },
];

const riskLevels = [
  { id: "low", label: "Conservative", desc: "Prefer stable, lower returns", icon: "shield" },
  { id: "medium", label: "Moderate", desc: "Balanced risk and reward", icon: "scale" },
  { id: "high", label: "Aggressive", desc: "Higher risk for higher gains", icon: "flame" },
];

const cryptoPairs = [
  "BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT", "DOGE-USDT",
  "BNB-USDT", "ADA-USDT", "AVAX-USDT", "DOT-USDT", "MATIC-USDT",
];

export function Personalize() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [experience, setExperience] = useState("beginner");
  const [risk, setRisk] = useState("medium");
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["BTC-USDT", "ETH-USDT"]);
  const [isLoading, setIsLoading] = useState(false);

  const togglePair = (pair: string) => {
    setSelectedPairs(prev => 
      prev.includes(pair) 
        ? prev.filter(p => p !== pair)
        : [...prev, pair]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) {
      toast({ title: "Error", description: "Please enter your first name", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/personalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          tradingExperience: experience,
          riskTolerance: risk,
          preferredPairs: selectedPairs,
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save preferences");
      }

      setLocation("/plans");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <img src={logoImage} alt="TradeX AI" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Personalize Your Experience</h1>
          <p className="text-gray-400">Tell us about yourself so we can customize your trading signals</p>
        </div>

        <Card className="bg-[#12121a] border-[#1a1a2e]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10 bg-[#0a0a0f] border-[#1a1a2e] text-white"
                      data-testid="input-first-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-[#0a0a0f] border-[#1a1a2e] text-white"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">Trading Experience</Label>
                <div className="grid grid-cols-2 gap-3">
                  {experienceLevels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setExperience(level.id)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        experience === level.id
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-[#1a1a2e] bg-[#0a0a0f] hover:border-[#2a2a3e]"
                      }`}
                      data-testid={`button-experience-${level.id}`}
                    >
                      <div className="font-medium text-white text-sm">{level.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">Risk Tolerance</Label>
                <div className="grid grid-cols-3 gap-3">
                  {riskLevels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setRisk(level.id)}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        risk === level.id
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-[#1a1a2e] bg-[#0a0a0f] hover:border-[#2a2a3e]"
                      }`}
                      data-testid={`button-risk-${level.id}`}
                    >
                      <div className="font-medium text-white text-sm">{level.label}</div>
                      <div className="text-[10px] text-gray-500 mt-1">{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">Preferred Trading Pairs</Label>
                <div className="flex flex-wrap gap-2">
                  {cryptoPairs.map((pair) => (
                    <button
                      key={pair}
                      type="button"
                      onClick={() => togglePair(pair)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedPairs.includes(pair)
                          ? "bg-cyan-500 text-white"
                          : "bg-[#1a1a2e] text-gray-400 hover:bg-[#2a2a3e]"
                      }`}
                      data-testid={`button-pair-${pair}`}
                    >
                      {pair.replace("-USDT", "")}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                data-testid="button-continue"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continue to Plans
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Personalize;
