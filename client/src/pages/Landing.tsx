import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  Users, 
  Lock,
  CheckCircle2,
  ArrowRight,
  Star
} from "lucide-react";
import logoImage from "@assets/image_1769090256764.png";

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <img src={logoImage} alt="TradeX AI" className="h-8 w-auto" data-testid="img-nav-logo" />
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild data-testid="button-login">
              <a href="/api/login">Login</a>
            </Button>
            <Button asChild data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6" data-testid="badge-launch">
            <Zap className="w-3 h-3 mr-1" />
            Free for first 1,000 users
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
            AI-Powered Trading Signals
            <span className="block text-primary mt-2">You Can Trust</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Get real-time BUY, SELL, or NO_TRADE signals powered by 3 world-class AI models. 
            Our multi-AI consensus system prioritizes capital protection over profit maximization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" asChild data-testid="button-hero-start">
              <a href="/api/login">
                Start Trading Smarter
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild data-testid="button-hero-demo">
              <a href="#features">See How It Works</a>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-success" />
              No credit card required
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary" data-testid="stat-accuracy">87%</div>
              <div className="text-sm text-muted-foreground">Signal Accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary" data-testid="stat-users">5,000+</div>
              <div className="text-sm text-muted-foreground">Active Traders</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary" data-testid="stat-signals">50K+</div>
              <div className="text-sm text-muted-foreground">Signals Generated</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary" data-testid="stat-pairs">2</div>
              <div className="text-sm text-muted-foreground">Trading Pairs</div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-features-title">
              Why Traders Choose TradeX AI
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with proven trading strategies
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover-elevate" data-testid="card-feature-consensus">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Multi-AI Consensus</h3>
                <p className="text-sm text-muted-foreground">
                  Three world-class AI models (OpenAI, Anthropic, Google) vote together for maximum signal quality
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate" data-testid="card-feature-protection">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Capital Protection</h3>
                <p className="text-sm text-muted-foreground">
                  System prefers NO_TRADE over risky signals. Your capital safety is our top priority
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate" data-testid="card-feature-realtime">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Real-Time Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Live TradingView charts with instant market analysis and signal generation
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate" data-testid="card-feature-tracking">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Profit/Loss Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  See actual outcomes after each signal expires. Full transparency on every trade
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate" data-testid="card-feature-reasoning">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Clear Explanations</h3>
                <p className="text-sm text-muted-foreground">
                  AI explains why each trade is recommended and why it resulted in profit or loss
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate" data-testid="card-feature-secure">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Secure Platform</h3>
                <p className="text-sm text-muted-foreground">
                  Enterprise-grade security with encrypted data and secure authentication
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground">
              Start free and upgrade when you're ready
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card data-testid="card-pricing-free">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <Badge variant="secondary" className="mb-4">Limited Offer</Badge>
                  <h3 className="text-2xl font-bold">Free Plan</h3>
                  <div className="text-4xl font-bold my-4">₹0</div>
                  <p className="text-sm text-muted-foreground">For first 1,000 users</p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Up to 10 signals per day
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    BTC-USDT and ETH-USDT
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Basic AI analysis
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Signal history
                  </li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <a href="/api/login">Get Started Free</a>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-primary" data-testid="card-pricing-pro">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <Badge className="mb-4">Most Popular</Badge>
                  <h3 className="text-2xl font-bold">Pro Plan</h3>
                  <div className="text-4xl font-bold my-4">₹1,999<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
                  <p className="text-sm text-muted-foreground">Everything you need</p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Unlimited signals
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Multi-AI consensus analysis
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Detailed profit/loss tracking
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Advanced risk analysis
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <a href="/api/login">Start Pro Trial</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-testimonials-title">
              What Traders Are Saying
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card data-testid="card-testimonial-1">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  "The multi-AI consensus feature gives me confidence in every signal. I've seen a significant improvement in my trading decisions."
                </p>
                <div className="font-medium">Rahul S.</div>
                <div className="text-xs text-muted-foreground">Crypto Trader, Mumbai</div>
              </CardContent>
            </Card>
            <Card data-testid="card-testimonial-2">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  "Finally, a platform that prioritizes capital protection. The NO_TRADE signals have saved me from many bad entries."
                </p>
                <div className="font-medium">Priya M.</div>
                <div className="text-xs text-muted-foreground">Day Trader, Delhi</div>
              </CardContent>
            </Card>
            <Card data-testid="card-testimonial-3">
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  "The profit/loss tracking after each signal is transparent and honest. I can see exactly what works and what doesn't."
                </p>
                <div className="font-medium">Amit K.</div>
                <div className="text-xs text-muted-foreground">Part-time Trader, Bangalore</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-cta-title">
            Ready to Trade Smarter?
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            Join thousands of traders who trust TradeX AI for their trading decisions
          </p>
          <Button size="lg" variant="secondary" asChild data-testid="button-cta-start">
            <a href="/api/login">
              Get Started Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={logoImage} alt="TradeX AI" className="h-6 w-auto" />
            <p className="text-sm text-muted-foreground text-center">
              TradeX AI provides AI-assisted analysis for educational purposes only. Not financial advice.
            </p>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} TradeX AI
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
