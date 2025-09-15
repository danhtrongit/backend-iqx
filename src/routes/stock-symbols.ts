import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { StockSymbolsService } from '../services/stock-symbols.service';
import { quickSearchSymbols, getSymbolsByPrefix, findExactSymbol } from '../services/stock-symbols-quick-search';

// Request/Response schemas
const searchQuerySchema = z.object({
  query: z.string().optional(),
  symbol: z.string().optional(),
  board: z.enum(['HSX', 'HNX', 'UPCOM']).optional(),
  type: z.enum(['STOCK', 'FUND', 'BOND', 'ETF', 'COVERED_WARRANT']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['symbol', 'organName', 'board', 'type']).default('symbol'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

const importSymbolsBodySchema = z.object({
  force: z.boolean().default(false),
});

export default async function stockSymbolsRoutes(app: FastifyInstance) {
  const stockSymbolsService = new StockSymbolsService(app);

  // Search stock symbols
  app.get('/search', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          symbol: { type: 'string' },
          board: { type: 'string', enum: ['HSX', 'HNX', 'UPCOM'] },
          type: { type: 'string', enum: ['STOCK', 'FUND', 'BOND', 'ETF', 'COVERED_WARRANT'] },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          sortBy: { type: 'string', enum: ['symbol', 'organName', 'board', 'type'], default: 'symbol' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  symbol: { type: 'string' },
                  type: { type: 'string' },
                  board: { type: 'string' },
                  enOrganName: { type: ['string', 'null'] },
                  enOrganShortName: { type: ['string', 'null'] },
                  organShortName: { type: ['string', 'null'] },
                  organName: { type: ['string', 'null'] },
                  productGrpID: { type: ['string', 'null'] },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const params = searchQuerySchema.parse(request.query);
      const result = await stockSymbolsService.searchSymbols(params);
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // Quick search endpoint (optimized for autocomplete)
  app.get('/quick-search', {
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          board: { type: 'string', enum: ['HSX', 'HNX', 'UPCOM'] },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              symbol: { type: 'string' },
              name: { type: 'string' },
              board: { type: 'string' },
              type: { type: 'string' },
              match_type: { type: 'string', enum: ['exact_symbol', 'exact_name', 'prefix_symbol', 'prefix_name', 'contains'] },
              matched_field: { type: 'string', enum: ['symbol', 'name', 'both'] },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { q, limit = 10, board } = request.query as { q: string; limit?: number; board?: string };
    const results = await quickSearchSymbols(q, limit, board);
    return reply.send(results);
  });

  // Get symbols by prefix (alphabetical browsing)
  app.get('/prefix/:prefix', {
    schema: {
      params: {
        type: 'object',
        required: ['prefix'],
        properties: {
          prefix: { type: 'string', minLength: 1, maxLength: 3 },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          board: { type: 'string', enum: ['HSX', 'HNX', 'UPCOM'] },
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 100 },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              symbol: { type: 'string' },
              type: { type: 'string' },
              board: { type: 'string' },
              enOrganName: { type: ['string', 'null'] },
              enOrganShortName: { type: ['string', 'null'] },
              organShortName: { type: ['string', 'null'] },
              organName: { type: ['string', 'null'] },
              productGrpID: { type: ['string', 'null'] },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { prefix } = request.params as { prefix: string };
    const { board, limit = 100 } = request.query as { board?: string; limit?: number };
    const results = await getSymbolsByPrefix(prefix, board, limit);
    return reply.send(results);
  });

  // Get exact symbol match
  app.get('/exact/:symbol', {
    schema: {
      params: {
        type: 'object',
        required: ['symbol'],
        properties: {
          symbol: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            symbol: { type: 'string' },
            type: { type: 'string' },
            board: { type: 'string' },
            enOrganName: { type: ['string', 'null'] },
            enOrganShortName: { type: ['string', 'null'] },
            organShortName: { type: ['string', 'null'] },
            organName: { type: ['string', 'null'] },
            productGrpID: { type: ['string', 'null'] },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const result = await findExactSymbol(symbol);
    
    if (!result) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Stock symbol ${symbol} not found`,
      });
    }
    
    return reply.send(result);
  });

  // Get symbol by code
  app.get('/symbol/:code', {
    schema: {
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            symbol: { type: 'string' },
            type: { type: 'string' },
            board: { type: 'string' },
            enOrganName: { type: ['string', 'null'] },
            enOrganShortName: { type: ['string', 'null'] },
            organShortName: { type: ['string', 'null'] },
            organName: { type: ['string', 'null'] },
            productGrpID: { type: ['string', 'null'] },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const symbol = await stockSymbolsService.getSymbolByCode(code);
    
    if (!symbol) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Stock symbol ${code} not found`,
      });
    }
    
    return reply.send(symbol);
  });

  // Get all boards
  app.get('/boards', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  }, async (_request, reply) => {
    const boards = await stockSymbolsService.getBoards();
    return reply.send(boards);
  });

  // Get all types
  app.get('/types', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  }, async (_request, reply) => {
    const types = await stockSymbolsService.getTypes();
    return reply.send(types);
  });

  // Get symbols by board
  app.get('/board/:board', {
    schema: {
      params: {
        type: 'object',
        required: ['board'],
        properties: {
          board: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              symbol: { type: 'string' },
              type: { type: 'string' },
              board: { type: 'string' },
              enOrganName: { type: ['string', 'null'] },
              enOrganShortName: { type: ['string', 'null'] },
              organShortName: { type: ['string', 'null'] },
              organName: { type: ['string', 'null'] },
              productGrpID: { type: ['string', 'null'] },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { board } = request.params as { board: string };
    const symbols = await stockSymbolsService.getSymbolsByBoard(board);
    return reply.send(symbols);
  });

  // Import symbols from VietCap API (admin only)
  app.post('/import', {
    preHandler: [app.authenticate, async (request, reply) => {
      // Check if user is admin
      if (request.user.role !== 'admin') {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only administrators can import stock symbols',
        });
      }
    }],
    schema: {
      body: {
        type: 'object',
        properties: {
          force: { type: 'boolean', default: false },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            imported: { type: 'integer' },
            skipped: { type: 'integer' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { force } = importSymbolsBodySchema.parse(request.body);
      const result = await stockSymbolsService.importSymbols(force);
      
      return reply.send({
        ...result,
        message: result.imported > 0 
          ? `Successfully imported ${result.imported} stock symbols`
          : `Import skipped. Database already contains ${result.skipped} symbols`,
      });
    } catch (error) {
      app.log.error('Error importing stock symbols:', error);
      return reply.code(500).send({
        error: 'Import Failed',
        message: 'Failed to import stock symbols from VietCap API',
      });
    }
  });

  // Get statistics
  app.get('/stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            byBoard: {
              type: 'object',
              additionalProperties: { type: 'integer' },
            },
            byType: {
              type: 'object',
              additionalProperties: { type: 'integer' },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const [total, boards, types, symbols] = await Promise.all([
      stockSymbolsService.getSymbolCount(),
      stockSymbolsService.getBoards(),
      stockSymbolsService.getTypes(),
      stockSymbolsService.searchSymbols({ limit: 10000 }), // Get all for stats
    ]);

    // Calculate statistics
    const byBoard: Record<string, number> = {};
    const byType: Record<string, number> = {};

    symbols.data.forEach(symbol => {
      byBoard[symbol.board] = (byBoard[symbol.board] || 0) + 1;
      byType[symbol.type] = (byType[symbol.type] || 0) + 1;
    });

    return reply.send({
      total,
      byBoard,
      byType,
    });
  });
}