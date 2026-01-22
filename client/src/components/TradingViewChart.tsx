import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TradingPair } from "@shared/schema";

interface TradingViewChartProps {
  pair: TradingPair;
}

export function TradingViewChart({ pair }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const symbol = pair === "BTC-USDT" ? "BINANCE:BTCUSDT" : "BINANCE:ETHUSDT";
    
    containerRef.current.innerHTML = '';
    
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: "15",
      timezone: "Asia/Kolkata",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(10, 12, 20, 1)",
      gridColor: "rgba(40, 42, 54, 0.5)",
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
    <Card className="col-span-full" data-testid="card-tradingview-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 36 28" fill="none">
            <path d="M14 22V6h8v16h-8zm10-6v-6h8v6h-8zm-20 0v-6h8v6H4z" fill="currentColor"/>
          </svg>
          Live Chart - {pair}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="tradingview-widget-container h-[400px] rounded-md overflow-hidden"
          data-testid="tradingview-container"
        />
      </CardContent>
    </Card>
  );
}
