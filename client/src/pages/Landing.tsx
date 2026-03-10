import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import logoImage from "@assets/file_00000000efdc71fababc3d71e2096aaf_(1)_1769100459834.png";
import { ExchangeLogo } from "@/components/ExchangeLogos";
import heroMockup from "@assets/Picsart_26-03-10_19-15-14-488_1773150540316.png";

function LiveTicker() {
  const [prices, setPrices] = useState([
    { pair: "BTC", price: 70487, change: 3.88 },
    { pair: "ETH", price: 2057, change: 3.13 },
    { pair: "SOL", price: 86.67, change: 3.58 },
    { pair: "XRP", price: 1.39, change: 2.73 },
    { pair: "BNB", price: 645.62, change: 2.74 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) =>
        prev.map((p) => ({
          ...p,
          price: p.price * (1 + (Math.random() - 0.5) * 0.002),
          change: p.change + (Math.random() - 0.5) * 0.1,
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-6 overflow-hidden" data-testid="live-ticker">
      {prices.map((p) => (
        <div key={p.pair} className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-neutral-500 font-medium">{p.pair}</span>
          <span className="font-mono text-neutral-300">
            ${p.price.toLocaleString("en-US", { minimumFractionDigits: p.price < 10 ? 4 : 2, maximumFractionDigits: p.price < 10 ? 4 : 2 })}
          </span>
          <span className={`font-mono ${p.change >= 0 ? "text-emerald-500" : "text-red-400"}`}>
            {p.change >= 0 ? "+" : ""}
            {p.change.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white antialiased">
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled ? "bg-black/90 backdrop-blur-lg border-b border-white/[0.06]" : "bg-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <img src={logoImage} alt="TradeX AI" className="h-8 w-auto" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-[13px] text-neutral-400 hover:text-white transition-colors" data-testid="link-how-it-works">
              How it Works
            </a>
            <a href="#technology" className="text-[13px] text-neutral-400 hover:text-white transition-colors" data-testid="link-ai-agents">
              Technology
            </a>
            <a href="#exchanges" className="text-[13px] text-neutral-400 hover:text-white transition-colors" data-testid="link-brokers">
              Exchanges
            </a>
            <a href="#pricing" className="text-[13px] text-neutral-400 hover:text-white transition-colors" data-testid="link-pricing">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-neutral-400 hover:text-white text-[13px] h-9" data-testid="button-login">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-white text-black hover:bg-neutral-200 text-[13px] h-9 rounded-lg font-medium" data-testid="button-get-started">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-0 md:pt-40 md:pb-0">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-950/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-950/15 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-8 items-center min-h-[60vh]">
            <div>
              <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-light tracking-[-0.03em] leading-[1.05] mb-6">
                AI Trading
                <br />
                <span className="italic font-normal text-neutral-400">for everyone</span>
              </h1>
              <p className="text-neutral-500 text-lg leading-relaxed max-w-md mb-10">
                Multi-AI consensus signals for 15 crypto pairs.
                <br />
                Set capital, get entry, stop-loss, and take-profit — automatically.
              </p>
              <div className="flex items-center gap-4">
                <Link href="/register">
                  <Button
                    className="bg-white text-black hover:bg-neutral-200 h-11 px-7 rounded-lg font-medium text-sm"
                    data-testid="button-hero-start"
                  >
                    Get Started
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  asChild
                  className="text-neutral-400 hover:text-white h-11 px-5 text-sm"
                  data-testid="button-hero-how-it-works"
                >
                  <a href="#how-it-works">Documentation</a>
                </Button>
              </div>
            </div>

            <div className="flex justify-center md:justify-end overflow-visible">
              <div className="relative overflow-visible">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent rounded-full blur-[100px] scale-150" />
                <img
                  src={heroMockup}
                  alt="TradeX AI Platform - Dashboard and Trading Interface"
                  className="relative w-full max-w-[560px] h-auto drop-shadow-2xl"
                  data-testid="img-hero-mockup"
                  draggable={false}
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[60px] bg-white/[0.04] blur-[40px] rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] mt-12">
          <div className="max-w-[1200px] mx-auto px-6 py-4">
            <LiveTicker />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mb-20">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">How it works</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight leading-tight">
              Three steps to
              <br />
              <span className="italic text-neutral-400">smarter trading</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {[
              {
                step: "01",
                num: 1,
                title: "Set capital",
                desc: "Enter your trading amount. AI calculates position size and risk levels for each trade.",
              },
              {
                step: "02",
                num: 2,
                title: "Get AI signals",
                desc: "GPT-4o, Claude, and Gemini analyze in parallel. 67%+ consensus required for signals.",
              },
              {
                step: "03",
                num: 3,
                title: "Execute trades",
                desc: "Get entry, stop-loss, and take-profit levels. Connect your exchange or use paper trading.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-black p-8 md:p-10" data-testid={`card-step-${item.num}`}>
                <span className="text-xs font-mono text-neutral-600 block mb-6">{item.step}</span>
                <h3 className="text-xl font-normal mb-3 text-white">{item.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="technology" className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mb-20">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">Technology</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight leading-tight">
              Powered by
              <br />
              <span className="italic text-neutral-400">multi-AI consensus</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] rounded-xl overflow-hidden mb-12">
            <div className="bg-black p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-neutral-500">SIGNAL ENGINE</span>
              </div>
              <h3 className="text-xl font-normal mb-3">Multi-model analysis</h3>
              <p className="text-sm text-neutral-500 leading-relaxed mb-6">
                Three leading AI providers — OpenAI GPT-4o, Anthropic Claude, and Google Gemini — analyze each trade independently. Only when 67%+ agree does a signal fire.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {["GPT-4o", "Claude", "Gemini"].map((m) => (
                  <div key={m} className="text-center py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <span className="text-xs text-neutral-400">{m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-mono text-neutral-500">RISK MANAGEMENT</span>
              </div>
              <h3 className="text-xl font-normal mb-3">Capital protection</h3>
              <p className="text-sm text-neutral-500 leading-relaxed mb-6">
                Maximum 2% risk per trade, 10% maximum position size. AI sets strict stop-loss levels and dynamically adjusts take-profit targets with 1:1.5 risk-reward ratio.
              </p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-500">2% max risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-500">Auto stop-loss</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-neutral-500">1:1.5 R:R</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {[
              {
                label: "Technical",
                desc: "RSI, MACD, Bollinger Bands, Stochastic, ADX, support/resistance analysis",
                weight: "1.2x",
              },
              {
                label: "Fundamental",
                desc: "Volume delta, order book imbalance, funding rate, open interest analysis",
                weight: "1.0x",
              },
              {
                label: "Smart Money",
                desc: "Whale activity tracking, institutional flow, market regime classification",
                weight: "1.3x",
              },
            ].map((agent) => (
              <div key={agent.label} className="bg-black p-8" data-testid={`card-agent-${agent.label.toLowerCase()}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">{agent.label}</h4>
                  <span className="text-[10px] font-mono text-neutral-600">{agent.weight}</span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mb-20">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">Features</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight leading-tight">
              Everything you need
              <br />
              <span className="italic text-neutral-400">to trade with confidence</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {[
              { title: "15 Crypto Pairs", desc: "BTC, ETH, SOL, XRP, DOGE, BNB, ADA, and 8 more major pairs" },
              { title: "Live Signals", desc: "Real-time BUY/SELL/SKIP signals with confidence scores and reasoning" },
              { title: "Auto Trading", desc: "Connect your exchange API for automated trade execution" },
              { title: "Paper Trading", desc: "Risk-free practice with virtual TradeX broker and real prices" },
              { title: "Smart Exit", desc: "AI monitors trades and extends hold time when conditions are favorable" },
              { title: "Find Trade", desc: "Auto-scan mode runs up to 30 minutes until a 90%+ confidence signal" },
              { title: "Multi-Exchange", desc: "Supports Binance, Bybit, OKX, KuCoin, Bitget, and more" },
              { title: "Wallet System", desc: "Deposit via crypto or UPI, withdraw with 24hr processing" },
            ].map((f) => (
              <div key={f.title} className="bg-black p-6 md:p-8" data-testid={`card-feature-${f.title.toLowerCase().replace(/\s/g, "-")}`}>
                <h4 className="text-sm font-medium text-white mb-2">{f.title}</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="exchanges" className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mb-20">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">Integrations</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight leading-tight">
              Connect your
              <br />
              <span className="italic text-neutral-400">favorite exchange</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {[
              { id: "tradex", name: "TradeX" },
              { id: "binance", name: "Binance" },
              { id: "bybit", name: "Bybit" },
              { id: "okx", name: "OKX" },
              { id: "kucoin", name: "KuCoin" },
              { id: "bitget", name: "Bitget" },
              { id: "gateio", name: "Gate.io" },
              { id: "kraken", name: "Kraken" },
              { id: "mexc", name: "MEXC" },
              { id: "more", name: "More..." },
            ].map((ex) => (
              <div key={ex.id} className="bg-black p-6 flex flex-col items-center justify-center gap-3 min-h-[120px]">
                {ex.id === "more" ? (
                  <span className="text-sm text-neutral-500">+ More</span>
                ) : (
                  <>
                    <ExchangeLogo exchange={ex.id} className="w-8 h-8 opacity-60" />
                    <span className="text-xs text-neutral-500">{ex.name}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-xl mx-auto text-center mb-16">
            <p className="text-[13px] text-neutral-500 uppercase tracking-[0.15em] font-medium mb-4">Pricing</p>
            <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight">
              Start free, <span className="italic text-neutral-400">upgrade anytime</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/[0.06] rounded-xl overflow-hidden max-w-3xl mx-auto">
            <div className="bg-black p-8 md:p-10">
              <span className="text-xs font-mono text-neutral-500 block mb-4">FREE</span>
              <div className="text-3xl font-light mb-1">$0</div>
              <p className="text-xs text-neutral-500 mb-8">No credit card required</p>
              <ul className="space-y-3 text-sm text-neutral-400 mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-neutral-600" />
                  10 AI analyses per day
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-neutral-600" />
                  All 15 crypto pairs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-neutral-600" />
                  Paper trading
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-neutral-600" />
                  Basic AI signals
                </li>
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full h-10 rounded-lg border-white/10 text-sm text-white hover:bg-white/5" data-testid="button-pricing-free">
                  Get Started
                </Button>
              </Link>
            </div>

            <div className="bg-black p-8 md:p-10 relative">
              <div className="absolute top-4 right-4 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">POPULAR</div>
              <span className="text-xs font-mono text-neutral-500 block mb-4">PRO</span>
              <div className="text-3xl font-light mb-1">
                10 <span className="text-lg text-neutral-500">USDT/mo</span>
              </div>
              <p className="text-xs text-neutral-500 mb-8">Pay with crypto or UPI</p>
              <ul className="space-y-3 text-sm text-neutral-400 mb-8">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Unlimited AI analyses
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Auto-trade execution
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Find Trade scanner
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Multi-exchange connect
                </li>
              </ul>
              <Link href="/register">
                <Button className="w-full h-10 rounded-lg bg-white text-black hover:bg-neutral-200 text-sm font-medium" data-testid="button-pricing-pro">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-[2.5rem] font-light tracking-tight mb-6">
            Ready to trade <span className="italic text-neutral-400">smarter?</span>
          </h2>
          <p className="text-neutral-500 text-sm mb-10 max-w-md mx-auto">
            Join traders using multi-AI consensus for better crypto decisions.
          </p>
          <Link href="/register">
            <Button className="bg-white text-black hover:bg-neutral-200 h-11 px-8 rounded-lg font-medium text-sm" data-testid="button-cta-start">
              Get Started — Free
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={logoImage} alt="TradeX AI" className="h-7 w-auto opacity-50" />
            <p className="text-[11px] text-neutral-600 text-center md:text-left">
              Crypto trading involves significant risk. This is not financial advice. Trade responsibly.
            </p>
            <span className="text-[11px] text-neutral-700">
              &copy; {new Date().getFullYear()} TradeX AI
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
