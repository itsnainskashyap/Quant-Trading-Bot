import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Loader2, 
  User, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Shield,
  Target,
  Flame,
  Scale,
  ChevronRight,
  Check,
  Sprout,
  TrendingUp,
  Crown
} from "lucide-react";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";

const experienceIcons: Record<string, React.ComponentType<{className?: string}>> = {
  Sprout, TrendingUp, Target, Crown
};

const experienceLevels = [
  { id: "beginner", label: "Beginner", desc: "New to crypto trading", icon: "Sprout" },
  { id: "intermediate", label: "Intermediate", desc: "Some trading experience", icon: "TrendingUp" },
  { id: "advanced", label: "Advanced", desc: "Experienced trader", icon: "Target" },
  { id: "professional", label: "Professional", desc: "Full-time trader", icon: "Crown" },
];

const riskLevels = [
  { id: "low", label: "Conservative", desc: "Prefer stable, lower returns", icon: Shield, color: "text-emerald-400" },
  { id: "medium", label: "Moderate", desc: "Balanced risk and reward", icon: Scale, color: "text-blue-400" },
  { id: "high", label: "Aggressive", desc: "Higher risk for higher gains", icon: Flame, color: "text-orange-400" },
];

const cryptoPairs = [
  "BTC-USDT", "ETH-USDT", "SOL-USDT", "XRP-USDT", "DOGE-USDT",
  "BNB-USDT", "ADA-USDT", "AVAX-USDT", "DOT-USDT", "MATIC-USDT",
];

export function Personalize() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
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

  const nextStep = () => {
    if (step === 1 && !firstName.trim()) {
      toast({ title: "Required", description: "Please enter your first name", variant: "destructive" });
      return;
    }
    setStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
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

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
              step === s
                ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white scale-110 shadow-lg shadow-cyan-500/30"
                : step > s
                ? "bg-emerald-500 text-white"
                : "bg-[#1a1a2e] text-gray-500"
            }`}
          >
            {step > s ? <Check className="w-5 h-5" /> : s}
          </div>
          {s < 4 && (
            <div className={`w-12 h-1 mx-1 rounded transition-all duration-500 ${
              step > s ? "bg-emerald-500" : "bg-[#1a1a2e]"
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 py-8 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-6">
            <img src={logoImage} alt="TradeX AI" className="h-10 mx-auto mb-4" />
            <div className="flex items-center justify-center gap-2 text-cyan-400 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">Setting up your experience</span>
            </div>
          </div>

          <StepIndicator />

          <div className="relative">
            {step === 1 && (
              <Card className="bg-[#12121a]/80 backdrop-blur-xl border-[#1a1a2e] animate-in fade-in slide-in-from-right-4 duration-500">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
                      <User className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">What's your name?</h2>
                    <p className="text-gray-400">Let's personalize your trading experience</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="Enter your first name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="bg-[#0a0a0f] border-[#2a2a3e] text-white text-lg focus:border-cyan-500 transition-colors"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-300">Last Name (Optional)</Label>
                      <Input
                        id="lastName"
                        placeholder="Enter your last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="bg-[#0a0a0f] border-[#2a2a3e] text-white text-lg focus:border-cyan-500 transition-colors"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={nextStep}
                    size="lg"
                    className="w-full mt-8 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium"
                    data-testid="button-next-step1"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card className="bg-[#12121a]/80 backdrop-blur-xl border-[#1a1a2e] animate-in fade-in slide-in-from-right-4 duration-500">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                      <Target className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Your Trading Experience</h2>
                    <p className="text-gray-400">Help us tailor signals to your level</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {experienceLevels.map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setExperience(level.id)}
                        className={`p-5 rounded-xl border text-left transition-all duration-300 flex items-center gap-4 ${
                          experience === level.id
                            ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 scale-[1.02]"
                            : "border-[#2a2a3e] bg-[#0a0a0f]/50 hover:border-[#3a3a4e] hover:bg-[#0a0a0f]"
                        }`}
                        data-testid={`button-experience-${level.id}`}
                      >
                        {(() => {
                        const Icon = experienceIcons[level.icon];
                        return Icon ? <Icon className="w-8 h-8 text-cyan-400" /> : null;
                      })()}
                        <div className="flex-1">
                          <div className="font-bold text-white">{level.label}</div>
                          <div className="text-sm text-gray-400">{level.desc}</div>
                        </div>
                        {experience === level.id && (
                          <Check className="w-5 h-5 text-cyan-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-8">
                    <Button
                      onClick={prevStep}
                      variant="outline"
                      size="lg"
                      className="flex-1 border-[#2a2a3e] text-gray-300"
                      data-testid="button-back-step2"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      size="lg"
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium"
                      data-testid="button-next-step2"
                    >
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="bg-[#12121a]/80 backdrop-blur-xl border-[#1a1a2e] animate-in fade-in slide-in-from-right-4 duration-500">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                      <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Risk Tolerance</h2>
                    <p className="text-gray-400">How much risk are you comfortable with?</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-8">
                    {riskLevels.map((level) => {
                      const Icon = level.icon;
                      return (
                        <button
                          key={level.id}
                          type="button"
                          onClick={() => setRisk(level.id)}
                          className={`p-5 rounded-xl border text-left transition-all duration-300 flex items-center gap-4 ${
                            risk === level.id
                              ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 scale-[1.02]"
                              : "border-[#2a2a3e] bg-[#0a0a0f]/50 hover:border-[#3a3a4e] hover:bg-[#0a0a0f]"
                          }`}
                          data-testid={`button-risk-${level.id}`}
                        >
                          <div className={`w-12 h-12 rounded-xl bg-[#1a1a2e] flex items-center justify-center ${level.color}`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-white">{level.label}</div>
                            <div className="text-sm text-gray-400">{level.desc}</div>
                          </div>
                          {risk === level.id && (
                            <Check className="w-5 h-5 text-cyan-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mb-6">
                    <Label className="text-gray-300 mb-3 block">Preferred Trading Pairs</Label>
                    <div className="flex flex-wrap gap-2">
                      {cryptoPairs.map((pair) => (
                        <button
                          key={pair}
                          type="button"
                          onClick={() => togglePair(pair)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                            selectedPairs.includes(pair)
                              ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20"
                              : "bg-[#1a1a2e] text-gray-400 hover:bg-[#2a2a3e]"
                          }`}
                          data-testid={`button-pair-${pair}`}
                        >
                          {pair.replace("-USDT", "")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      variant="outline"
                      className="flex-1 border-[#2a2a3e] text-gray-300"
                      data-testid="button-back-step3"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium"
                      data-testid="button-next-step3"
                    >
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card className="bg-[#12121a]/80 backdrop-blur-xl border-[#1a1a2e] animate-in fade-in slide-in-from-right-4 duration-500">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Almost Done!</h2>
                    <p className="text-gray-400">Review your preferences</p>
                  </div>

                  <div className="space-y-4 bg-[#0a0a0f] rounded-xl p-5 mb-8">
                    <div className="flex justify-between items-center py-2 border-b border-[#1a1a2e]">
                      <span className="text-gray-400">Name</span>
                      <span className="text-white font-medium">{firstName} {lastName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#1a1a2e]">
                      <span className="text-gray-400">Experience</span>
                      <span className="text-white font-medium capitalize">{experience}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#1a1a2e]">
                      <span className="text-gray-400">Risk Tolerance</span>
                      <span className="text-white font-medium capitalize">{risk}</span>
                    </div>
                    <div className="py-2">
                      <span className="text-gray-400 block mb-2">Selected Pairs</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedPairs.map((pair) => (
                          <span key={pair} className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">
                            {pair.replace("-USDT", "")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={prevStep}
                      variant="outline"
                      className="flex-1 border-[#2a2a3e] text-gray-300"
                      data-testid="button-back-step4"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium"
                      data-testid="button-complete"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Complete Setup
                          <ChevronRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Personalize;
