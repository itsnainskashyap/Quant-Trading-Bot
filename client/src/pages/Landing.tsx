import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRight,
  ChevronRight,
  Shield,
  Zap,
  BarChart2,
  TrendingUp
} from "lucide-react";
import { useEffect, useState } from "react";

function AnimatedPrice({ symbol, basePrice }: { symbol: string; basePrice: number }) {
  const [price, setPrice] = useState(basePrice);
  const [isUp, setIsUp] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * (basePrice * 0.001);
      setPrice(prev => {
        const newPrice = prev + change;
        setIsUp(change > 0);
        return newPrice;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [basePrice]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{symbol}</span>
      <span className={`font-mono text-lg font-semibold transition-colors duration-300 ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
        ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

function FloatingOrb({ delay, size, left, top }: { delay: number; size: number; left: string; top: string }) {
  return (
    <div 
      className="absolute rounded-full blur-3xl opacity-20 animate-pulse"
      style={{
        width: size,
        height: size,
        left,
        top,
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)',
        animationDelay: `${delay}s`,
        animationDuration: '4s',
      }}
    />
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      <FloatingOrb delay={0} size={400} left="10%" top="20%" />
      <FloatingOrb delay={1} size={300} left="70%" top="10%" />
      <FloatingOrb delay={2} size={350} left="50%" top="60%" />
      <FloatingOrb delay={1.5} size={250} left="80%" top="70%" />
      
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">TradeX</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How it Works</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
          </div>
          <Button 
            asChild 
            className="bg-white text-black hover:bg-gray-200 rounded-full px-6"
            data-testid="button-get-started"
          >
            <a href="/api/login">Start Trading</a>
          </Button>
        </div>
      </nav>

      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">Live market analysis</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Smart Crypto Trading
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Get clear BUY or SELL signals powered by AI analysis. 
            Perfect for beginners who want to trade crypto confidently.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              asChild 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full px-8 h-14 text-lg"
              data-testid="button-hero-start"
            >
              <a href="/api/login">
                Start Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              asChild 
              className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 h-14 text-lg"
            >
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Free for early users
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Instant signals
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto mt-16 relative z-10">
          <Card className="bg-[#12121a] border-white/10 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <AnimatedPrice symbol="BTC/USDT" basePrice={67432.50} />
                  <AnimatedPrice symbol="ETH/USDT" basePrice={3324.80} />
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                  Live
                </div>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-[#1a1a24] rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-400 mb-1">BUY</div>
                    <div className="text-xs text-gray-500">Current Signal</div>
                  </div>
                  <div className="bg-[#1a1a24] rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white mb-1">78%</div>
                    <div className="text-xs text-gray-500">Confidence</div>
                  </div>
                  <div className="bg-[#1a1a24] rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-cyan-400 mb-1">15m</div>
                    <div className="text-xs text-gray-500">Hold Time</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Three simple steps to start making smarter trades
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-400">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Choose Your Coin</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Select Bitcoin or Ethereum from the dashboard. See real-time prices and charts.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-cyan-400">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Get AI Analysis</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Click "Analyze" and our AI reads the chart to give you a clear recommendation.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-400">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Trade or Skip</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Follow the signal or wait. Track your results to see actual profit or loss.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-[#12121a] border-white/10 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Capital Protection</h3>
                  <p className="text-sm text-gray-500">Your safety is priority</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                When the market is unclear, we say "SKIP". No pressure to trade when conditions aren't right.
              </p>
            </Card>
            
            <Card className="bg-[#12121a] border-white/10 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <BarChart2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Real Results</h3>
                  <p className="text-sm text-gray-500">Full transparency</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                After each trade, see exactly how much you made or lost. No hidden outcomes.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-gray-400">Start free, upgrade when ready</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="bg-[#12121a] border-white/10 p-6">
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">Free Plan</div>
                <div className="text-4xl font-bold">₹0</div>
                <div className="text-sm text-gray-500 mt-1">First 1,000 users</div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <ChevronRight className="w-4 h-4 text-emerald-500" />
                  10 signals per day
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <ChevronRight className="w-4 h-4 text-emerald-500" />
                  BTC and ETH analysis
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <ChevronRight className="w-4 h-4 text-emerald-500" />
                  Basic AI insights
                </li>
              </ul>
              <Button variant="outline" className="w-full rounded-full border-white/20 text-white hover:bg-white/10" asChild>
                <a href="/api/login">Get Started</a>
              </Button>
            </Card>
            
            <Card className="bg-gradient-to-b from-blue-500/10 to-transparent border-blue-500/30 p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs rounded-full">
                Popular
              </div>
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">Pro Plan</div>
                <div className="text-4xl font-bold">₹1,999<span className="text-lg text-gray-500">/mo</span></div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                  Unlimited signals
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                  Advanced AI analysis
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-300">
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                  Priority support
                </li>
              </ul>
              <Button className="w-full rounded-full bg-blue-500 hover:bg-blue-600" asChild>
                <a href="/api/login">Start Pro</a>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Trade Smarter?</h2>
          <p className="text-gray-400 mb-8">
            Join traders who use AI to make better decisions
          </p>
          <Button 
            size="lg" 
            asChild 
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-full px-10 h-14 text-lg"
          >
            <a href="/api/login">
              Start Trading Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-md flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">TradeX</span>
          </div>
          <p className="text-xs text-gray-500 text-center">
            For educational purposes only. Not financial advice. Trade at your own risk.
          </p>
          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} TradeX
          </div>
        </div>
      </footer>
    </div>
  );
}
