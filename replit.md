# Ek XBT - AI-Assisted Trading Decision Platform

## Overview
Ek XBT is a probability-based trading decision platform that helps users decide whether to BUY, SELL, or SKIP trades on cryptocurrency pairs (BTC-USDT, ETH-USDT). The system focuses on capital protection over profit maximization, preferring to skip trades over low-quality signals.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Styling**: Tailwind CSS with custom dark trading theme
- **State Management**: TanStack Query (React Query)
- **AI/LLM**: OpenAI (via Replit AI Integrations) for signal explanations
- **Animation**: Framer Motion for smooth UI transitions

## Project Structure
```
client/
  src/
    components/           # UI components
      Header.tsx         # App header with live feed indicator
      PriceDisplay.tsx   # Price cards for trading pairs
      SignalCard.tsx     # Primary signal display (BUY/SELL/NO_TRADE)
      ConfidenceMeter.tsx # Circular confidence visualization
      RiskIndicator.tsx  # Risk grade badge (LOW/MEDIUM/HIGH)
      ExitCountdown.tsx  # Exit window countdown timer
      MarketMetrics.tsx  # Market metrics panel
      ModelScores.tsx    # AI model ensemble scores
      LLMExplanation.tsx # AI-generated signal explanation
      CapitalProtection.tsx # Capital protection status
      SignalHistory.tsx  # Recent signal history
      Disclaimer.tsx     # Legal disclaimer
    pages/
      Dashboard.tsx      # Main trading dashboard
    lib/
      queryClient.ts     # API request configuration
server/
  routes.ts             # API endpoints
  storage.ts            # In-memory data storage and signal generation
shared/
  schema.ts             # TypeScript types and Zod schemas
```

## API Endpoints
- `GET /api/dashboard/:pair?` - Dashboard data (prices, signal, metrics, history, protection)
- `POST /api/explain` - Generate AI explanation for current signal
- `GET /api/prices` - Get all price data
- `GET /api/signal/:pair` - Get signal for specific pair
- `GET /api/metrics/:pair` - Get market metrics for pair
- `GET /api/history` - Get signal history

## Key Features
1. **Multi-Model Ensemble**: 4 AI models (Trend Detection, Momentum Confirmation, Volatility Filter, Liquidity Trap Detector)
2. **Signal Generation**: BUY/SELL/NO_TRADE based on aggregate confidence threshold (≥65%)
3. **Risk Grading**: LOW/MEDIUM/HIGH based on confidence and volatility
4. **Exit Window**: Time-based exit recommendations (5-25 minutes)
5. **Capital Protection**: Trade frequency limiter, volatility suppression, drawdown awareness
6. **LLM Explanations**: GPT-powered human-readable signal explanations

## Design System
- **Theme**: Dark mode by default (professional trading aesthetic)
- **Colors**: 
  - Success (BUY): Green (#22c55e)
  - Destructive (SELL): Red (#ef4444)
  - Warning (NO_TRADE): Amber (#eab308)
  - Primary: Blue (#3b82f6)
- **Typography**: Inter font family, JetBrains Mono for numbers

## Running the Application
The app runs on port 5000 with `npm run dev`. Frontend and backend are served together.

## Important Notes
- This is an educational tool, not financial advice
- No profit guarantees are made
- Uses simulated market data for demonstration
- LLM never generates predictions independently
