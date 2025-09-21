/**
 * MQTT Client Service for DNSE Market Data
 * Handles WebSocket MQTT connection to DNSE data feed
 */

// Optional MQTT import with fallback
let mqtt: any = null;
try {
  mqtt = require('mqtt');
} catch (error) {
  console.warn('MQTT package not available, MQTT functionality disabled');
}
import { EventEmitter } from 'events';
import { FastifyBaseLogger } from 'fastify';
import { DNSEAuthService } from './dnse-auth.service';
import {
  TickMessage,
  TopPriceMessage,
  BoardEventMessage,
  OHLCMessage,
  TOPIC_PATTERNS
} from '../types/dnse-market.types';

export interface MQTTServiceEvents {
  'tick': (data: TickMessage) => void;
  'top_price': (data: TopPriceMessage) => void;
  'board_event': (data: BoardEventMessage) => void;
  'ohlc': (data: OHLCMessage) => void;
  'connected': () => void;
  'disconnected': (reason: string) => void;
  'error': (error: Error) => void;
  'subscribed': (topic: string) => void;
  'unsubscribed': (topic: string) => void;
}

export class MQTTClientService extends EventEmitter {
  private client?: mqtt.MqttClient;
  private authService: DNSEAuthService;
  private logger?: FastifyBaseLogger;
  private subscribedTopics: Set<string> = new Set();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor(authService: DNSEAuthService, logger?: FastifyBaseLogger) {
    super();
    this.authService = authService;
    this.logger = logger;
    this.setMaxListeners(100);
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    try {
      // Get credentials
      const { investorId, token } = await this.authService.getMQTTCredentials();
      
      this.logger?.info({ investorId }, 'Connecting to DNSE MQTT broker...');

      // Generate unique client ID
      const clientId = `dnse-price-json-mqtt-ws-sub-${Math.floor(Math.random() * 9000) + 1000}`;

      // MQTT connection options
      const options: mqtt.IClientOptions = {
        clientId,
        username: investorId,
        password: token,
        protocol: 'wss',
        host: 'datafeed-lts-krx.dnse.com.vn',
        port: 443,
        path: '/wss',
        keepalive: 1200,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        clean: true,
        resubscribe: true,
        protocolVersion: 5,
        rejectUnauthorized: false // For self-signed certificates
      };

      // Create MQTT client
      this.client = mqtt.connect(options);

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for connection
      await this.waitForConnection();
      
    } catch (error: any) {
      this.logger?.error({ error: error.message }, 'Failed to connect to MQTT broker');
      throw error;
    }
  }

  /**
   * Wait for connection to be established
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000);

      const onConnect = () => {
        clearTimeout(timeout);
        this.off('connected', onConnect);
        this.off('error', onError);
        resolve();
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        this.off('connected', onConnect);
        this.off('error', onError);
        reject(error);
      };

      this.once('connected', onConnect);
      this.once('error', onError);
    });
  }

  /**
   * Set up MQTT event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    // Connection established
    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger?.info('Connected to DNSE MQTT broker');
      this.emit('connected');
      
      // Resubscribe to topics
      if (this.subscribedTopics.size > 0) {
        this.resubscribeToTopics();
      }
    });

    // Message received
    this.client.on('message', (topic: string, message: Buffer) => {
      this.handleMessage(topic, message);
    });

    // Connection lost
    this.client.on('close', () => {
      this.isConnected = false;
      this.logger?.warn('MQTT connection closed');
      this.emit('disconnected', 'Connection closed');
    });

    // Error occurred
    this.client.on('error', (error: Error) => {
      this.logger?.error({ error: error.message }, 'MQTT client error');
      this.emit('error', error);
    });

    // Disconnected
    this.client.on('disconnect', () => {
      this.isConnected = false;
      this.logger?.warn('Disconnected from MQTT broker');
      this.emit('disconnected', 'Client disconnected');
    });

    // Reconnecting
    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      this.logger?.info({ attempt: this.reconnectAttempts }, 'Reconnecting to MQTT broker');
      
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        this.logger?.error('Max reconnect attempts reached');
        this.client?.end();
      }
    });
  }

  /**
   * Handle incoming MQTT message
   */
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const messageStr = message.toString();
      const data = JSON.parse(messageStr);
      
      // Determine message type from topic
      if (topic.includes('/tick/')) {
        this.emit('tick', data as TickMessage);
      } else if (topic.includes('/top_price/')) {
        this.emit('top_price', data as TopPriceMessage);
      } else if (topic.includes('/board_event/')) {
        this.emit('board_event', data as BoardEventMessage);
      } else if (topic.includes('/ohlc/')) {
        this.emit('ohlc', data as OHLCMessage);
      }
      
      this.logger?.debug({ topic, symbol: data.symbol }, 'Message received');
      
    } catch (error: any) {
      this.logger?.error({ topic, error: error.message }, 'Failed to parse message');
    }
  }

  /**
   * Subscribe to symbol topics
   */
  async subscribeToSymbol(symbol: string, dataTypes: string[] = ['tick']): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    const topics: string[] = [];

    for (const dataType of dataTypes) {
      let topic: string;
      
      switch (dataType) {
        case 'tick':
          topic = TOPIC_PATTERNS.TICK.replace('{symbol}', symbol);
          break;
        case 'top_price':
          topic = TOPIC_PATTERNS.TOP_PRICE.replace('{symbol}', symbol);
          break;
        case 'ohlc':
          topic = TOPIC_PATTERNS.OHLC
            .replace('{timeframe}', '1m')
            .replace('{symbol}', symbol);
          break;
        default:
          continue;
      }
      
      topics.push(topic);
      this.subscribedTopics.add(topic);
    }

    if (topics.length === 0) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.client!.subscribe(topics, { qos: 1 }, (err) => {
        if (err) {
          this.logger?.error({ error: err.message, topics }, 'Failed to subscribe');
          reject(err);
        } else {
          this.logger?.info({ topics }, 'Subscribed to topics');
          topics.forEach(topic => this.emit('subscribed', topic));
          resolve();
        }
      });
    });
  }

  /**
   * Unsubscribe from symbol topics
   */
  async unsubscribeFromSymbol(symbol: string, dataTypes?: string[]): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    const topicsToUnsubscribe: string[] = [];
    
    this.subscribedTopics.forEach(topic => {
      if (topic.includes(`/symbol/${symbol}`)) {
        if (!dataTypes || dataTypes.some(dt => topic.includes(`/${dt}/`))) {
          topicsToUnsubscribe.push(topic);
        }
      }
    });

    if (topicsToUnsubscribe.length === 0) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.client!.unsubscribe(topicsToUnsubscribe, (err) => {
        if (err) {
          this.logger?.error({ error: err.message }, 'Failed to unsubscribe');
          reject(err);
        } else {
          topicsToUnsubscribe.forEach(topic => {
            this.subscribedTopics.delete(topic);
            this.emit('unsubscribed', topic);
          });
          this.logger?.info({ topics: topicsToUnsubscribe }, 'Unsubscribed from topics');
          resolve();
        }
      });
    });
  }

  /**
   * Resubscribe to all topics after reconnection
   */
  private resubscribeToTopics(): void {
    if (!this.client || this.subscribedTopics.size === 0) {
      return;
    }

    const topics = Array.from(this.subscribedTopics);
    
    this.client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) {
        this.logger?.error({ error: err.message }, 'Failed to resubscribe');
      } else {
        this.logger?.info({ count: topics.length }, 'Resubscribed to topics');
      }
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      this.subscribedTopics.clear();
      this.logger?.info('Disconnected from MQTT broker');
    }
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    subscribedTopics: number;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      subscribedTopics: this.subscribedTopics.size,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Get list of subscribed topics
   */
  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }
}

// Singleton instance
let mqttServiceInstance: MQTTClientService | null = null;

/**
 * Get or create MQTT service instance
 */
export const getMQTTService = (
  authService?: DNSEAuthService,
  logger?: FastifyBaseLogger
): MQTTClientService => {
  if (!mqttServiceInstance && authService) {
    mqttServiceInstance = new MQTTClientService(authService, logger);
  }
  
  if (!mqttServiceInstance) {
    throw new Error('MQTT Service not initialized');
  }
  
  return mqttServiceInstance;
};