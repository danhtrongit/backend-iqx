import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config/env';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    bodyLimit: 10485760, // 10MB
  });

  // Register plugins
  await app.register(import('@fastify/helmet'), {
    contentSecurityPolicy: false,
  });

  await app.register(import('@fastify/cors'), {
    origin: "*",
    credentials: config.CORS_CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(import('@fastify/sensible'));

  await app.register(import('@fastify/jwt'), {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    },
  });

  await app.register(import('@fastify/cookie'), {
    secret: config.JWT_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });

  await app.register(import('@fastify/rate-limit'), {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_TIME_WINDOW,
    cache: 10000,
    skipSuccessfulRequests: false,
    keyGenerator: (request) => {
      return request.headers['x-forwarded-for'] as string ||
        request.headers['x-real-ip'] as string ||
        request.socket.remoteAddress ||
        'unknown';
    },
  });

  // Register Swagger for API documentation
  if (config.NODE_ENV !== 'production') {
    await app.register(import('@fastify/swagger'), {
      swagger: {
        info: {
          title: 'Fastify Backend API',
          description: 'Professional Fastify backend with authentication',
          version: '2.0.0',
        },
        host: config.SWAGGER_HOST || `localhost:${config.PORT}`,
        schemes: config.SWAGGER_SCHEMES as ('http' | 'https')[],
        consumes: ['application/json'],
        produces: ['application/json'],
        securityDefinitions: {
          Bearer: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            description: 'JWT Authorization header using the Bearer scheme. Example: "Bearer {token}"',
          },
        },
      },
    });

    await app.register(import('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
      staticCSP: true,
      transformSpecificationClone: true,
    });
  }

  // Health check route
  app.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
  }, async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Register custom plugins
  await app.register(import('./plugins/error-handler'));
  await app.register(import('./plugins/auth'));
  await app.register(import('./plugins/stock-symbols-init'));

  // Register routes
  await app.register(import('./routes/auth'), { prefix: '/api/auth' });
  await app.register(import('./routes/admin'), { prefix: '/api/admin' });
  await app.register(import('./routes/protected'), { prefix: '/api/protected' });
  await app.register(import('./routes/stock-symbols'), { prefix: '/api/stocks' });
  await app.register(import('./routes/favorites'), { prefix: '/api/favorites' });
  await app.register(import('./routes/peer-comparison'), { prefix: '/api' });
  await app.register(import('./routes/proxy'), { prefix: '/proxy' });

  return app;
}