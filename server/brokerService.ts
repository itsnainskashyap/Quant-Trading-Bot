import ccxt, { Exchange } from 'ccxt';
import { db } from './db';
import { brokerConnections, tradexBalances, tradexTrades, type BrokerConnection, type TradexTrade, type TradexBalance } from '@shared/models/trading';
import { eq, and, desc } from 'drizzle-orm';

export const SUPPORTED_EXCHANGES = [
  { id: 'tradex', name: 'TradeX Broker', description: 'Virtual paper trading broker with AI-powered analysis', hasTestnet: false, needsPassphrase: false, isVirtual: true },
  { id: 'binance', name: 'Binance', description: 'World\'s largest crypto exchange', hasTestnet: true, needsPassphrase: false, isVirtual: false },
  { id: 'bybit', name: 'Bybit', description: 'Leading derivatives exchange', hasTestnet: true, needsPassphrase: false, isVirtual: false },
  { id: 'okx', name: 'OKX', description: 'Advanced trading platform', hasTestnet: true, needsPassphrase: true, isVirtual: false },
  { id: 'kucoin', name: 'KuCoin', description: 'People\'s exchange with 700+ coins', hasTestnet: true, needsPassphrase: true, isVirtual: false },
  { id: 'bitget', name: 'Bitget', description: 'Top crypto derivatives exchange', hasTestnet: true, needsPassphrase: true, isVirtual: false },
  { id: 'gateio', name: 'Gate.io', description: 'Secure & reliable exchange', hasTestnet: false, needsPassphrase: false, isVirtual: false },
  { id: 'kraken', name: 'Kraken', description: 'US-based trusted exchange', hasTestnet: false, needsPassphrase: false, isVirtual: false },
  { id: 'mexc', name: 'MEXC', description: 'Global crypto exchange', hasTestnet: false, needsPassphrase: false, isVirtual: false },
] as const;

export type SupportedExchange = typeof SUPPORTED_EXCHANGES[number]['id'];

const PAIR_MAPPING: Record<string, string> = {
  'BTC-USDT': 'BTC/USDT',
  'ETH-USDT': 'ETH/USDT',
  'SOL-USDT': 'SOL/USDT',
  'XRP-USDT': 'XRP/USDT',
  'DOGE-USDT': 'DOGE/USDT',
  'BNB-USDT': 'BNB/USDT',
  'ADA-USDT': 'ADA/USDT',
  'AVAX-USDT': 'AVAX/USDT',
  'DOT-USDT': 'DOT/USDT',
  'MATIC-USDT': 'MATIC/USDT',
  'LINK-USDT': 'LINK/USDT',
  'LTC-USDT': 'LTC/USDT',
  'SHIB-USDT': 'SHIB/USDT',
  'ATOM-USDT': 'ATOM/USDT',
  'UNI-USDT': 'UNI/USDT',
};

function createExchange(exchangeId: string, apiKey: string, apiSecret: string, passphrase?: string, testMode = true): Exchange {
  const ExchangeClass = (ccxt as any)[exchangeId];
  if (!ExchangeClass) {
    throw new Error(`Exchange ${exchangeId} not supported`);
  }

  const config: any = {
    apiKey,
    secret: apiSecret,
    enableRateLimit: true,
  };

  if (passphrase) {
    config.password = passphrase;
  }

  if (testMode) {
    config.sandbox = true;
  }

  return new ExchangeClass(config);
}

export async function getUserBrokerConnections(userId: string): Promise<BrokerConnection[]> {
  return db.select().from(brokerConnections).where(eq(brokerConnections.userId, userId));
}

export async function verifyBrokerOwnership(connectionId: string, userId: string): Promise<boolean> {
  const [connection] = await db.select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.id, connectionId), eq(brokerConnections.userId, userId)));
  return !!connection;
}

export async function addBrokerConnection(
  userId: string,
  exchange: string,
  apiKey: string,
  apiSecret: string,
  passphrase?: string,
  testMode = true
): Promise<{ success: boolean; connection?: BrokerConnection; error?: string }> {
  try {
    const exchangeInstance = createExchange(exchange, apiKey, apiSecret, passphrase, testMode);
    
    await exchangeInstance.fetchBalance();
    
    const [connection] = await db.insert(brokerConnections).values({
      userId,
      exchange,
      apiKey,
      apiSecret,
      passphrase: passphrase || null,
      testMode,
      isActive: true,
      autoTrade: false,
      lastConnected: new Date(),
    }).returning();

    return { success: true, connection };
  } catch (error: any) {
    console.error('Failed to add broker connection:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to connect to exchange. Please check your API credentials.' 
    };
  }
}

export async function testBrokerConnection(connectionId: string): Promise<{ success: boolean; balance?: any; error?: string }> {
  try {
    const [connection] = await db.select().from(brokerConnections).where(eq(brokerConnections.id, connectionId));
    
    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    const exchange = createExchange(
      connection.exchange,
      connection.apiKey,
      connection.apiSecret,
      connection.passphrase || undefined,
      connection.testMode || false
    );

    const balance = await exchange.fetchBalance();
    
    await db.update(brokerConnections)
      .set({ lastConnected: new Date() })
      .where(eq(brokerConnections.id, connectionId));

    const usdtBalance = balance.USDT || { free: 0, used: 0, total: 0 };
    
    return { 
      success: true, 
      balance: {
        USDT: usdtBalance,
        total: balance.total,
      }
    };
  } catch (error: any) {
    console.error('Failed to test broker connection:', error);
    return { success: false, error: error.message || 'Connection test failed' };
  }
}

export async function updateBrokerConnection(
  connectionId: string,
  updates: { autoTrade?: boolean; isActive?: boolean; testMode?: boolean }
): Promise<BrokerConnection | null> {
  const [updated] = await db.update(brokerConnections)
    .set(updates)
    .where(eq(brokerConnections.id, connectionId))
    .returning();
  
  return updated || null;
}

export async function deleteBrokerConnection(connectionId: string): Promise<boolean> {
  const result = await db.delete(brokerConnections).where(eq(brokerConnections.id, connectionId));
  return true;
}

export async function executeAutoTrade(
  userId: string,
  pair: string,
  signal: 'BUY' | 'SELL',
  tradeSize: number,
  entryPrice: number
): Promise<{ success: boolean; orders: any[]; errors: string[] }> {
  const orders: any[] = [];
  const errors: string[] = [];

  const connections = await db.select()
    .from(brokerConnections)
    .where(
      and(
        eq(brokerConnections.userId, userId),
        eq(brokerConnections.isActive, true),
        eq(brokerConnections.autoTrade, true)
      )
    );

  if (connections.length === 0) {
    return { success: true, orders: [], errors: [] };
  }

  const ccxtSymbol = PAIR_MAPPING[pair] || pair.replace('-', '/');

  for (const connection of connections) {
    try {
      const exchange = createExchange(
        connection.exchange,
        connection.apiKey,
        connection.apiSecret,
        connection.passphrase || undefined,
        connection.testMode || false
      );

      await exchange.loadMarkets();
      
      const amount = tradeSize / entryPrice;
      
      const order = await exchange.createMarketOrder(
        ccxtSymbol,
        signal.toLowerCase() as 'buy' | 'sell',
        amount
      );

      orders.push({
        exchange: connection.exchange,
        orderId: order.id,
        symbol: ccxtSymbol,
        side: signal,
        amount: order.amount,
        price: order.price || entryPrice,
        status: order.status,
      });

      console.log(`[AutoTrade] ${connection.exchange}: ${signal} ${amount} ${ccxtSymbol} - Order ID: ${order.id}`);
    } catch (error: any) {
      console.error(`[AutoTrade] ${connection.exchange} error:`, error);
      errors.push(`${connection.exchange}: ${error.message}`);
    }
  }

  return {
    success: orders.length > 0 || errors.length === 0,
    orders,
    errors,
  };
}

export async function getPortfolioBalances(userId: string): Promise<{
  exchanges: Array<{
    exchange: string;
    testMode: boolean;
    balances: Record<string, { free: number; used: number; total: number }>;
    totalUSDT: number;
    error?: string;
  }>;
  totalBalance: number;
}> {
  const connections = await db.select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.userId, userId), eq(brokerConnections.isActive, true)));

  const results: Array<{
    exchange: string;
    testMode: boolean;
    balances: Record<string, { free: number; used: number; total: number }>;
    totalUSDT: number;
    error?: string;
  }> = [];
  let totalBalance = 0;

  for (const connection of connections) {
    try {
      const exchange = createExchange(
        connection.exchange,
        connection.apiKey,
        connection.apiSecret,
        connection.passphrase || undefined,
        connection.testMode || false
      );

      const balance = await exchange.fetchBalance();
      const usdtBalance = balance.USDT?.total || 0;
      
      const filteredBalances: Record<string, { free: number; used: number; total: number }> = {};
      for (const [currency, bal] of Object.entries(balance)) {
        if (bal && typeof bal === 'object' && 'total' in bal && (bal as any).total > 0) {
          filteredBalances[currency] = bal as any;
        }
      }

      results.push({
        exchange: connection.exchange,
        testMode: connection.testMode || false,
        balances: filteredBalances,
        totalUSDT: usdtBalance,
      });
      totalBalance += usdtBalance;
    } catch (error: any) {
      results.push({
        exchange: connection.exchange,
        testMode: connection.testMode || false,
        balances: {},
        totalUSDT: 0,
        error: error.message,
      });
    }
  }

  return { exchanges: results, totalBalance };
}

export async function executeTradeWithStopLoss(
  userId: string,
  pair: string,
  signal: 'BUY' | 'SELL',
  tradeSize: number,
  entryPrice: number,
  stopLossPrice: number,
  takeProfitPrice: number,
  leverage?: number
): Promise<{ success: boolean; orders: any[]; errors: string[] }> {
  const orders: any[] = [];
  const errors: string[] = [];

  const connections = await db.select()
    .from(brokerConnections)
    .where(
      and(
        eq(brokerConnections.userId, userId),
        eq(brokerConnections.isActive, true),
        eq(brokerConnections.autoTrade, true)
      )
    );

  if (connections.length === 0) {
    return { success: true, orders: [], errors: [] };
  }

  const ccxtSymbol = PAIR_MAPPING[pair] || pair.replace('-', '/');

  for (const connection of connections) {
    try {
      const exchange = createExchange(
        connection.exchange,
        connection.apiKey,
        connection.apiSecret,
        connection.passphrase || undefined,
        connection.testMode || false
      );

      await exchange.loadMarkets();
      
      const amount = tradeSize / entryPrice;
      
      // Set leverage if supported
      if (leverage && leverage > 1) {
        try {
          await (exchange as any).setLeverage(leverage, ccxtSymbol);
        } catch (e) {
          console.log(`[AutoTrade] ${connection.exchange}: Leverage not supported or failed`);
        }
      }

      // Place main market order
      const mainOrder = await exchange.createMarketOrder(
        ccxtSymbol,
        signal.toLowerCase() as 'buy' | 'sell',
        amount
      );

      orders.push({
        exchange: connection.exchange,
        type: 'ENTRY',
        orderId: mainOrder.id,
        symbol: ccxtSymbol,
        side: signal,
        amount: mainOrder.amount,
        price: mainOrder.price || entryPrice,
        status: mainOrder.status,
      });

      // Place stop-loss order
      try {
        const slSide = signal === 'BUY' ? 'sell' : 'buy';
        const slOrder = await exchange.createOrder(
          ccxtSymbol,
          'stop_market',
          slSide,
          amount,
          undefined,
          { stopPrice: stopLossPrice, reduceOnly: true }
        );
        orders.push({
          exchange: connection.exchange,
          type: 'STOP_LOSS',
          orderId: slOrder.id,
          symbol: ccxtSymbol,
          side: slSide.toUpperCase(),
          amount: slOrder.amount,
          stopPrice: stopLossPrice,
          status: slOrder.status,
        });
      } catch (slError: any) {
        console.log(`[AutoTrade] ${connection.exchange}: Stop-loss order failed - ${slError.message}`);
      }

      // Place take-profit order
      try {
        const tpSide = signal === 'BUY' ? 'sell' : 'buy';
        const tpOrder = await exchange.createOrder(
          ccxtSymbol,
          'take_profit_market',
          tpSide,
          amount,
          undefined,
          { stopPrice: takeProfitPrice, reduceOnly: true }
        );
        orders.push({
          exchange: connection.exchange,
          type: 'TAKE_PROFIT',
          orderId: tpOrder.id,
          symbol: ccxtSymbol,
          side: tpSide.toUpperCase(),
          amount: tpOrder.amount,
          stopPrice: takeProfitPrice,
          status: tpOrder.status,
        });
      } catch (tpError: any) {
        console.log(`[AutoTrade] ${connection.exchange}: Take-profit order failed - ${tpError.message}`);
      }

      console.log(`[AutoTrade] ${connection.exchange}: ${signal} ${amount} ${ccxtSymbol} with SL/TP`);
    } catch (error: any) {
      console.error(`[AutoTrade] ${connection.exchange} error:`, error);
      errors.push(`${connection.exchange}: ${error.message}`);
    }
  }

  return { success: orders.length > 0 || errors.length === 0, orders, errors };
}

export async function getOpenPositions(userId: string): Promise<{
  positions: Array<{
    exchange: string;
    symbol: string;
    side: string;
    amount: number;
    entryPrice: number;
    markPrice: number;
    unrealizedPnl: number;
    leverage: number;
  }>;
  totalPnl: number;
}> {
  const connections = await db.select()
    .from(brokerConnections)
    .where(and(eq(brokerConnections.userId, userId), eq(brokerConnections.isActive, true)));

  const positions: Array<{
    exchange: string;
    symbol: string;
    side: string;
    amount: number;
    entryPrice: number;
    markPrice: number;
    unrealizedPnl: number;
    leverage: number;
  }> = [];
  let totalPnl = 0;

  for (const connection of connections) {
    try {
      const exchange = createExchange(
        connection.exchange,
        connection.apiKey,
        connection.apiSecret,
        connection.passphrase || undefined,
        connection.testMode || false
      );

      if (exchange.has['fetchPositions']) {
        const openPositions = await exchange.fetchPositions();
        for (const pos of openPositions) {
          if (pos.contracts && pos.contracts > 0) {
            const unrealizedPnl = pos.unrealizedPnl || 0;
            positions.push({
              exchange: connection.exchange,
              symbol: pos.symbol,
              side: pos.side || 'long',
              amount: pos.contracts,
              entryPrice: pos.entryPrice || 0,
              markPrice: pos.markPrice || 0,
              unrealizedPnl,
              leverage: pos.leverage || 1,
            });
            totalPnl += unrealizedPnl;
          }
        }
      }
    } catch (error: any) {
      console.error(`[Positions] ${connection.exchange} error:`, error.message);
    }
  }

  return { positions, totalPnl };
}

export function calculateOptimalTradeSize(
  totalBalance: number,
  riskPercent: number = 2,
  leverage: number = 1,
  confidence: number = 75
): { tradeSize: number; suggestedLeverage: number; riskAmount: number } {
  // Risk-based position sizing
  const riskAmount = totalBalance * (riskPercent / 100);
  const baseSize = totalBalance * 0.1; // 10% max position size
  
  // Adjust based on confidence
  const confidenceMultiplier = Math.min(confidence / 100, 1);
  const adjustedSize = baseSize * confidenceMultiplier;
  
  // Suggest leverage based on confidence
  let suggestedLeverage = 1;
  if (confidence >= 85) suggestedLeverage = Math.min(leverage, 5);
  else if (confidence >= 80) suggestedLeverage = Math.min(leverage, 3);
  else if (confidence >= 75) suggestedLeverage = Math.min(leverage, 2);
  
  return {
    tradeSize: Math.min(adjustedSize, totalBalance * 0.15),
    suggestedLeverage,
    riskAmount,
  };
}

// ============ TradeX Virtual Broker Functions ============

export async function getTradexBalance(userId: string): Promise<TradexBalance | null> {
  const [balance] = await db.select().from(tradexBalances).where(eq(tradexBalances.userId, userId));
  return balance || null;
}

export async function createOrUpdateTradexBalance(userId: string, amount: number): Promise<TradexBalance> {
  const existing = await getTradexBalance(userId);
  
  if (existing) {
    const [updated] = await db.update(tradexBalances)
      .set({ balance: amount, updatedAt: new Date() })
      .where(eq(tradexBalances.userId, userId))
      .returning();
    return updated;
  } else {
    const [created] = await db.insert(tradexBalances)
      .values({ userId, balance: amount })
      .returning();
    return created;
  }
}

export async function addToTradexBalance(userId: string, amount: number): Promise<TradexBalance> {
  const existing = await getTradexBalance(userId);
  const currentBalance = existing?.balance || 0;
  return createOrUpdateTradexBalance(userId, currentBalance + amount);
}

export async function getTradexOpenTrades(userId: string): Promise<TradexTrade[]> {
  return db.select()
    .from(tradexTrades)
    .where(and(eq(tradexTrades.userId, userId), eq(tradexTrades.status, 'OPEN')))
    .orderBy(desc(tradexTrades.createdAt));
}

export async function getTradexTradeHistory(userId: string, limit: number = 50): Promise<TradexTrade[]> {
  return db.select()
    .from(tradexTrades)
    .where(eq(tradexTrades.userId, userId))
    .orderBy(desc(tradexTrades.createdAt))
    .limit(limit);
}

export async function openTradexTrade(
  userId: string,
  pair: string,
  signal: 'BUY' | 'SELL',
  entryPrice: number,
  amount: number,
  leverage: number = 1,
  stopLoss?: number,
  takeProfit?: number
): Promise<{ success: boolean; trade?: TradexTrade; error?: string }> {
  try {
    // Check balance
    const balance = await getTradexBalance(userId);
    if (!balance || balance.balance < amount) {
      return { success: false, error: 'Insufficient TradeX balance' };
    }

    // Deduct from balance
    await createOrUpdateTradexBalance(userId, balance.balance - amount);

    // Create trade
    const [trade] = await db.insert(tradexTrades).values({
      userId,
      pair,
      signal,
      entryPrice,
      currentPrice: entryPrice,
      amount,
      leverage,
      stopLoss,
      takeProfit,
      status: 'OPEN',
    }).returning();

    return { success: true, trade };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTradexTrade(
  tradeId: string,
  updates: {
    currentPrice?: number;
    aiStopLoss?: number;
    aiTakeProfit?: number;
    aiRecommendation?: string;
    aiAnalysis?: string;
    profitLoss?: number;
    profitLossPercent?: number;
  }
): Promise<TradexTrade | null> {
  const [updated] = await db.update(tradexTrades)
    .set({ ...updates, lastUpdated: new Date() })
    .where(eq(tradexTrades.id, tradeId))
    .returning();
  return updated || null;
}

export async function closeTradexTrade(
  tradeId: string,
  userId: string,
  exitPrice: number,
  closeReason: string
): Promise<{ success: boolean; trade?: TradexTrade; error?: string }> {
  try {
    // Get trade
    const [trade] = await db.select().from(tradexTrades).where(
      and(eq(tradexTrades.id, tradeId), eq(tradexTrades.userId, userId))
    );

    if (!trade) {
      return { success: false, error: 'Trade not found' };
    }

    if (trade.status !== 'OPEN') {
      return { success: false, error: 'Trade is already closed' };
    }

    // Calculate P/L
    const priceDiff = trade.signal === 'BUY' 
      ? exitPrice - trade.entryPrice 
      : trade.entryPrice - exitPrice;
    const percentChange = (priceDiff / trade.entryPrice) * 100 * trade.leverage;
    const profitLoss = trade.amount * (percentChange / 100);
    
    // Return funds + profit/loss to balance
    const balance = await getTradexBalance(userId);
    const returnAmount = trade.amount + profitLoss;
    await createOrUpdateTradexBalance(userId, (balance?.balance || 0) + Math.max(0, returnAmount));

    // Update trade status
    const [closedTrade] = await db.update(tradexTrades)
      .set({
        status: profitLoss >= 0 ? 'PROFIT_TAKEN' : 'STOPPED',
        currentPrice: exitPrice,
        profitLoss,
        profitLossPercent: percentChange,
        closeReason,
        closedAt: new Date(),
        lastUpdated: new Date(),
      })
      .where(eq(tradexTrades.id, tradeId))
      .returning();

    return { success: true, trade: closedTrade };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTradexTradeById(tradeId: string, userId: string): Promise<TradexTrade | null> {
  const [trade] = await db.select().from(tradexTrades).where(
    and(eq(tradexTrades.id, tradeId), eq(tradexTrades.userId, userId))
  );
  return trade || null;
}
