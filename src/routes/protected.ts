import { FastifyInstance } from 'fastify';
import { hasRole, requireAdmin, requireAuthorOrAdmin, hasMinimumRole } from '../middleware/authorization';

export default async function protectedRoutes(app: FastifyInstance) {
  // User-only route (all authenticated users can access)
  app.get('/user-content', {
    preHandler: app.authenticate,
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = (request as any).user;
    return reply.send({
      message: 'This content is available to all authenticated users',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  });

  // Author-only route
  app.get('/author-content', {
    preHandler: [app.authenticate, hasRole('author')],
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            content: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return reply.send({
      message: 'This content is only for authors',
      content: 'Author-exclusive content here',
    });
  });

  // Author or Admin route
  app.get('/author-admin-content', {
    preHandler: [app.authenticate, requireAuthorOrAdmin],
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            content: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = (request as any).user;
    return reply.send({
      message: `This content is for authors and admins. You are: ${user.role}`,
      content: 'Author and Admin content',
    });
  });

  // Admin-only route
  app.get('/admin-content', {
    preHandler: [app.authenticate, requireAdmin],
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            secrets: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return reply.send({
      message: 'This content is only for administrators',
      secrets: ['Admin secret 1', 'Admin secret 2'],
    });
  });

  // Minimum role hierarchy route (author or higher)
  app.get('/premium-content', {
    preHandler: [app.authenticate, hasMinimumRole('author')],
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            premiumData: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = (request as any).user;
    return reply.send({
      message: 'Premium content for authors and above',
      premiumData: {
        level: user.role,
        features: user.role === 'admin' 
          ? ['All features', 'Admin panel', 'User management']
          : ['Author features', 'Content creation'],
      },
    });
  });

  // Dynamic role check route
  app.post('/check-permission', {
    preHandler: app.authenticate,
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['requiredRole'],
        properties: {
          requiredRole: { type: 'string', enum: ['user', 'author', 'admin'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            hasPermission: { type: 'boolean' },
            userRole: { type: 'string' },
            requiredRole: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = (request as any).user;
    const { requiredRole } = request.body as { requiredRole: string };
    
    const roleHierarchy: Record<string, number> = {
      user: 1,
      author: 2,
      admin: 3,
    };
    
    const hasPermission = roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    
    return reply.send({
      hasPermission,
      userRole: user.role,
      requiredRole,
    });
  });
}