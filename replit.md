# TradeX AI - AI-Assisted Trading Decision Platform

## Overview
TradeX AI is a probability-based trading decision platform designed to assist users in making informed BUY, SELL, or SKIP decisions for 15 cryptocurrency pairs. The platform prioritizes capital protection and strict risk management (2% risk per trade, 10% max position size) over profit maximization. It employs a Multi-AI Consensus System, leveraging three leading AI providers (OpenAI GPT-4o, Anthropic Claude, Google Gemini) to reduce false signals and enhance signal quality, requiring high confidence and multi-indicator confluence for actionable signals. The project's vision is to provide a robust, AI-driven tool for traders seeking conservative yet effective strategies in the volatile cryptocurrency market.

## User Preferences
I prefer iterative development with clear explanations for any significant architectural or design choices. Before making major changes, please ask for confirmation. I value clear, concise communication and well-documented code. I expect the agent to adhere to the established risk management principles (2% risk per trade, 10% max position size) when suggesting or executing trades.

## System Architecture
TradeX AI is built with a React + TypeScript + Vite frontend, an Express.js + TypeScript backend, and a PostgreSQL database utilizing Drizzle ORM. Authentication is handled via Replit Auth (OpenID Connect). Styling uses Tailwind CSS with a custom dark trading theme. TanStack Query manages state.

**UI/UX Decisions:**
The platform features a dark mode theme with a professional trading aesthetic. Key colors are green for BUY, red for SELL, amber for NO_TRADE, and blue as a primary color. Typography uses the Inter font family, with JetBrains Mono for numerical data. The interface includes TradingView Advanced Charts for live data visualization.

**Technical Implementations & Feature Specifications:**
- **Multi-AI Consensus System:** Queries OpenAI GPT-4o, Anthropic Claude, and Google Gemini in parallel, requiring 67%+ agreement and 70%+ average confidence for actionable signals, with automatic NO_TRADE on conflicts.
- **Prediction Lifecycle:** Tracks user predictions with entry/exit prices and calculates P/L.
- **Capital Management & Risk Protection:** Implements dynamic AI-based position sizing (5-15% based on confidence), stop-loss at 2% risk, and take-profit targets with a 1:1.5 risk-reward ratio. Includes a TradeX Virtual Broker for paper trading with dynamic SL/TP and AI position adjustment suggestions.
- **TradingView Integration:** Provides live charts and candle timers.
- **Crypto Payment System:** Supports TRC20 (TRON) and BEP20 (BSC) networks for Pro subscription payments, with blockchain verification. Includes promo code system for discounts (admin-managed codes with percentage discounts, max uses, and usage tracking).
- **Signal Generation:** Ultra-conservative approach requiring 75%+ average confidence, 65%+ minimum from each provider, no high-risk flags, no conflicting signals, and 5+ technical indicators in confluence.
- **Real-Time Market Data:** Fetches live cryptocurrency prices from CoinGecko API.
- **Advanced Technical Indicators:** Calculates and uses RSI, Stochastic, Williams %R, MACD, Bollinger Bands, SMAs, EMAs, ADX, ROC, ATR, and Support/Resistance for multi-confluence scoring.
- **Backtesting Statistics:** Tracks historical win rate, profit factor, Sharpe ratio, and maximum drawdown.
- **Signal Notifications:** Browser push notifications for new signals.
- **Multi-Exchange Broker Integration:** Supports 8 major exchanges via CCXT for secure API key storage, auto-trade execution, and order placement.
- **Portfolio Dashboard:** Aggregates balances and open positions across connected exchanges.
- **Live Trade Analyzer:** Real-time P&L tracking, visual progress bars, and AI-powered trade recommendations (HOLD, TRAILING_STOP, CLOSE_PROFIT, CLOSE_LOSS).
- **AI Trade Suggestions:** Provides portfolio-based trade size, risk-adjusted position sizing, and confidence-based leverage suggestions.
- **Trade Automation Settings:** Configurable default leverage, auto stop-loss/take-profit, trailing stop, and max daily trades.
- **Smart Trade Exit Management:** Features an exit timer, auto-close functionality, and AI-driven time extensions based on trade profitability and recoverability.
- **Multi-AI Trade Automation:** A server-side process with Risk AI (GPT-4o), Exit AI (Claude), and Momentum AI (Gemini) making autonomous, consensus-based trade decisions.
- **Find Trade (Pro):** Continuous auto-scan feature that runs for up to 30 minutes until a 90%+ confidence BUY or SELL signal is found. Uses all 5 AI agents for maximum accuracy.

## External Dependencies
- **AI/LLM Providers:** OpenAI GPT-4o, Anthropic Claude, Google Gemini (all via Replit AI Integrations)
- **Database:** PostgreSQL
- **Authentication:** Replit Auth (OpenID Connect)
- **Charts:** TradingView Advanced Charts
- **Market Data:** CoinGecko API
- **Blockchain Verification (Crypto Payments):** TronGrid API, BscScan API
- **Exchange Integration:** CCXT library (for Binance, Bybit, OKX, KuCoin, Bitget, Gate.io, Kraken, MEXC)