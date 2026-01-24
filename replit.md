# TradeX AI - AI-Assisted Trading Decision Platform

## Overview
TradeX AI is a probability-based trading decision platform that helps users decide whether to BUY, SELL, or SKIP trades on 15 cryptocurrency pairs. The system focuses on capital protection over profit maximization with strict risk management (2% risk per trade, 10% max position size).

**Multi-AI Consensus System** - Uses 3 world-class AI providers (OpenAI GPT-4o, Anthropic Claude, Google Gemini) voting together for maximum signal quality and reduced false signals. Ultra-conservative approach requiring 75%+ average confidence and multi-indicator confluence for actionable signals.

**Supported Pairs**: BTC, ETH, SOL, XRP, DOGE, BNB, ADA, AVAX, DOT, MATIC, LINK, LTC, SHIB, ATOM, UNI

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Authentication**: Replit Auth (OpenID Connect)
- **Styling**: Tailwind CSS with custom dark trading theme
- **State Management**: TanStack Query (React Query)
- **AI/LLM Providers**: 
  - OpenAI GPT-4o (via Replit AI Integrations)
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
      BacktestStats.tsx       # Backtesting performance statistics
      TechnicalIndicators.tsx # Real-time technical indicators display
      NotificationBanner.tsx  # Signal notifications with browser alerts
      BrokerSettings.tsx      # Exchange connection management (8 exchanges supported)
      PortfolioDashboard.tsx  # Multi-exchange portfolio with balance aggregation
      LiveTradeAnalyzer.tsx   # Real-time trade monitoring with P&L tracking
      TradeAutomationSettings.tsx # User trading preferences (leverage, SL/TP, risk)
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
  priceService.ts             # Real-time price fetching from CoinGecko API
  technicalIndicators.ts      # Technical indicator calculations (RSI, MACD, Bollinger)
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
- `GET /api/backtest-stats` - Get backtesting performance statistics
- `GET /api/indicators/:pair` - Get technical indicators for a specific pair
- `GET /api/brokers/supported` - Get list of supported exchanges
- `GET /api/brokers` - Get user's broker connections (masked API keys)
- `POST /api/brokers/connect` - Add new exchange connection
- `POST /api/brokers/:id/test` - Test broker connection and get balance
- `PATCH /api/brokers/:id` - Update broker settings (autoTrade, isActive, testMode)
- `DELETE /api/brokers/:id` - Remove broker connection
- `GET /api/portfolio` - Get aggregated portfolio balances from all exchanges
- `GET /api/positions` - Get open positions across all exchanges
- `POST /api/trade-suggestion` - Get AI-powered trade size and leverage suggestions

## Key Features

### 1. Multi-AI Consensus System
- Queries OpenAI GPT-4o, Anthropic Claude, and Google Gemini in parallel
- Requires 67%+ agreement for actionable signals
- Requires 70%+ average confidence
- Automatic NO_TRADE on conflicting BUY/SELL signals

### 2. Prediction Lifecycle with P/L Tracking
- Save predictions with entry price when user takes a trade
- Automatic exit price capture after exit window expires
- Calculate and display profit/loss percentage
- Store outcome with AI-generated reasoning

### 3. 100% FREE Platform
- Completely free access for all users
- Unlimited trading signals with no daily limits
- No subscription plans or Pro tiers required

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

### 7. Signal Generation (Ultra-Conservative)
- BUY/SELL only when ALL conditions are met:
  - 75%+ average confidence across all AI providers
  - 65%+ minimum confidence from every provider
  - No HIGH risk flags from any provider
  - No conflicting BUY/SELL signals
  - 5+ technical indicators in confluence
- Risk grading: LOW/MEDIUM/HIGH based on confidence and volatility
- Exit window: Time-based exit recommendations (3-10 minutes)
- Capital protection: Trade frequency limiter, volatility suppression

### 8. Real-Time Market Data
- CoinGecko API integration for live cryptocurrency prices
- 15-second price refresh with rate limit compliance
- Fallback to cached data if API is unavailable
- 24h price change, high/low, and volume tracking

### 9. Advanced Technical Indicators (Multi-Confluence System)
- RSI (14-period) with oversold/overbought signals
- Stochastic Oscillator (14, 3) with K/D crossovers
- Williams %R for extreme conditions
- MACD (12, 26, 9) with trend direction, histogram, and crossover detection
- Bollinger Bands (20-period, 2 std) with squeeze detection
- SMA 20/50/200 with Golden Cross/Death Cross detection
- EMA 12/26/50 for trend confirmation
- ADX for trend strength measurement
- ROC (Rate of Change) for momentum
- ATR and ATR% for volatility measurement
- Support/Resistance level detection
- Confluence scoring: requires 5+ aligned indicators for signals
- Reliability score based on data quality and indicator agreement

### 10. Backtesting Statistics
- Historical win rate tracking (target: 72%+)
- Profit factor calculation
- Sharpe ratio analysis
- Maximum drawdown monitoring
- Average trade duration

### 11. Signal Notifications
- Browser push notifications for new BUY/SELL signals
- Permission request on first interaction
- Notification history in dashboard
- Real-time signal change detection

### 12. Multi-Exchange Broker Integration
- CCXT library integration supporting 8 major exchanges
- Supported: Binance, Bybit, OKX, KuCoin, Bitget, Gate.io, Kraken, MEXC
- Secure API key storage with masked preview in UI
- Test mode (sandbox) support for safe testing
- Auto-trade execution when user takes signals
- Automatic stop-loss and take-profit order placement
- Ownership verification for all broker operations

### 13. Portfolio Dashboard
- Aggregated balance view across all connected exchanges
- Real-time balance fetching from each exchange
- Total portfolio value in USDT
- Per-exchange balance breakdown
- Open positions tracking with unrealized P&L

### 14. Live Trade Analyzer
- Real-time P&L tracking after taking trades
- Visual progress bar showing position relative to SL/TP
- AI-powered trade recommendations (HOLD, TRAILING_STOP, CLOSE_PROFIT, CLOSE_LOSS)
- Time-in-trade monitoring
- Risk/reward ratio calculation

### 15. AI Trade Suggestions
- Portfolio-based trade size calculation
- Risk-adjusted position sizing (2% max risk)
- Confidence-based leverage suggestions
- Automatic trade size optimization

### 16. Trade Automation Settings
- Configurable default leverage (1x-20x)
- Auto stop-loss with customizable percentage
- Auto take-profit with customizable percentage
- Trailing stop support
- Maximum daily trades limit
- Minimum confidence threshold

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
- TRADE AT YOUR OWN RISK - This is not financial advice
- No profit guarantees are made - system cannot guarantee "lossless" trades
- Uses real-time market data from CoinGecko API (free tier, 15-second refresh)
- LLM never generates predictions independently
- Multi-AI consensus significantly reduces false signals but cannot eliminate all losses
- Technical indicators are calculated from real price history stored in memory
- Backtesting statistics are calculated from actual prediction records when available
