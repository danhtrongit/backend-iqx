import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FavoritesService } from '../services/favorites.service';

// Request schemas
const addFavoriteSchema = z.object({
  symbol: z.string().min(1).max(10),
  notes: z.string().optional(),
});

const batchAddSchema = z.object({
  symbols: z.array(z.string().min(1).max(10)).min(1).max(100),
});

const updateNotesSchema = z.object({
  notes: z.string(),
});

export default async function favoritesRoutes(app: FastifyInstance) {
  const favoritesService = new FavoritesService(app);

  // Get all favorites with stock details
  app.get('/', {
    preHandler: app.authenticate,
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              symbol: { type: 'string' },
              notes: { type: ['string', 'null'] },
              addedAt: { type: 'string' },
              updatedAt: { type: 'string' },
              stock: {
                type: ['object', 'null'],
                properties: {
                  id: { type: 'integer' },
                  symbol: { type: 'string' },
                  type: { type: 'string' },
                  board: { type: 'string' },
                  organName: { type: ['string', 'null'] },
                  organShortName: { type: ['string', 'null'] },
                  enOrganName: { type: ['string', 'null'] },
                  enOrganShortName: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const favorites = await favoritesService.getUserFavorites(request.user.id);
    return reply.send(favorites);
  });

  // Get favorite symbols only (simple list)
  app.get('/symbols', {
    preHandler: app.authenticate,
    schema: {
      response: {
        200: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const symbols = await favoritesService.getUserFavoriteSymbols(request.user.id);
    return reply.send(symbols);
  });

  // Add to favorites
  app.post('/', {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['symbol'],
        properties: {
          symbol: { type: 'string', minLength: 1, maxLength: 10 },
          notes: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            symbol: { type: 'string' },
            notes: { type: ['string', 'null'] },
            addedAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { symbol, notes } = addFavoriteSchema.parse(request.body);
      const favorite = await favoritesService.addToFavorites(request.user.id, symbol, notes);
      return reply.code(201).send(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      if (error instanceof Error && error.message.includes('already in your favorites')) {
        return reply.code(409).send({
          error: 'Conflict',
          message: error.message,
        });
      }
      throw error;
    }
  });

  // Batch add to favorites
  app.post('/batch', {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['symbols'],
        properties: {
          symbols: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 10 },
            minItems: 1,
            maxItems: 100,
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            added: { type: 'integer' },
            skipped: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { symbols } = batchAddSchema.parse(request.body);
      const result = await favoritesService.batchAddToFavorites(request.user.id, symbols);
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // Update notes for favorite
  app.put('/:symbol/notes', {
    preHandler: app.authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['symbol'],
        properties: {
          symbol: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['notes'],
        properties: {
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { symbol } = request.params as { symbol: string };
      const { notes } = updateNotesSchema.parse(request.body);
      const updated = await favoritesService.updateFavoriteNotes(request.user.id, symbol, notes);
      
      if (!updated) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `${symbol} is not in your favorites`,
        });
      }
      
      return reply.send(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // Remove from favorites
  app.delete('/:symbol', {
    preHandler: app.authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['symbol'],
        properties: {
          symbol: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const removed = await favoritesService.removeFromFavorites(request.user.id, symbol);
    
    if (!removed) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `${symbol} is not in your favorites`,
      });
    }
    
    return reply.code(204).send();
  });

  // Batch remove from favorites
  app.delete('/batch', {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['symbols'],
        properties: {
          symbols: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 10 },
            minItems: 1,
            maxItems: 100,
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            removed: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { symbols } = batchAddSchema.parse(request.body);
      const removed = await favoritesService.batchRemoveFromFavorites(request.user.id, symbols);
      return reply.send({ removed });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // Check if symbol is favorite
  app.get('/check/:symbol', {
    preHandler: app.authenticate,
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
            symbol: { type: 'string' },
            isFavorite: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const isFavorite = await favoritesService.isFavorite(request.user.id, symbol);
    return reply.send({ symbol: symbol.toUpperCase(), isFavorite });
  });

  // Check multiple symbols
  app.post('/check', {
    preHandler: app.authenticate,
    schema: {
      body: {
        type: 'object',
        required: ['symbols'],
        properties: {
          symbols: {
            type: 'array',
            items: { type: 'string', minLength: 1, maxLength: 10 },
            minItems: 1,
            maxItems: 100,
          },
        },
      },
      response: {
        200: {
          type: 'object',
          additionalProperties: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { symbols } = batchAddSchema.parse(request.body);
      const result = await favoritesService.checkFavorites(request.user.id, symbols);
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      throw error;
    }
  });

  // Clear all favorites
  app.delete('/', {
    preHandler: app.authenticate,
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            cleared: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const cleared = await favoritesService.clearFavorites(request.user.id);
    return reply.send({ cleared });
  });
}