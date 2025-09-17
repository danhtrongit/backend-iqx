import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PeerComparisonService } from '../services/peer-comparison.service';
import { requireAdmin } from '../middleware/authorization';

const searchSchema = z.object({
  symbol: z.string().optional(),
  symbols: z.array(z.string()).or(z.string()).optional(),
  ticker: z.string().optional(),
  sectorType: z.string().default('RA'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['symbol', 'ticker', 'projectedTSR', 'fetchedAt']).default('symbol'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeFreshOnly: z.coerce.boolean().default(false)
});

const fetchAllSchema = z.object({
  maxWorkers: z.coerce.number().min(1).max(256).default(128),
  batchSize: z.coerce.number().min(1).max(100).default(50),
  retryAttempts: z.coerce.number().min(0).max(5).default(3),
  retryDelay: z.coerce.number().min(100).max(10000).default(1000)
});

const symbolParamsSchema = z.object({
  symbol: z.string().min(1).max(10)
});

const sectorTypeQuerySchema = z.object({
  sectorType: z.string().default('RA')
});

export default async function peerComparisonRoutes(fastify: FastifyInstance) {
  const peerComparisonService = new PeerComparisonService(fastify);

  /**
   * Search peer comparison data
   */
  fastify.get('/peer-comparison', {
    schema: {
      description: 'Search peer comparison data with filters',
      tags: ['Peer Comparison']
    }
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof searchSchema> }>, reply: FastifyReply) => {
    try {
      const params = searchSchema.parse(request.query);

      // Handle symbols as array
      if (params.symbols && typeof params.symbols === 'string') {
        params.symbols = params.symbols.split(',').map(s => s.trim());
      }

      const result = await peerComparisonService.searchPeerComparison(params);

      // Ensure JSONB fields are properly serialized
      const formattedResult = {
        ...result,
        data: result.data.map(item => ({
          ...item,
          npatmiGrowth: item.npatmiGrowth || {},
          pe: item.pe || {},
          pb: item.pb || {}
        }))
      };

      return reply.code(200).send(formattedResult);
    } catch (error) {
      fastify.log.error('Error searching peer comparison:', error);

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }

      return reply.code(500).send({
        error: 'Failed to search peer comparison data'
      });
    }
  });

  /**
   * Get peer comparison for a specific symbol
   */
  fastify.get('/peer-comparison/:symbol', {
    schema: {
      description: 'Get peer comparison data for a specific symbol',
      tags: ['Peer Comparison']
    }
  }, async (
    request: FastifyRequest<{
      Params: z.infer<typeof symbolParamsSchema>,
      Querystring: z.infer<typeof sectorTypeQuerySchema>
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { symbol } = symbolParamsSchema.parse(request.params);
      const { sectorType } = sectorTypeQuerySchema.parse(request.query);

      const result = await peerComparisonService.getSymbolPeerComparison(symbol.toUpperCase(), sectorType);

      if (result.length === 0) {
        return reply.code(404).send({
          error: 'No peer comparison data found for this symbol'
        });
      }

      // Ensure JSONB fields are properly serialized
      const formattedResult = result.map(item => ({
        ...item,
        npatmiGrowth: item.npatmiGrowth || {},
        pe: item.pe || {},
        pb: item.pb || {}
      }));

      return reply.code(200).send(formattedResult);
    } catch (error) {
      fastify.log.error('Error getting symbol peer comparison:', error);

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }

      return reply.code(500).send({
        error: 'Failed to get peer comparison data'
      });
    }
  });

  /**
   * Fetch latest peer comparison data from API
   */
  fastify.post('/peer-comparison/fetch/:symbol', {
    schema: {
      description: 'Fetch latest peer comparison data from API for a specific symbol',
      tags: ['Peer Comparison'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            symbol: { type: 'string' },
            dataCount: { type: 'number' }
          }
        }
      }
    }
  }, async (
    request: FastifyRequest<{
      Params: z.infer<typeof symbolParamsSchema>,
      Querystring: z.infer<typeof sectorTypeQuerySchema>
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { symbol } = symbolParamsSchema.parse(request.params);
      const { sectorType } = sectorTypeQuerySchema.parse(request.query);

      const apiResponse = await peerComparisonService.fetchFromVietCapAPI(symbol.toUpperCase(), sectorType);

      // Prepare data for insertion
      const fetchedAt = new Date();
      const dataToInsert = apiResponse.data.map(item => ({
        symbol: symbol.toUpperCase(),
        ticker: item.ticker,
        marketCap: item.marketCap,
        projectedTSR: item.projectedTSR,
        npatmiGrowth: item.npatmiGrowth,
        pe: item.pe,
        pb: item.pb,
        sectorType,
        fetchedAt
      }));

      await peerComparisonService.insertPeerComparisonData(dataToInsert);

      return reply.code(200).send({
        message: 'Successfully fetched and stored peer comparison data',
        symbol: symbol.toUpperCase(),
        dataCount: dataToInsert.length
      });
    } catch (error) {
      fastify.log.error('Error fetching peer comparison from API:', error);

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }

      return reply.code(500).send({
        error: 'Failed to fetch peer comparison data from API',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Fetch peer comparison data for all symbols (admin only)
   */
  fastify.post('/peer-comparison/fetch-all', {
    preHandler: [fastify.authenticate, requireAdmin],
    schema: {
      description: 'Fetch peer comparison data for all symbols (Admin only)',
      tags: ['Peer Comparison', 'Admin'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            successful: { type: 'number' },
            failed: { type: 'number' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  symbol: { type: 'string' },
                  error: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: z.infer<typeof fetchAllSchema> }>, reply: FastifyReply) => {
    try {
      const parsedOptions = fetchAllSchema.parse(request.body);

      // Add progress callback for logging
      const options = {
        ...parsedOptions,
        progressCallback: (current: number, total: number, symbol: string) => {
          if (current % 100 === 0) {
            fastify.log.info(`Progress: ${current}/${total} symbols processed (current: ${symbol})`);
          }
        }
      };

      const result = await peerComparisonService.fetchAllSymbolsWithWorkerPool(options);

      return reply.code(200).send({
        message: 'Batch fetch completed',
        ...result
      });
    } catch (error) {
      fastify.log.error('Error in batch fetch:', error);

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors
        });
      }

      return reply.code(500).send({
        error: 'Failed to fetch peer comparison data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get latest fetch status
   */
  fastify.get('/peer-comparison/status', {
    schema: {
      description: 'Get latest fetch status for peer comparison data',
      tags: ['Peer Comparison'],
      response: {
        200: {
          type: 'object',
          properties: {
            latestFetch: { type: ['string', 'null'] },
            symbol: { type: ['string', 'null'] },
            isStale: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { symbol?: string } }>, reply: FastifyReply) => {
    try {
      const { symbol } = request.query;

      const latestFetch = await peerComparisonService.getLatestFetchTime(symbol);
      const isStale = latestFetch ?
        (Date.now() - latestFetch.getTime()) > 24 * 60 * 60 * 1000 :
        true;

      return reply.code(200).send({
        latestFetch: latestFetch?.toISOString() || null,
        symbol: symbol || null,
        isStale
      });
    } catch (error) {
      fastify.log.error('Error getting fetch status:', error);

      return reply.code(500).send({
        error: 'Failed to get fetch status'
      });
    }
  });

  /**
   * Clean up old data (admin only)
   */
  fastify.delete('/peer-comparison/cleanup', {
    preHandler: [fastify.authenticate, requireAdmin],
    schema: {
      description: 'Delete old peer comparison data (Admin only)',
      tags: ['Peer Comparison', 'Admin'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            deletedCount: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { daysToKeep?: number } }>, reply: FastifyReply) => {
    try {
      const { daysToKeep = 7 } = request.query;

      const deletedCount = await peerComparisonService.deleteOldData(daysToKeep);

      return reply.code(200).send({
        message: `Deleted peer comparison data older than ${daysToKeep} days`,
        deletedCount
      });
    } catch (error) {
      fastify.log.error('Error cleaning up old data:', error);

      return reply.code(500).send({
        error: 'Failed to clean up old data'
      });
    }
  });
}