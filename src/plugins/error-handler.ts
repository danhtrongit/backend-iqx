import { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const { statusCode = 500, message } = error;
    
    // Log error
    if (statusCode >= 500) {
      app.log.error({
        err: error,
        request: {
          method: request.method,
          url: request.url,
          headers: request.headers,
          params: request.params,
          query: request.query,
          body: request.body,
        },
      });
    } else {
      app.log.warn({
        err: error,
        request: {
          method: request.method,
          url: request.url,
        },
      });
    }

    // Handle specific error types
    if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
      return reply.code(401).send({
        error: 'Token Expired',
        message: 'Your access token has expired',
        statusCode: 401,
      });
    }

    if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
      return reply.code(401).send({
        error: 'Invalid Token',
        message: 'The provided token is invalid',
        statusCode: 401,
      });
    }

    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      return reply.code(401).send({
        error: 'Authorization Required',
        message: 'No authorization header provided',
        statusCode: 401,
      });
    }

    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        statusCode: 400,
        details: error.validation,
      });
    }

    if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.code(413).send({
        error: 'Payload Too Large',
        message: 'Request body exceeds maximum allowed size',
        statusCode: 413,
      });
    }

    if (error.code === 'FST_RATE_LIMIT') {
      return reply.code(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded, please try again later',
        statusCode: 429,
      });
    }

    // Database errors
    if (error.message && error.message.includes('duplicate key')) {
      return reply.code(409).send({
        error: 'Conflict',
        message: 'Resource already exists',
        statusCode: 409,
      });
    }

    if (error.message && error.message.includes('foreign key')) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Invalid reference to related resource',
        statusCode: 400,
      });
    }

    // Default error response
    const responseError = {
      error: statusCode >= 500 ? 'Internal Server Error' : error.name || 'Error',
      message: statusCode >= 500 ? 'An unexpected error occurred' : message,
      statusCode,
    };

    return reply.code(statusCode).send(responseError);
  });

  // Handle uncaught errors
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
      statusCode: 404,
    });
  });
}

export default fp(errorHandler, {
  name: 'error-handler',
});