import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { AuthService } from '../services/auth.service';
import { JWTPayload } from '../types';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: any;
    token?: string;
  }
}

async function authPlugin(app: FastifyInstance) {
  const authService = new AuthService(app);

  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'Authorization Required',
          message: 'No valid authorization header provided',
          statusCode: 401,
        });
      }

      const token = authHeader.substring(7);
      
      // Check if token is blacklisted
      const isBlacklisted = await authService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return reply.code(401).send({
          error: 'Token Revoked',
          message: 'This token has been revoked',
          statusCode: 401,
        });
      }

      // Verify token
      let payload: JWTPayload;
      try {
        payload = await app.jwt.verify(token) as JWTPayload;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('expired')) {
            return reply.code(401).send({
              error: 'Token Expired',
              message: 'Your access token has expired',
              statusCode: 401,
            });
          }
          return reply.code(401).send({
            error: 'Invalid Token',
            message: 'The provided token is invalid',
            statusCode: 401,
          });
        }
        throw error;
      }

      // Get user from database
      const user = await authService.getUserById(payload.sub);
      
      if (!user) {
        return reply.code(401).send({
          error: 'User Not Found',
          message: 'The user associated with this token no longer exists',
          statusCode: 401,
        });
      }

      if (!user.isActive) {
        return reply.code(401).send({
          error: 'Account Deactivated',
          message: 'This account has been deactivated',
          statusCode: 401,
        });
      }

      // Attach user and token to request
      request.user = user;
      request.token = token;
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Authentication failed due to server error',
        statusCode: 500,
      });
    }
  });

  // Optional: Add a decorator for optional authentication
  app.decorate('optionalAuthenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return; // No token provided, continue without authentication
    }

    const token = authHeader.substring(7);
    
    try {
      const isBlacklisted = await authService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return; // Token is blacklisted, continue without authentication
      }

      const payload = await app.jwt.verify(token) as JWTPayload;
      const user = await authService.getUserById(payload.sub);
      
      if (user && user.isActive) {
        request.user = user;
        request.token = token;
      }
    } catch (error) {
      // Token verification failed, continue without authentication
      app.log.debug('Optional authentication failed:', error);
    }
  });

  // Schedule cleanup of expired tokens
  if (process.env.NODE_ENV !== 'test') {
    setInterval(async () => {
      try {
        await authService.cleanupExpiredTokens();
        app.log.info('Cleaned up expired tokens');
      } catch (error) {
        app.log.error('Failed to cleanup expired tokens:', error);
      }
    }, 60 * 60 * 1000); // Run every hour
  }
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt'],
});