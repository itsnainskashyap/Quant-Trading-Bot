# TradeX AI - AI-Assisted Trading Decision Platform

## Overview
TradeX AI is a probability-based trading decision platform that helps users decide whether to BUY, SELL, or SKIP trades on 15 cryptocurrency pairs. The system focuses on capital protection over profit maximization with strict risk management (2% risk per trade, 10% max position size).

**Multi-AI Consensus System** - Uses 3 world-class AI providers (OpenAI GPT-5.1, Anthropic Claude, Google Gemini) voting together for maximum signal quality and reduced false signals.

**Supported Pairs**: BTC, ETH, SOL, XRP, DOGE, BNB, ADA, AVAX, DOT, MATIC, LINK, LTC, SHIB, ATOM, UNI

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Authentication**: Replit Auth (OpenID Connect)
- **Styling**: Tailwind CSS with custom dark trading theme
- **State Management**: TanStack Query (React Query)
- **AI/LLM Providers**: 
  - OpenAI GPT-5.1 (via Replit AI Integrations)
  - Anthropic Claude (via Replit AI Integrations)
  - Google Gemini (via Replit AI Integrations)
- **Charts**: TradingView Advanced Charts

## Project Structure
```
client/
  src/
    components/
      Header.tsx              # App header with subscription status
      PriceDisplay.tsx        # Price cards for trading pairs
      SignalCard.tsx          # Primary signal display (BUY/SELL/NO_TRADE)
      TradingViewChart.tsx    # Live TradingView charts
      AIConsensus.tsx         # Multi-AI consensus display
      PredictionHistory.tsx   # User's trade history with P/L
      MarketMetrics.tsx       # Market metrics panel
      ModelScores.tsx         # AI model ensemble scores
      LLMExplanation.tsx      # AI-generated signal explanation
      CapitalProtection.tsx   # Capital protection status
      SignalHistory.tsx       # Recent signal history
      Disclaimer.tsx          # Legal disclaimer
    pages/
      Landing.tsx             # Public landing page
      Dashboard.tsx           # Main trading dashboard (auth required)
      Profile.tsx             # User profile and stats
      Admin.tsx               # Admin panel
    hooks/
      use-auth.ts             # Authentication hook
    lib/
      queryClient.ts          # API request configuration
server/
  routes.ts                   # API endpoints
  storage.ts                  # Data storage and business logic
  consensus.ts                # Multi-AI consensus logic
  db.ts                       # Database connection
  replit_integrations/
    auth.ts                   # Replit Auth integration
shared/
  schema.ts                   # TypeScript types and Zod schemas
  models/
    auth.ts                   # User and session models
    trading.ts                # Subscription and prediction models
```

## API Endpoints
- `GET /api/dashboard/:pair?` - Dashboard data (prices, signal, metrics, history, protection)
- `POST /api/explain` - Generate AI explanation for current signal
- `POST /api/consensus` - Get multi-AI consensus from OpenAI, Anthropic, and Gemini
- `POST /api/predictions/take` - Record a trade prediction (auth required)
- `GET /api/predictions` - Get user's prediction history with stats
- `POST /api/predictions/process` - Process expired predictions
- `GET /api/subscription` - Get user's subscription status
- `GET /api/prices` - Get all price data
- `GET /api/signal/:pair` - Get signal for specific pair
- `GET /api/metrics/:pair` - Get market metrics for pair
- `GET /api/history` - Get signal history

## Key Features

### 1. Multi-AI Consensus System
- Queries OpenAI GPT-5.1, Anthropic Claude, and Google Gemini in parallel
- Requires 67%+ agreement for actionable signals
- Requires 70%+ average confidence
- Automatic NO_TRADE on conflicting BUY/SELL signals

### 2. Prediction Lifecycle with P/L Tracking
- Save predictions with entry price when user takes a trade
- Automatic exit price capture after exit window expires
- Calculate and display profit/loss percentage
- Store outcome with AI-generated reasoning

### 3. Subscription System
- First 1000 users get FREE access (10 signals/day)
- Pro plan: ₹1999/month for unlimited signals
- Real-time remaining signals display in header

### 4. Capital Management & Risk Protection
- User sets their trading capital amount
- AI calculates exact trade size (10% of capital)
- Stop-loss at 2% risk per trade
- Take-profit targets with 1:1.5 risk-reward ratio
- Floating AI help bubble for trading assistance

### 5. TradingView Integration
- Live charts for all 15 trading pairs
- Professional trading interface
- Candle timer showing next 1-minute candle close

### 6. Authentication
- Replit Auth for secure login
- User profile with trading statistics
- Admin panel for system monitoring

### 6. Signal Generation
- BUY/SELL/NO_TRADE based on aggregate confidence threshold (≥65%)
- Risk grading: LOW/MEDIUM/HIGH based on confidence and volatility
- Exit window: Time-based exit recommendations (5-25 minutes)
- Capital protection: Trade frequency limiter, volatility suppression

## Design System
- **Theme**: Dark mode by default (professional trading aesthetic)
- **Colors**: 
  - Success (BUY): Green (#22c55e)
  - Destructive (SELL): Red (#ef4444)
  - Warning (NO_TRADE): Amber (#eab308)
  - Primary: Blue (#3b82f6)
  - Pro Badge: Gold gradient
- **Typography**: Inter font family, JetBrains Mono for numbers

## Database Schema
- **users**: User accounts from Replit Auth
- **sessions**: Session management
- **subscriptions**: User subscription plans
- **predictions**: Trade predictions with outcomes

## Running the Application
The app runs on port 5000 with `npm run dev`. Frontend and backend are served together.

## Important Notes
- This is an educational tool, not financial advice
- No profit guarantees are made - system cannot guarantee "lossless" trades
- Uses simulated market data for demonstration
- LLM never generates predictions independently
- Multi-AI consensus significantly reduces false signals but cannot eliminate all losses
