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
  Crown, 
  Zap, 
  Shield, 
  Brain, 
  BarChart2, 
  Clock,
  Infinity,
  TrendingUp
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
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
    price: "$29",
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
      
      if (planId === "pro") {
        toast({ 
          title: "Pro Plan Selected", 
          description: "Welcome to TradeX AI Pro! Enjoy unlimited signals." 
        });
      } else {
        toast({ 
          title: "Free Plan Selected", 
          description: "You can upgrade anytime to unlock more features." 
        });
      }
      
      setLocation("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSelectedPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <img src={logoImage} alt="TradeX AI" className="h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Choose Your Plan</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Start free or unlock the full power of AI-driven trading with Pro
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative bg-[#12121a] overflow-hidden transition-all ${
                plan.popular 
                  ? "border-cyan-500 border-2" 
                  : "border-[#1a1a2e]"
              }`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-cyan-500 text-white px-3 py-1">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardContent className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
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
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-gray-600 flex-shrink-0" />
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
                  className={`w-full ${
                    plan.popular
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                      : "bg-[#1a1a2e] text-white hover:bg-[#2a2a3e]"
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
              <Shield className="w-4 h-4 text-emerald-500" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Instant access
            </div>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              AI-powered
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Plans;
