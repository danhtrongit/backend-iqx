/**
 * DNSE Market Data API Routes
 * Provides REST endpoints for real-time market data
 */

import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DNSEAuthService, getDNSEAuthService } from '../services/dnse-auth.service';
import { MQTTClientService, getMQTTService } from '../services/mqtt-client.service';
import { DNSEMarketDataService, getMarketDataService } from '../services/dnse-market-data.service';
import { ApiResponse, SubscriptionRequest } from '../types/dnse-market.types';

// Request schemas
const SubscribeSchema = z.object({
  symbols: z.array(z.string()).min(1).max(100),
  dataTypes: z.array(z.enum(['tick', 'top_price', 'board_event', 'ohlc'])).optional()
    .default(['tick'])
});

const UnsubscribeSchema = z.object({
  symbols: z.array(z.string()).min(1),
  dataTypes: z.array(z.string()).optional()
});

const OHLCQuerySchema = z.object({
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '1d']).optional()
});

// Main routes
async function dnseMarketDataRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  let authService: DNSEAuthService;
  let mqttService: MQTTClientService;
  let marketDataService: DNSEMarketDataService;
  let isInitialized = false;

  // Initialize services on first request
  const ensureServiceInitialized = async () => {
    if (isInitialized) {
      return;
    }

    try {
      // Get DNSE credentials from environment
      const credentials = {
        username: process.env.DNSE_USERNAME || '',
        password: process.env.DNSE_PASSWORD || ''
      };

      if (!credentials.username || !credentials.password) {
        throw new Error('DNSE credentials not configured. Please set DNSE_USERNAME and DNSE_PASSWORD in .env');
      }

      // Initialize services
      authService = getDNSEAuthService(credentials, fastify.log);
      mqttService = getMQTTService(authService, fastify.log);
      marketDataService = getMarketDataService(mqttService, fastify.log);

      // Initialize market data service
      await marketDataService.initialize();
      
      isInitialized = true;
      fastify.log.info('DNSE market data service initialized');
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Failed to initialize DNSE market data service');
      throw error;
    }
  };

  /**
   * GET /api/dnse-market/status
   * Get service status
   */
  fastify.get('/status', {
    schema: {
      description: 'Get DNSE market data service status',
      tags: ['market-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                initialized: { type: 'boolean' },
                connected: { type: 'boolean' },
                subscribedSymbols: { type: 'number' },
                cachedSymbols: { type: 'number' }
              }
            },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!isInitialized) {
        const response: ApiResponse<any> = {
          success: true,
          data: {
            initialized: false,
            connected: false,
            subscribedSymbols: 0,
            cachedSymbols: 0
          },
          timestamp: new Date()
        };
        return reply.code(200).send(response);
      }

      const status = marketDataService.getStatus();
      
      const response: ApiResponse<any> = {
        success: true,
        data: status,
        timestamp: new Date()
      };
      
      return reply.code(200).send(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
      return reply.code(500).send(response);
    }
  });

  /**
   * POST /api/dnse-market/subscribe
   * Subscribe to market data for symbols
   */
  fastify.post('/subscribe', {
    schema: {
      body: {
        type: 'object',
        properties: {
          symbols: { 
            type: 'array', 
            items: { type: 'string' },
            minItems: 1,
            maxItems: 100
          },
          dataTypes: { 
            type: 'array', 
            items: { 
              type: 'string',
              enum: ['tick', 'top_price', 'board_event', 'ohlc']
            },
            default: ['tick']
          }
        },
        required: ['symbols']
      },
      description: 'Subscribe to real-time market data for specified symbols',
      tags: ['market-data']
    }
  }, async (request: FastifyRequest<{ Body: z.infer<typeof SubscribeSchema> }>, reply: FastifyReply) => {
    try {
      await ensureServiceInitialized();
      
      const validatedBody = SubscribeSchema.parse(request.body);
      const { symbols, dataTypes } = validatedBody;
      
      await marketDataService.subscribe({
        symbols,
        dataTypes: dataTypes as any
      });
      
      const response: ApiResponse<any> = {
        success: true,
        data: {
          subscribedSymbols: symbols,
          dataTypes
        },
        timestamp: new Date()
      };
      
      return reply.code(200).send(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
      return reply.code(500).send(response);
    }
  });

  /**
   * POST /api/dnse-market/unsubscribe
   * Unsubscribe from market data
   */
  fastify.post('/unsubscribe', {
    schema: {
      body: {
        type: 'object',
        properties: {
          symbols: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1
          },
          dataTypes: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['symbols']
      },
      description: 'Unsubscribe from market data for specified symbols',
      tags: ['market-data']
    }
  }, async (request: FastifyRequest<{ Body: z.infer<typeof UnsubscribeSchema> }>, reply: FastifyReply) => {
    try {
      await ensureServiceInitialized();
      
      const validatedBody = UnsubscribeSchema.parse(request.body);
      const { symbols, dataTypes } = validatedBody;
      
      await marketDataService.unsubscribe(symbols, dataTypes);
      
      const response: ApiResponse<any> = {
        success: true,
        data: {
          unsubscribedSymbols: symbols,
          dataTypes
        },
        timestamp: new Date()
      };
      
      return reply.code(200).send(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
      return reply.code(500).send(response);
    }
  });

  /**
   * GET /api/dnse-market/snapshot/:symbol
   * Get market snapshot for a symbol
   */
  fastify.get('/snapshot/:symbol', {
    schema: {
      params: {
        type: 'object',
        properties: {
          symbol: { type: 'string' }
        },
        required: ['symbol']
      },
      description: 'Get current market snapshot for a symbol',
      tags: ['market-data']
    }
  }, async (request: FastifyRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
    try {
      await ensureServiceInitialized();
      
      const { symbol } = request.params;
      const snapshot = marketDataService.getSnapshot(symbol);
      
      if (!snapshot) {
        const response: ApiResponse<null> = {
          success: false,
          error: `No snapshot available for symbol: ${symbol}`,
          timestamp: new Date()
        };
        return reply.code(404).send(response);
      }
      
      const response: ApiResponse<any> = {
        success: true,
        data: snapshot,
        timestamp: new Date()
      };
      
      return reply.code(200).send(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
      return reply.code(500).send(response);
    }
  });

  /**
   * GET /api/dnse-market/orderbook/:symbol
   * Get order book for a symbol
   */
  fastify.get('/orderbook/:symbol', {
    schema: {
      params: {
        type: 'object',
        properties: {
          symbol: { type: 'string' }
        },
        required: ['symbol']
      },
      description: 'Get current order book (top price) for a symbol',
      tags: ['market-data']
    }
  }, async (request: FastifyRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
    try {
      await ensureServiceInitialized();
      
      const { symbol } = request.params;
      const orderBook = marketDataService.getOrderBook(symbol);
      
      if (!orderBook) {
        const response: ApiResponse<null> = {
          success: false,
          error: `No order book available for symbol: ${symbol}`,
          timestamp: new Date()
        };
        return reply.code(404).send(response);
      }
      
      const response: ApiResponse<any> = {
        success: true,
        data: orderBook,
        timestamp: new Date()
      };
      
      return reply.code(200).send(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
      return reply.code(500).send(response);
    }
  });

  /**
   * GET /api/dnse-market/ohlc/:symbol
   * Get OHLC data for a symbol
   */
  fastify.get('/ohlc/:symbol', {
    schema: {
      params: {
        type: 'object',
        properties: {
          symbol: { type: 'string' }
        },
        required: ['symbol']
      },
      querystring: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['1m', '5m', '15m', '30m', '1h', '1d']
          }
        }
      },
      description: 'Get OHLC data for a symbol',
      tags: ['market-data']
    }
  }, async (request: FastifyRequest<{ 
    Params: { symbol: string },
    Querystring: z.infer<typeof OHLCQuerySchema>
  }>, reply: FastifyReply) => {
    try {
      await ensureServiceInitialized();
      
      const { symbol } = request.params;
      const { timeframe } = request.query as any;
      
      const ohlc = marketDataService.getOHLC(symbol, timeframe);
      
      if (!ohlc) {
        const response: ApiResponse<null> = {
          success: false,
          error: `No OHLC data available for symbol: ${symbol}`,
          timestamp: new Date()
        };
        return reply.code(404).send(response);
      }
      
      const response: ApiResponse<any> = {
        success: true,
        data: ohlc,
        timestamp: new Date()
      };
      
      return reply.code(200).send(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
      return reply.code(500).send(response);
    }
  });

  /**
   * GET /api/dnse-market/snapshots
   * Get all cached market snapshots
   */
  fastify.get('/snapshots', {
    schema: {
      description: 'Get all cached market snapshots',
      tags: ['market-data']
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await ensureServiceInitialized();
      
      const snapshots = marketDataService.getAllSnapshots();
      
      const response: ApiResponse<any> = {
        success: true,
        data: {
          count: snapshots.length,
          snapshots
        },
        timestamp: new Date()
      };
      
      return reply.code(200).send(response);
    } catch (error: any) {
      const response: ApiResponse<null> = {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
      return reply.code(500).send(response);
    }
  });

  // Clean up on server close
  fastify.addHook('onClose', async () => {
    if (marketDataService) {
      marketDataService.destroy();
    }
  });
}

export default dnseMarketDataRoutes;