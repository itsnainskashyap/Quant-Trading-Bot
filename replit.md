# TradeX AI - AI-Assisted Trading Decision Platform

## Overview
TradeX AI is a probability-based trading decision platform designed to assist users in making informed BUY, SELL, or SKIP decisions for 15 cryptocurrency pairs. The platform prioritizes capital protection and strict risk management (2% risk per trade, 10% max position size) over profit maximization. It employs a Multi-AI Consensus System, leveraging three leading AI providers (OpenAI GPT-4o, Anthropic Claude, Google Gemini) to reduce false signals and enhance signal quality, requiring high confidence and multi-indicator confluence for actionable signals. The project's vision is to provide a robust, AI-driven tool for traders seeking conservative yet effective strategies in the volatile cryptocurrency market.

## User Preferences
I prefer iterative development with clear explanations for any significant architectural or design choices. Before making major changes, please ask for confirmation. I value clear, concise communication and well-documented code. I expect the agent to adhere to the established risk management principles (2% risk per trade, 10% max position size) when suggesting or executing trades.

## System Architecture
TradeX AI is built with a React + TypeScript + Vite frontend, an Express.js + TypeScript backend, and a PostgreSQL database utilizing Drizzle ORM. Authentication is handled via Replit Auth (OpenID Connect). Styling uses Tailwind CSS with a custom dark trading theme. TanStack Query manages state.

**UI/UX Decisions:**
The platform features a unified Resend.com-inspired pure black theme (`bg-black`) across ALL pages - Landing, Login, Register, Home (Dashboard), Trade, Wallet, Profile, KYC, Admin, Personalize, Plans, Payment. Clean typography (light weight headings, italic accents, neutral color palette). Cards use `bg-white/[0.03]` with `border-white/[0.06]`, inputs use `bg-white/[0.04]` with `border-white/[0.08]`. Primary buttons are white with black text. Landing page has a metallic 3D Rubik's cube (canvas, Phong shading with specular highlights, silver/chrome material, mouse-responsive, IntersectionObserver for performance), live price ticker, and grid-based section layouts. Functional colors: green for BUY, red for SELL, amber for NO_TRADE, emerald for success. Non-functional UI accents use `text-neutral-400`/`text-neutral-500`. Dashboard has mobile-first responsive layout with mobile balance bar (hidden on md+). All pages are fully mobile-compatible. Typography uses Inter font family with JetBrains Mono for numerical data. TradingView Advanced Charts for live data visualization.

**Routing Structure:**
- `/` or `/dashboard` → `Home.tsx` (PrimeXBT-inspired account overview with total funds, donut chart, action buttons, trading accounts, active trades, history, markets overview, profile dropdown with KYC/plan status)
- `/trade` → `Dashboard.tsx` (full trading interface with AI consensus, charts, manual trading)
- `/` (unauthenticated) → `Landing.tsx` (marketing page with 3D cube)
- Both Home and Trade pages share a consistent navigation header (Dashboard/Trade/Wallet tabs, deposit button, profile/logout)

**Technical Implementations & Feature Specifications:**
- **Multi-AI Consensus System:** Queries OpenAI GPT-4o, Anthropic Claude, and Google Gemini in parallel, requiring 67%+ agreement and 70%+ average confidence for actionable signals, with automatic NO_TRADE on conflicts.
- **Prediction Lifecycle:** Tracks user predictions with entry/exit prices and calculates P/L.
- **Capital Management & Risk Protection:** Implements dynamic AI-based position sizing (5-15% based on confidence), stop-loss at 2% risk, and take-profit targets with a 1:1.5 risk-reward ratio. Includes a TradeX Virtual Broker for paper trading with dynamic SL/TP and AI position adjustment suggestions.
- **TradingView Integration:** Provides live charts and candle timers.
- **Crypto Payment System:** Supports TRC20 (TRON) and BEP20 (BSC) networks for Pro subscription payments, with blockchain verification. Includes promo code system for discounts (admin-managed codes with percentage discounts, max uses, and usage tracking).
- **Deposit/Withdraw System:** Comprehensive wallet system supporting crypto deposits (BTC, ETH, USDT, LTC, USDC across multiple chains), UPI deposits, IMPS deposits, Skrill deposits (email + transaction ID), and Volet deposits (email + transaction ID) with INR→USDT conversion (92 INR = 1 USDT). Withdrawal methods: crypto, UPI, IMPS (bank details), Binance Pay (locked ID after first use — fetched from `/api/user/binance-pay-id`), and Wire Transfer (bank name, account holder, account number, SWIFT/BIC, IBAN). Admin-managed payment methods, deposit/withdrawal approval workflow with status transitions (pending→processing→approved/rejected), idempotent state machine for balance integrity, transactional withdrawal deductions. Admin wallet routes require `x-admin-session` header auth. Frontend: `/wallet` route with Deposit/Withdraw/History tabs showing all payment type details. Dashboard header shows USDT wallet balance with link to wallet page. Visual crypto/chain logo selectors using cryptologos.cc CDN images. Inline SVG logos for Skrill (purple), Volet (cyan), Binance (yellow), Wire Transfer (blue). UPI/IMPS logos from attached assets.
- **KYC Verification System:** AI-powered document data extraction using OpenAI GPT-4o Vision, with instant auto-verification at 85%+ confidence (isValid=true, docNumber+name extracted) and admin manual verification fallback for low-confidence docs. Supports Aadhaar Card, PAN Card, Voter ID, and Government ID. AI extracts name, DOB, document number, gender, address from uploaded front-side document. Front and back image upload supported (`documentImage` + `documentImageBack` columns). Duplicate document detection: if the same document number (normalized, case-insensitive) has been submitted by any other user, submission is rejected. KYC is mandatory before making deposits. Admin KYC management shows both front/back images. Routes: `/api/kyc/status`, `/api/kyc/submit`, `/api/admin/kyc`, `/api/admin/kyc/:id/action`. Frontend: `/kyc` route. Schema: `kyc_documents` table in trading.ts.
- **Manual Trade Section:** Dashboard component for direct BUY/SELL trades without AI analysis. Uses TradeX paper trading balance (not wallet balance). Supports leverage options (1x/2x/5x/10x) with leverage sent as separate param (amount is unleveraged margin). Quick percentage buttons (25/50/75/100%) for position sizing. Disabled when price is unavailable.
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
- **Email:** Resend SDK (`resend` package) for transactional emails — welcome, login alerts, forgot password OTP, withdrawal OTP, deposit/withdrawal status updates, KYC status notifications. Uses `RESEND_API_KEY` secret. Sandbox FROM: `TradeX AI <onboarding@resend.dev>`. Email service in `server/emailService.ts`. OTP codes stored in `email_otp_codes` table (hashed, with expiry + purpose). Forgot password flow: `/forgot-password` page (3-step: email → OTP → new password). Withdrawal OTP flow: Wallet.tsx sends OTP → verifies → gets token → submits withdrawal with token.