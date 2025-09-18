import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EarningResultsService } from '../services/earning-results.service';

const symbolParamSchema = z.object({
  symbol: z.string().min(1).max(10),
});

const fetchBodySchema = z.object({
  symbols: z.array(z.string()).optional(),
  force: z.boolean().optional(),
});

export default async function earningResultsRoutes(app: FastifyInstance) {
  // Get all earning results
  app.get('/earning-results', {
    schema: {
      description: 'Get all earning results from database',
      tags: ['Earning Results'],
    },
  }, async (request, reply) => {
    try {
      const results = await EarningResultsService.getAllEarningResults();
      return reply.code(200).send(results);
    } catch (error) {
      app.log.error('Error fetching earning results:', error);
      return reply.code(500).send({ error: 'Failed to fetch earning results' });
    }
  });

  // Get earning results for a specific symbol
  app.get<{
    Params: z.infer<typeof symbolParamSchema>;
  }>('/earning-results/:symbol', {
    schema: {
      description: 'Get earning results for a specific symbol',
      tags: ['Earning Results'],
      params: {
        type: 'object',
        properties: {
          symbol: { type: 'string', minLength: 1, maxLength: 10 }
        },
        required: ['symbol']
      },
    },
  }, async (request, reply) => {
    try {
      const { symbol } = request.params;
      const results = await EarningResultsService.getEarningResultsBySymbol(symbol.toUpperCase());
      
      if (results.length === 0) {
        return reply.code(404).send({ error: `No earning results found for symbol ${symbol}` });
      }
      
      return reply.code(200).send(results);
    } catch (error) {
      app.log.error(`Error fetching earning results for ${request.params.symbol}:`, error);
      return reply.code(500).send({ error: 'Failed to fetch earning results' });
    }
  });

  // Fetch earning results from API for specific symbols
  app.post<{
    Body: z.infer<typeof fetchBodySchema>;
  }>('/earning-results/fetch', {
    schema: {
      description: 'Fetch earning results from VietCap API for specified symbols',
      tags: ['Earning Results'],
      body: {
        type: 'object',
        properties: {
          symbols: { 
            type: 'array',
            items: { type: 'string' }
          },
          force: { type: 'boolean' }
        }
      },
    },
  }, async (request, reply) => {
    try {
      const { symbols, force } = request.body;
      
      if (!symbols || symbols.length === 0) {
        return reply.code(400).send({ error: 'No symbols provided' });
      }
      
      // Process symbols with limited concurrency for API endpoint
      const results = await EarningResultsService.processSymbolsConcurrently(
        symbols.map(s => s.toUpperCase()),
        10 // Lower concurrency for API endpoint
      );
      
      return reply.code(200).send(results);
    } catch (error) {
      app.log.error('Error fetching earning results:', error);
      return reply.code(500).send({ error: 'Failed to fetch earning results' });
    }
  });

  // Delete earning results for a specific symbol
  app.delete<{
    Params: z.infer<typeof symbolParamSchema>;
  }>('/earning-results/:symbol', {
    schema: {
      description: 'Delete earning results for a specific symbol',
      tags: ['Earning Results'],
      params: {
        type: 'object',
        properties: {
          symbol: { type: 'string', minLength: 1, maxLength: 10 }
        },
        required: ['symbol']
      },
    },
  }, async (request, reply) => {
    try {
      const { symbol } = request.params;
      await EarningResultsService.deleteEarningResultsBySymbol(symbol.toUpperCase());
      
      return reply.code(200).send({ message: `Earning results for ${symbol} deleted successfully` });
    } catch (error) {
      app.log.error(`Error deleting earning results for ${request.params.symbol}:`, error);
      return reply.code(500).send({ error: 'Failed to delete earning results' });
    }
  });
}