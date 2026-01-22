# Ek XBT - AI-Assisted Trading Decision Platform

## Overview
Ek XBT is a probability-based trading decision platform that helps users decide whether to BUY, SELL, or SKIP trades on cryptocurrency pairs (BTC-USDT, ETH-USDT). The system focuses on capital protection over profit maximization, preferring to skip trades over low-quality signals.

**NEW: Multi-AI Consensus System** - Uses 3 world-class AI providers (OpenAI GPT-5.1, Anthropic Claude, Google Gemini) voting together for maximum signal quality and reduced false signals.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Styling**: Tailwind CSS with custom dark trading theme
- **State Management**: TanStack Query (React Query)
- **AI/LLM Providers**: 
  - OpenAI GPT-5.1 (via Replit AI Integrations)
  - Anthropic Claude (via Replit AI Integrations)
  - Google Gemini (via Replit AI Integrations)
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
      AIConsensus.tsx    # NEW: Multi-AI consensus display
    pages/
      Dashboard.tsx      # Main trading dashboard
    lib/
      queryClient.ts     # API request configuration
server/
  routes.ts             # API endpoints
  storage.ts            # In-memory data storage and signal generation
  consensus.ts          # NEW: Multi-AI consensus logic
shared/
  schema.ts             # TypeScript types and Zod schemas
```

## API Endpoints
- `GET /api/dashboard/:pair?` - Dashboard data (prices, signal, metrics, history, protection)
- `POST /api/explain` - Generate AI explanation for current signal
- `POST /api/consensus` - **NEW**: Get multi-AI consensus from OpenAI, Anthropic, and Gemini
- `GET /api/prices` - Get all price data
- `GET /api/signal/:pair` - Get signal for specific pair
- `GET /api/metrics/:pair` - Get market metrics for pair
- `GET /api/history` - Get signal history

## Key Features
1. **Multi-AI Consensus System** (NEW)
   - Queries OpenAI GPT-5.1, Anthropic Claude, and Google Gemini in parallel
   - Requires 67%+ agreement for actionable signals
   - Requires 70%+ average confidence
   - Automatic NO_TRADE on conflicting BUY/SELL signals
   
2. **Multi-Model Ensemble**: 4 AI models (Trend Detection, Momentum Confirmation, Volatility Filter, Liquidity Trap Detector)

3. **Signal Generation**: BUY/SELL/NO_TRADE based on aggregate confidence threshold (≥65%)

4. **Risk Grading**: LOW/MEDIUM/HIGH based on confidence and volatility

5. **Exit Window**: Time-based exit recommendations (5-25 minutes)

6. **Capital Protection**: Trade frequency limiter, volatility suppression, drawdown awareness

7. **LLM Explanations**: GPT-powered human-readable signal explanations

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
- No profit guarantees are made - system cannot guarantee "lossless" trades
- Uses simulated market data for demonstration
- LLM never generates predictions independently
- Multi-AI consensus significantly reduces false signals but cannot eliminate all losses
