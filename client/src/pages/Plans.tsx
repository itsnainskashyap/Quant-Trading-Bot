import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Loader2, 
  Check, 
  X, 
  Award, 
  Rocket, 
  ShieldCheck, 
  Cpu, 
  Gem
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import logoImage from "@assets/Picsart_26-03-10_23-57-49-090_1773167302165.png";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    oldPrice: null,
    period: "forever",
    description: "Perfect for getting started with AI trading signals",
    features: [
      { text: "5 AI signals per day", included: true },
      { text: "3 AI agents (GPT-4o, Claude, Gemini)", included: true },
      { text: "Basic technical indicators", included: true },
      { text: "15 crypto pairs", included: true },
      { text: "Community support", included: true },
      { text: "Unlimited signals", included: false },
      { text: "Advanced analysis system", included: false },
      { text: "Priority AI processing", included: false },
      { text: "Auto-trade execution", included: false },
      { text: "VIP support", included: false },
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "10 USDT",
    oldPrice: "$199",
    period: "/month",
    description: "For serious traders who want every advantage",
    features: [
      { text: "Unlimited AI signals", included: true },
      { text: "5 AI agents with weighted consensus", included: true },
      { text: "Advanced technical indicators", included: true },
      { text: "15 crypto pairs", included: true },
      { text: "24/7 priority support", included: true },
      { text: "Advanced 4-layer analysis system", included: true },
      { text: "Meta-Judge AI filtering", included: true },
      { text: "Priority AI processing", included: true },
      { text: "Auto-trade with 8 exchanges", included: true },
      { text: "Loss-avoidance & cooldown engine", included: true },
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
];

export function Plans() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      if (planId === "pro") {
        setLocation("/payment");
        return;
      }

      const response = await fetch("/api/auth/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to select plan");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({ 
        title: "Free Plan Selected", 
        description: "You can upgrade anytime to unlock more features." 
      });
      
      setLocation("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSelectedPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={logoImage} alt="TradeX AI" className="h-10 w-10 rounded-full" />
              <span className="text-white font-semibold text-xl tracking-tight">TradeX AI</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-neutral-400 mb-3">
              <Gem className="w-5 h-5" />
              <span className="text-sm font-medium">Choose Your Trading Power</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h1>
            <p className="text-gray-400 max-w-lg mx-auto">
              Start free or unlock the full power of AI-driven trading with Pro
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative bg-white/[0.04] backdrop-blur-xl overflow-hidden transition-all duration-300 ${
                  plan.popular 
                    ? "border-white/20 border-2" 
                    : "border-white/[0.06]"
                }`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-white text-black px-4 py-1.5">
                      <Award className="w-3 h-3 mr-1" />
                      Best Value
                    </Badge>
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      {plan.oldPrice && (
                        <span className="text-2xl text-gray-500 line-through">{plan.oldPrice}</span>
                      )}
                      <span className={`text-4xl font-bold ${plan.popular ? "text-white" : "text-white"}`}>
                        {plan.price}
                      </span>
                      <span className="text-gray-500">{plan.period}</span>
                    </div>
                    {plan.popular && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 mb-2">
                        95% OFF - Limited Time!
                      </Badge>
                    )}
                    <p className="text-sm text-gray-400">{plan.description}</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-3"
                        data-testid={`feature-${plan.id}-${index}`}
                      >
                        {feature.included ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-500" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center">
                            <X className="w-3 h-3 text-gray-600" />
                          </div>
                        )}
                        <span className={feature.included ? "text-gray-300 text-sm" : "text-gray-600 text-sm"}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isLoading && selectedPlan === plan.id}
                    size="lg"
                    className={`w-full font-medium ${
                      plan.popular
                        ? "bg-white text-black hover:bg-neutral-200"
                        : "bg-white/[0.06] text-white"
                    }`}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {isLoading && selectedPlan === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Secure Payment
              </div>
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-amber-500" />
                Instant Access
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-500" />
                AI-Powered
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Plans;
