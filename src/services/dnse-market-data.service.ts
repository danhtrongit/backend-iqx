/**
 * DNSE Market Data Service
 * Manages real-time market data processing, caching, and distribution
 */

import { EventEmitter } from 'events';
import { FastifyBaseLogger } from 'fastify';
import { MQTTClientService } from './mqtt-client.service';
import {
  TickMessage,
  TopPriceMessage,
  BoardEventMessage,
  OHLCMessage,
  MarketSnapshot,
  SubscriptionRequest
} from '../types/dnse-market.types';

interface SymbolData {
  lastTick?: TickMessage;
  orderBook?: TopPriceMessage;
  ohlc?: Map<string, OHLCMessage>;
  snapshot?: MarketSnapshot;
  lastUpdate: Date;
}

export interface MarketDataEvents {
  'snapshot': (data: MarketSnapshot) => void;
  'tick': (data: TickMessage) => void;
  'top_price': (data: TopPriceMessage) => void;
  'board_event': (data: BoardEventMessage) => void;
  'ohlc': (data: OHLCMessage) => void;
}

export class DNSEMarketDataService extends EventEmitter {
  private mqttService: MQTTClientService;
  private logger?: FastifyBaseLogger;
  private symbolData: Map<string, SymbolData> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  private isInitialized: boolean = false;
  private dataCleanupInterval?: NodeJS.Timeout;

  constructor(mqttService: MQTTClientService, logger?: FastifyBaseLogger) {
    super();
    this.mqttService = mqttService;
    this.logger = logger;
    this.setMaxListeners(1000);
    
    // Set up MQTT event listeners
    this.setupMQTTListeners();
    
    // Start periodic data cleanup (clear stale data)
    this.startDataCleanup();
  }

  /**
   * Initialize the market data service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger?.info('Initializing DNSE market data service...');
      
      // Connect to MQTT broker
      await this.mqttService.connect();
      
      this.isInitialized = true;
      this.logger?.info('DNSE market data service initialized successfully');
      
    } catch (error: any) {
      this.logger?.error({ error: error.message }, 'Failed to initialize market data service');
      throw error;
    }
  }

  /**
   * Set up MQTT event listeners
   */
  private setupMQTTListeners(): void {
    // Handle tick data
    this.mqttService.on('tick', (tick: TickMessage) => {
      this.processTick(tick);
    });

    // Handle order book data
    this.mqttService.on('top_price', (topPrice: TopPriceMessage) => {
      this.processOrderBook(topPrice);
    });

    // Handle OHLC data
    this.mqttService.on('ohlc', (ohlc: OHLCMessage) => {
      this.processOHLC(ohlc);
    });

    // Handle board events
    this.mqttService.on('board_event', (event: BoardEventMessage) => {
      this.processBoardEvent(event);
    });

    // Handle connection events
    this.mqttService.on('connected', () => {
      this.logger?.info('MQTT connection established');
      // Resubscribe to symbols if any
      if (this.subscribedSymbols.size > 0) {
        this.resubscribeSymbols();
      }
    });

    this.mqttService.on('disconnected', (reason: string) => {
      this.logger?.warn({ reason }, 'MQTT connection lost');
    });

    this.mqttService.on('error', (error: Error) => {
      this.logger?.error({ error: error.message }, 'MQTT error');
    });
  }

  /**
   * Process tick data
   */
  private processTick(tick: TickMessage): void {
    const symbol = tick.symbol;
    
    // Get or create symbol data
    const data = this.getOrCreateSymbolData(symbol);
    
    // Update last tick
    data.lastTick = tick;
    data.lastUpdate = new Date();
    
    // Update snapshot
    this.updateSnapshot(symbol, tick);
    
    // Emit tick event
    this.emit('tick', tick);
    
    this.logger?.debug({ 
      symbol, 
      price: tick.matchPrice, 
      volume: tick.matchQtty,
      side: tick.side
    }, 'Tick processed');
  }

  /**
   * Process order book data
   */
  private processOrderBook(topPrice: TopPriceMessage): void {
    const symbol = topPrice.symbol;
    
    // Get or create symbol data
    const data = this.getOrCreateSymbolData(symbol);
    
    // Update order book
    data.orderBook = topPrice;
    data.lastUpdate = new Date();
    
    // Update snapshot with best bid/ask
    if (data.snapshot) {
      const bestBid = topPrice.bidPrices[0];
      const bestAsk = topPrice.askPrices[0];
      
      if (bestBid) {
        data.snapshot.bestBid = bestBid.price;
        data.snapshot.bestBidVolume = bestBid.quantity;
      }
      
      if (bestAsk) {
        data.snapshot.bestAsk = bestAsk.price;
        data.snapshot.bestAskVolume = bestAsk.quantity;
      }
    }
    
    // Emit order book event
    this.emit('top_price', topPrice);
    
    this.logger?.debug({ 
      symbol, 
      bids: topPrice.bidPrices.length, 
      asks: topPrice.askPrices.length 
    }, 'Order book processed');
  }

  /**
   * Process OHLC data
   */
  private processOHLC(ohlc: OHLCMessage): void {
    const symbol = ohlc.symbol;
    
    // Get or create symbol data
    const data = this.getOrCreateSymbolData(symbol);
    
    // Initialize OHLC map if needed
    if (!data.ohlc) {
      data.ohlc = new Map();
    }
    
    // Store OHLC data by timeframe
    data.ohlc.set(ohlc.timeframe, ohlc);
    data.lastUpdate = new Date();
    
    // Emit OHLC event
    this.emit('ohlc', ohlc);
    
    this.logger?.debug({ 
      symbol, 
      timeframe: ohlc.timeframe,
      close: ohlc.close
    }, 'OHLC processed');
  }

  /**
   * Process board event
   */
  private processBoardEvent(event: BoardEventMessage): void {
    // Emit board event
    this.emit('board_event', event);
    
    this.logger?.info({ 
      boardId: event.boardId,
      eventCode: event.eventCode,
      eventTime: event.eventTime
    }, 'Board event processed');
  }

  /**
   * Get or create symbol data
   */
  private getOrCreateSymbolData(symbol: string): SymbolData {
    if (!this.symbolData.has(symbol)) {
      this.symbolData.set(symbol, {
        lastUpdate: new Date()
      });
    }
    return this.symbolData.get(symbol)!;
  }

  /**
   * Update market snapshot from tick
   */
  private updateSnapshot(symbol: string, tick: TickMessage): void {
    const data = this.symbolData.get(symbol);
    if (!data) return;

    // Create or update snapshot
    if (!data.snapshot) {
      data.snapshot = {
        symbol: symbol,
        lastPrice: tick.matchPrice,
        lastVolume: tick.matchQtty,
        lastTime: tick.sendingTime,
        totalVolume: tick.totalVolume || '0',
        totalValue: tick.totalValue || 0,
        high: tick.high || tick.matchPrice,
        low: tick.low || tick.matchPrice,
        open: tick.open || tick.matchPrice,
        previousClose: tick.previousClose || tick.matchPrice,
        change: 0,
        changePercent: 0
      };
    } else {
      data.snapshot.lastPrice = tick.matchPrice;
      data.snapshot.lastVolume = tick.matchQtty;
      data.snapshot.lastTime = tick.sendingTime;
      
      if (tick.totalVolume) data.snapshot.totalVolume = tick.totalVolume;
      if (tick.totalValue) data.snapshot.totalValue = tick.totalValue;
      if (tick.high) data.snapshot.high = Math.max(data.snapshot.high, tick.high);
      if (tick.low) data.snapshot.low = Math.min(data.snapshot.low, tick.low);
    }

    // Calculate change
    if (data.snapshot.previousClose > 0) {
      data.snapshot.change = data.snapshot.lastPrice - data.snapshot.previousClose;
      data.snapshot.changePercent = (data.snapshot.change / data.snapshot.previousClose) * 100;
    }

    // Calculate average price
    if (parseFloat(data.snapshot.totalVolume) > 0) {
      data.snapshot.averagePrice = data.snapshot.totalValue / parseFloat(data.snapshot.totalVolume);
    }

    // Emit snapshot event
    this.emit('snapshot', data.snapshot);
  }

  /**
   * Subscribe to market data for symbols
   */
  async subscribe(request: SubscriptionRequest): Promise<void> {
    const { symbols, dataTypes = ['tick'] } = request;
    
    for (const symbol of symbols) {
      await this.mqttService.subscribeToSymbol(symbol, dataTypes);
      this.subscribedSymbols.add(symbol);
    }
    
    this.logger?.info({ symbols, dataTypes }, 'Subscribed to symbols');
  }

  /**
   * Unsubscribe from market data
   */
  async unsubscribe(symbols: string[], dataTypes?: string[]): Promise<void> {
    for (const symbol of symbols) {
      await this.mqttService.unsubscribeFromSymbol(symbol, dataTypes);
      
      if (!dataTypes) {
        this.subscribedSymbols.delete(symbol);
        // Clear cached data
        this.symbolData.delete(symbol);
      }
    }
    
    this.logger?.info({ symbols, dataTypes }, 'Unsubscribed from symbols');
  }

  /**
   * Resubscribe to all symbols after reconnection
   */
  private async resubscribeSymbols(): Promise<void> {
    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length === 0) return;
    
    this.logger?.info({ count: symbols.length }, 'Resubscribing to symbols');
    
    for (const symbol of symbols) {
      try {
        await this.mqttService.subscribeToSymbol(symbol, ['tick', 'top_price']);
      } catch (error: any) {
        this.logger?.error({ symbol, error: error.message }, 'Failed to resubscribe');
      }
    }
  }

  /**
   * Get market snapshot for symbol
   */
  getSnapshot(symbol: string): MarketSnapshot | null {
    const data = this.symbolData.get(symbol);
    return data?.snapshot || null;
  }

  /**
   * Get order book for symbol
   */
  getOrderBook(symbol: string): TopPriceMessage | null {
    const data = this.symbolData.get(symbol);
    return data?.orderBook || null;
  }

  /**
   * Get OHLC data for symbol
   */
  getOHLC(symbol: string, timeframe?: string): OHLCMessage | OHLCMessage[] | null {
    const data = this.symbolData.get(symbol);
    if (!data?.ohlc) return null;
    
    if (timeframe) {
      return data.ohlc.get(timeframe) || null;
    }
    
    return Array.from(data.ohlc.values());
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): MarketSnapshot[] {
    const snapshots: MarketSnapshot[] = [];
    
    this.symbolData.forEach((data) => {
      if (data.snapshot) {
        snapshots.push(data.snapshot);
      }
    });
    
    return snapshots;
  }

  /**
   * Start periodic cleanup of stale data
   */
  private startDataCleanup(): void {
    // Clean up data older than 1 hour every 10 minutes
    this.dataCleanupInterval = setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      let cleaned = 0;
      
      this.symbolData.forEach((data, symbol) => {
        if (data.lastUpdate < oneHourAgo && !this.subscribedSymbols.has(symbol)) {
          this.symbolData.delete(symbol);
          cleaned++;
        }
      });
      
      if (cleaned > 0) {
        this.logger?.debug({ cleaned }, 'Cleaned stale symbol data');
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.dataCleanupInterval) {
      clearInterval(this.dataCleanupInterval);
    }
    
    this.mqttService.disconnect();
    this.symbolData.clear();
    this.subscribedSymbols.clear();
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    connected: boolean;
    subscribedSymbols: number;
    cachedSymbols: number;
    mqttStatus: any;
  } {
    const mqttStatus = this.mqttService.getStatus();
    
    return {
      initialized: this.isInitialized,
      connected: mqttStatus.connected,
      subscribedSymbols: this.subscribedSymbols.size,
      cachedSymbols: this.symbolData.size,
      mqttStatus
    };
  }
}

// Singleton instance
let marketDataServiceInstance: DNSEMarketDataService | null = null;

/**
 * Get or create market data service instance
 */
export const getMarketDataService = (
  mqttService?: MQTTClientService,
  logger?: FastifyBaseLogger
): DNSEMarketDataService => {
  if (!marketDataServiceInstance && mqttService) {
    marketDataServiceInstance = new DNSEMarketDataService(mqttService, logger);
  }
  
  if (!marketDataServiceInstance) {
    throw new Error('Market Data Service not initialized');
  }
  
  return marketDataServiceInstance;
};