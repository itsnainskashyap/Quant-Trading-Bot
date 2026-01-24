import ccxt, { Exchange } from 'ccxt';
import { db } from './db';
import { brokerConnections, type BrokerConnection } from '@shared/models/trading';
import { eq, and } from 'drizzle-orm';

export const SUPPORTED_EXCHANGES = [
  { id: 'binance', name: 'Binance', logo: '🟡', hasTestnet: true, needsPassphrase: false },
  { id: 'bybit', name: 'Bybit', logo: '🟠', hasTestnet: true, needsPassphrase: false },
  { id: 'okx', name: 'OKX', logo: '⚫', hasTestnet: true, needsPassphrase: true },
  { id: 'kucoin', name: 'KuCoin', logo: '🟢', hasTestnet: true, needsPassphrase: true },
  { id: 'bitget', name: 'Bitget', logo: '🔵', hasTestnet: true, needsPassphrase: true },
  { id: 'gateio', name: 'Gate.io', logo: '🔴', hasTestnet: false, needsPassphrase: false },
  { id: 'kraken', name: 'Kraken', logo: '🟣', hasTestnet: false, needsPassphrase: false },
  { id: 'mexc', name: 'MEXC', logo: '🔷', hasTestnet: false, needsPassphrase: false },
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
