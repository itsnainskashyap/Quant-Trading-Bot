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
