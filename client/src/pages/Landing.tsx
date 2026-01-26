import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowRight,
  ChevronRight,
  Shield,
  Zap,
  BarChart2,
  AlertTriangle,
  Link2,
  Brain
} from "lucide-react";
import { useEffect, useState } from "react";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";
import { ExchangeLogo } from "@/components/ExchangeLogos";
import { PhoneLogin } from "@/components/PhoneLogin";
import { queryClient } from "@/lib/queryClient";

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
  const [loginOpen, setLoginOpen] = useState(false);

  const handleLoginSuccess = () => {
    setLoginOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      <FloatingOrb delay={0} size={400} left="10%" top="20%" />
      <FloatingOrb delay={1} size={300} left="70%" top="10%" />
      <FloatingOrb delay={2} size={350} left="50%" top="60%" />
      <FloatingOrb delay={1.5} size={250} left="80%" top="70%" />
      
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src={logoImage} alt="TradeX AI" className="h-10 w-auto" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors" data-testid="link-how-it-works">How it Works</a>
            <a href="#ai-agents" className="text-sm text-gray-400 hover:text-white transition-colors" data-testid="link-ai-agents">AI Agents</a>
            <a href="#brokers" className="text-sm text-gray-400 hover:text-white transition-colors" data-testid="link-brokers">Supported Brokers</a>
          </div>
          <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-white text-black rounded-full"
                data-testid="button-get-started"
              >
                Start Trading
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-transparent border-0 p-0 max-w-md">
              <PhoneLogin onSuccess={handleLoginSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </nav>

      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">100% FREE - No Hidden Costs</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Smart Crypto Trading
            <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Get clear BUY or SELL signals from 3 AI models working together. 
            Set your capital, get exact entry, stop-loss, and take-profit levels.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              onClick={() => setLoginOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-lg"
              data-testid="button-hero-start"
            >
              Start Free Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              asChild 
              className="border-white/20 text-white rounded-full text-lg"
              data-testid="button-hero-how-it-works"
            >
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2" data-testid="badge-unlimited-signals">
              <Shield className="w-4 h-4 text-emerald-500" />
              Unlimited Signals
            </div>
            <div className="flex items-center gap-2" data-testid="badge-ai-agents">
              <Brain className="w-4 h-4 text-purple-500" />
              5 AI Agents
            </div>
            <div className="flex items-center gap-2" data-testid="badge-crypto-pairs">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              15 Crypto Pairs
            </div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto mt-16 relative z-10">
          <Card className="bg-[#12121a] border-white/10 overflow-hidden" data-testid="card-hero-demo">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <AnimatedPrice symbol="BTC/USDT" basePrice={97432.50} />
                  <AnimatedPrice symbol="ETH/USDT" basePrice={3424.80} />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400" data-testid="badge-live-status">
                  Live
                </Badge>
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
            <div className="text-center" data-testid="card-step-1">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-400">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Set Your Capital</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Enter how much you want to trade with. AI calculates exact position size and risk levels.
              </p>
            </div>
            
            <div className="text-center" data-testid="card-step-2">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-cyan-400">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Get AI Analysis</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                3 AI models (GPT-4o, Claude, Gemini) analyze together for maximum accuracy.
              </p>
            </div>
            
            <div className="text-center" data-testid="card-step-3">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-emerald-400">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Trade with Confidence</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Get exact entry, stop-loss, and take-profit levels. Maximum 2% risk per trade.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="ai-agents" className="py-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400 font-medium">5 Specialized AI Agents</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">AI-Powered Analysis</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              5 specialized AI agents analyze every trade from different perspectives, then vote together for the final decision
            </p>
          </div>
          
          <div className="grid md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-[#12121a] border-white/10 p-4 text-center hover-elevate" data-testid="card-agent-technical">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Technical AI</h3>
              <p className="text-xs text-gray-500 mb-2">RSI, MACD, Bollinger</p>
              <div className="text-xs text-purple-400 font-mono">1.2x weight</div>
            </Card>
            <Card className="bg-[#12121a] border-white/10 p-4 text-center hover-elevate" data-testid="card-agent-fundamental">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Fundamental AI</h3>
              <p className="text-xs text-gray-500 mb-2">Volume, Order Flow</p>
              <div className="text-xs text-purple-400 font-mono">1.0x weight</div>
            </Card>
            <Card className="bg-[#12121a] border-white/10 p-4 text-center hover-elevate" data-testid="card-agent-psychology">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Psychology AI</h3>
              <p className="text-xs text-gray-500 mb-2">Fear/Greed, Sentiment</p>
              <div className="text-xs text-purple-400 font-mono">0.8x weight</div>
            </Card>
            <Card className="bg-[#12121a] border-white/10 p-4 text-center hover-elevate" data-testid="card-agent-pattern">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Pattern AI</h3>
              <p className="text-xs text-gray-500 mb-2">Chart Patterns</p>
              <div className="text-xs text-purple-400 font-mono">1.1x weight</div>
            </Card>
            <Card className="bg-[#12121a] border-white/10 p-4 text-center hover-elevate" data-testid="card-agent-smart-money">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-sm mb-1">Smart Money AI</h3>
              <p className="text-xs text-gray-500 mb-2">Whale Activity</p>
              <div className="text-xs text-purple-400 font-mono">1.3x weight</div>
            </Card>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            All 5 agents vote with weighted confidence. Smart Money has highest weight (1.3x), Psychology lowest (0.8x).
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-[#12121a] border-white/10 p-6" data-testid="card-feature-protection">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Capital Protection</h3>
                  <p className="text-sm text-gray-500">Max 2% risk per trade</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI sets strict stop-loss levels. Never risk more than 2% of your capital on any single trade.
              </p>
            </Card>
            
            <Card className="bg-[#12121a] border-white/10 p-6" data-testid="card-feature-timing">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <BarChart2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI-Controlled Timing</h3>
                  <p className="text-sm text-gray-500">Smart trade extensions</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI monitors your trades and can extend hold time when market conditions are favorable.
              </p>
            </Card>
            
            <Card className="bg-[#12121a] border-white/10 p-6" data-testid="card-feature-pairs">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">15 Crypto Pairs</h3>
                  <p className="text-sm text-gray-500">All major cryptocurrencies</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                BTC, ETH, SOL, XRP, DOGE, BNB, ADA, AVAX, DOT, MATIC, LINK, LTC, SHIB, ATOM, UNI
              </p>
            </Card>
            
            <Card className="bg-[#12121a] border-white/10 p-6" data-testid="card-feature-consensus">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Weighted Consensus</h3>
                  <p className="text-sm text-gray-500">5 AI agents voting together</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Technical, Fundamental, Psychology, Pattern, and Smart Money AI vote for each decision.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section id="brokers" className="py-24 px-6 relative z-10 bg-[#0a0a0f]/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-blue-500/10 border-blue-500/20 text-blue-400 mb-6" data-testid="badge-multi-exchange">
              <Link2 className="w-4 h-4 mr-2" />
              Multi-Exchange Support
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Connect Your Favorite Exchange</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              TradeX AI supports 8 major cryptocurrency exchanges plus our virtual TradeX Broker for paper trading.
            </p>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-8">
            {[
              { id: 'tradex', name: 'TradeX Broker', desc: 'AI Paper Trading' },
              { id: 'binance', name: 'Binance', desc: 'Largest Exchange' },
              { id: 'bybit', name: 'Bybit', desc: 'Derivatives Leader' },
              { id: 'okx', name: 'OKX', desc: 'Advanced Trading' },
              { id: 'kucoin', name: 'KuCoin', desc: '700+ Coins' },
              { id: 'bitget', name: 'Bitget', desc: 'Top Derivatives' },
              { id: 'gateio', name: 'Gate.io', desc: 'Secure & Reliable' },
              { id: 'kraken', name: 'Kraken', desc: 'US Trusted' },
              { id: 'mexc', name: 'MEXC', desc: 'Global Exchange' },
            ].map(exchange => (
              <div 
                key={exchange.id}
                className="flex flex-col items-center p-4 rounded-xl bg-[#12121a] border border-white/5 hover:border-blue-500/30 transition-colors"
              >
                <ExchangeLogo exchange={exchange.id} className="w-10 h-10 mb-2" />
                <span className="text-sm font-medium text-white">{exchange.name}</span>
                <span className="text-[10px] text-gray-500">{exchange.desc}</span>
              </div>
            ))}
          </div>
          
          <div className="text-center text-sm text-gray-500">
            Connect exchanges to enable auto-trading with AI signals. Use TradeX Broker for risk-free paper trading.
          </div>
        </div>
      </section>

      <section className="py-24 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/20 p-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-6">
              <span className="text-lg font-bold text-emerald-400">100% FREE</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Trading Now</h2>
            <p className="text-gray-400 mb-2 max-w-xl mx-auto">
              Unlimited signals, all 15 crypto pairs, full AI analysis - completely free.
            </p>
            <ul className="flex flex-wrap justify-center gap-4 mb-8 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-emerald-500" />
                Unlimited signals
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-emerald-500" />
                All 15 crypto pairs
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-emerald-500" />
                Multi-AI analysis
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-emerald-500" />
                Capital protection
              </li>
            </ul>
            <Button 
              size="lg" 
              onClick={() => setLoginOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full text-lg"
              data-testid="button-cta-start"
            >
              Start Free Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Card>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoImage} alt="TradeX AI" className="h-8 w-auto" />
          <div className="flex items-center gap-2 text-xs text-amber-400/80">
            <AlertTriangle className="w-4 h-4" />
            <span>Trade at your own risk. Crypto trading involves significant risk of loss.</span>
          </div>
          <div className="text-xs text-gray-500">
            © {new Date().getFullYear()} TradeX AI
          </div>
        </div>
      </footer>
    </div>
  );
}
