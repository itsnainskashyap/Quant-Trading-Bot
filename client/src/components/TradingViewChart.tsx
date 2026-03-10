import { useEffect, useRef } from "react";
import type { TradingPair } from "@shared/schema";

interface TradingViewChartProps {
  pair: TradingPair;
  entryPrice?: number;
  signal?: 'BUY' | 'SELL' | 'SKIP';
  stopLoss?: number;
  takeProfit?: number;
  tradeSize?: number;
  riskAmount?: number;
  potentialProfit?: number;
}

const SYMBOL_MAP: Record<TradingPair, string> = {
  "BTC-USDT": "BINANCE:BTCUSDT",
  "ETH-USDT": "BINANCE:ETHUSDT",
  "SOL-USDT": "BINANCE:SOLUSDT",
  "XRP-USDT": "BINANCE:XRPUSDT",
  "DOGE-USDT": "BINANCE:DOGEUSDT",
  "BNB-USDT": "BINANCE:BNBUSDT",
  "ADA-USDT": "BINANCE:ADAUSDT",
  "AVAX-USDT": "BINANCE:AVAXUSDT",
  "DOT-USDT": "BINANCE:DOTUSDT",
  "MATIC-USDT": "BINANCE:MATICUSDT",
  "LINK-USDT": "BINANCE:LINKUSDT",
  "LTC-USDT": "BINANCE:LTCUSDT",
  "SHIB-USDT": "BINANCE:SHIBUSDT",
  "ATOM-USDT": "BINANCE:ATOMUSDT",
  "UNI-USDT": "BINANCE:UNIUSDT",
};

export function TradingViewChart({ pair, entryPrice, signal, stopLoss, takeProfit, tradeSize, riskAmount, potentialProfit }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const symbol = SYMBOL_MAP[pair] || "BINANCE:BTCUSDT";
    
    containerRef.current.innerHTML = '';
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "1",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(10, 10, 15, 1)",
      gridColor: "rgba(40, 42, 54, 0.3)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    
    containerRef.current.appendChild(script);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [pair]);

  return (
    <div className="relative w-full h-full" data-testid="tradingview-chart">
      <div 
        ref={containerRef}
        className="tradingview-widget-container w-full h-full"
        data-testid="tradingview-container"
      />
      
      {entryPrice && signal && signal !== 'SKIP' && (
        <div className="absolute top-2 left-2 z-10 space-y-1">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            signal === 'BUY' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
          }`}>
            {signal} @ ${entryPrice.toLocaleString()}
          </div>
          {tradeSize && (
            <div className="px-2 py-1 rounded text-xs font-medium bg-white/[0.06] text-neutral-400 border border-white/[0.10]">
              Trade: ${tradeSize.toLocaleString()}
            </div>
          )}
          {stopLoss && (
            <div className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
              SL: ${stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {riskAmount && <span className="ml-1 opacity-70">(-${riskAmount.toFixed(0)})</span>}
            </div>
          )}
          {takeProfit && (
            <div className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              TP: ${takeProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {potentialProfit && <span className="ml-1 opacity-70">(+${potentialProfit.toFixed(0)})</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
