export const ExchangeLogos: Record<string, () => JSX.Element> = {
  binance: () => (
    <svg viewBox="0 0 126.61 126.61" className="w-6 h-6">
      <g fill="#F3BA2F">
        <polygon points="38.73,53.98 63.31,29.4 87.88,53.98 102.09,39.76 63.31,0.98 24.52,39.76"/>
        <polygon points="0.98,63.31 15.2,49.1 29.41,63.31 15.2,77.52"/>
        <polygon points="38.73,72.63 63.31,97.21 87.88,72.63 102.1,86.84 102.09,86.85 63.31,125.63 24.52,86.85 24.51,86.84"/>
        <polygon points="97.2,63.31 111.41,49.1 125.63,63.31 111.41,77.52"/>
        <polygon points="77.83,63.3 63.31,48.78 52.59,59.5 51.37,60.72 48.78,63.31 63.31,77.83 77.83,63.31"/>
      </g>
    </svg>
  ),
  
  bybit: () => (
    <svg viewBox="0 0 200 200" className="w-6 h-6">
      <rect fill="#F7A600" width="200" height="200" rx="40"/>
      <path fill="#1E1E1E" d="M55 70h35v60H55V70zm55 0h35v60h-35V70z"/>
    </svg>
  ),
  
  okx: () => (
    <svg viewBox="0 0 200 200" className="w-6 h-6">
      <rect fill="#000000" width="200" height="200" rx="20"/>
      <g fill="#FFFFFF">
        <rect x="40" y="40" width="35" height="35"/>
        <rect x="82.5" y="40" width="35" height="35"/>
        <rect x="125" y="40" width="35" height="35"/>
        <rect x="40" y="82.5" width="35" height="35"/>
        <rect x="125" y="82.5" width="35" height="35"/>
        <rect x="40" y="125" width="35" height="35"/>
        <rect x="82.5" y="125" width="35" height="35"/>
        <rect x="125" y="125" width="35" height="35"/>
      </g>
    </svg>
  ),
  
  kucoin: () => (
    <svg viewBox="0 0 200 200" className="w-6 h-6">
      <rect fill="#23AF91" width="200" height="200" rx="20"/>
      <g fill="#FFFFFF">
        <polygon points="100,30 140,60 140,100 100,130 60,100 60,60"/>
        <circle cx="100" cy="80" r="15"/>
        <rect x="90" y="130" width="20" height="40"/>
      </g>
    </svg>
  ),
  
  bitget: () => (
    <svg viewBox="0 0 200 200" className="w-6 h-6">
      <rect fill="#00F0FF" width="200" height="200" rx="20"/>
      <g fill="#000000">
        <path d="M60 60h30v80H60V60zm50 0h30v80h-30V60z"/>
        <path d="M60 90h80v20H60V90z"/>
      </g>
    </svg>
  ),
  
  gateio: () => (
    <svg viewBox="0 0 200 200" className="w-6 h-6">
      <rect fill="#2354E6" width="200" height="200" rx="20"/>
      <g fill="#FFFFFF">
        <circle cx="100" cy="100" r="50" fill="none" stroke="#FFFFFF" strokeWidth="15"/>
        <rect x="100" y="75" width="50" height="50"/>
      </g>
    </svg>
  ),
  
  kraken: () => (
    <svg viewBox="0 0 200 200" className="w-6 h-6">
      <rect fill="#5741D9" width="200" height="200" rx="20"/>
      <g fill="#FFFFFF">
        <circle cx="100" cy="70" r="30"/>
        <path d="M70 100c0 30 13.5 50 30 50s30-20 30-50"/>
        <ellipse cx="100" cy="160" rx="40" ry="15"/>
      </g>
    </svg>
  ),
  
  mexc: () => (
    <svg viewBox="0 0 200 200" className="w-6 h-6">
      <rect fill="#00B897" width="200" height="200" rx="20"/>
      <g fill="#FFFFFF">
        <polygon points="100,40 140,70 140,130 100,160 60,130 60,70"/>
        <text x="100" y="110" textAnchor="middle" fontSize="40" fontWeight="bold">M</text>
      </g>
    </svg>
  ),
  
  tradex: () => (
    <svg viewBox="0 0 200 200" className="w-6 h-6">
      <defs>
        <linearGradient id="tradexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6"/>
          <stop offset="100%" stopColor="#8B5CF6"/>
        </linearGradient>
      </defs>
      <rect fill="url(#tradexGrad)" width="200" height="200" rx="20"/>
      <g fill="#FFFFFF">
        <polygon points="100,30 170,80 145,80 100,50 55,80 30,80"/>
        <polygon points="100,170 30,120 55,120 100,150 145,120 170,120"/>
        <rect x="85" y="70" width="30" height="60" rx="5"/>
        <text x="100" y="110" textAnchor="middle" fontSize="24" fontWeight="bold">TX</text>
      </g>
    </svg>
  ),
};

export function ExchangeLogo({ exchange, className = "w-6 h-6" }: { exchange: string; className?: string }) {
  const LogoComponent = ExchangeLogos[exchange.toLowerCase()];
  
  if (!LogoComponent) {
    return (
      <div className={`${className} bg-muted rounded flex items-center justify-center text-xs font-bold`}>
        {exchange.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  
  return (
    <div className={className}>
      <LogoComponent />
    </div>
  );
}
