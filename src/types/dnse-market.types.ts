/**
 * DNSE Market Data Types
 * Based on DNSE MDDS System - KRX v1.4
 */

// Authentication types
export interface DNSECredentials {
  username: string;
  password: string;
}

export interface DNSEAuthResponse {
  token: string;
  expiresIn?: number;
}

export interface DNSEInvestorInfo {
  investorId: string | number;
  name?: string;
  custodyCode?: string;
  mobile?: string;
  email?: string;
}

// Market data message types based on DNSE documentation
export interface TickMessage {
  marketId: number;
  boardId: number;
  symbol: string;
  matchPrice: number;
  matchQtty: number;
  side: 'BUY' | 'SELL';
  tradingSessionId: number;
  sendingTime: string;
  totalVolume?: string;
  totalValue?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
}

export interface TopPriceMessage {
  marketId: number;
  boardId: number;
  symbol: string;
  bidPrices: Array<{
    price: number;
    quantity: number;
    numberOfOrders?: number;
  }>;
  askPrices: Array<{
    price: number;
    quantity: number;
    numberOfOrders?: number;
  }>;
  sendingTime: string;
  tradingSessionId: number;
}

export interface BoardEventMessage {
  marketId: number;
  boardId: number;
  eventCode: string;
  eventName?: string;
  eventTime: string;
  description?: string;
}

export interface OHLCMessage {
  marketId: number;
  boardId: number;
  symbol: string;
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h' | '1d';
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

export interface MarketIndexMessage {
  indexCode: string;
  indexName: string;
  value: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

// Subscription types
export interface SubscriptionRequest {
  symbols: string[];
  dataTypes?: Array<'tick' | 'top_price' | 'board_event' | 'ohlc'>;
}

// Market snapshot (cached data)
export interface MarketSnapshot {
  symbol: string;
  lastPrice: number;
  lastVolume: number;
  lastTime: string;
  totalVolume: string;
  totalValue: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  change: number;
  changePercent: number;
  bestBid?: number;
  bestBidVolume?: number;
  bestAsk?: number;
  bestAskVolume?: number;
  averagePrice?: number;
  tradingStatus?: string;
}

// MQTT Topic patterns based on DNSE documentation
export const TOPIC_PATTERNS = {
  TICK: 'plaintext/quotes/krx/mdds/tick/v1/roundlot/symbol/{symbol}',
  TOP_PRICE: 'plaintext/quotes/krx/mdds/top_price/v1/roundlot/symbol/{symbol}',
  BOARD_EVENT: 'plaintext/quotes/krx/mdds/board_event/v1/{boardId}',
  OHLC: 'plaintext/quotes/krx/mdds/ohlc/v1/{timeframe}/symbol/{symbol}',
  MARKET_INDEX: 'plaintext/quotes/krx/mdds/index/v1/{indexCode}'
};

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}