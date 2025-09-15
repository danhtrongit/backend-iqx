import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';

// Request/Response schemas
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
  phoneNumber: z.string()
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/, 'Invalid phone number format')
    .optional(),
  phoneCountryCode: z.string().regex(/^\+[0-9]{1,4}$/, 'Invalid country code').optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const phoneLoginSchema = z.object({
  phoneNumber: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/),
  password: z.string(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

const logoutSchema = z.object({
  token: z.string(),
  tokenType: z.enum(['access', 'refresh']).optional(),
});

const phoneVerificationSchema = z.object({
  code: z.string().length(6),
});

const updatePhoneSchema = z.object({
  phoneNumber: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/),
  phoneCountryCode: z.string().regex(/^\+[0-9]{1,4}$/).optional(),
});

export default async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);

  // Register endpoint
  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 100 },
          password: { type: 'string', minLength: 8 },
          phoneNumber: { type: 'string', pattern: '^[+]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[0-9]{1,9}$' },
          phoneCountryCode: { type: 'string', pattern: '^\\+[0-9]{1,4}$' },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin', 'author'] },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            isActive: { type: 'boolean' },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);
      const user = await authService.register(data);
      return reply.code(201).send(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      if (error instanceof Error) {
        if (error.message.includes('already exists') || error.message.includes('already taken')) {
          return reply.code(409).send({
            error: 'Conflict',
            message: error.message,
          });
        }
      }
      throw error;
    }
  });

  // Login endpoint
  app.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                username: { type: 'string' },
                role: { type: 'string', enum: ['user', 'admin', 'author'] },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                isActive: { type: 'boolean' },
                isEmailVerified: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = loginSchema.parse(request.body);
      const userAgent = request.headers['user-agent'];
      const ipAddress = request.headers['x-forwarded-for'] as string || 
                       request.headers['x-real-ip'] as string || 
                       request.socket.remoteAddress;
      
      const result = await authService.login(data.email, data.password, userAgent, ipAddress);
      
      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh',
      });
      
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      if (error instanceof Error && 
          (error.message.includes('Invalid email or password') || 
           error.message.includes('Account is deactivated'))) {
        return reply.code(401).send({
          error: 'Authentication Failed',
          message: error.message,
        });
      }
      throw error;
    }
  });

  // Phone login endpoint
  app.post('/login/phone', {
    schema: {
      body: {
        type: 'object',
        required: ['phoneNumber', 'password'],
        properties: {
          phoneNumber: { type: 'string', pattern: '^[+]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[0-9]{1,9}$' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                username: { type: 'string' },
                role: { type: 'string', enum: ['user', 'admin', 'author'] },
                phoneNumber: { type: 'string' },
                phoneCountryCode: { type: 'string' },
                isPhoneVerified: { type: 'boolean' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                isActive: { type: 'boolean' },
                isEmailVerified: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = phoneLoginSchema.parse(request.body);
      const userAgent = request.headers['user-agent'];
      const ipAddress = request.headers['x-forwarded-for'] as string || 
                       request.headers['x-real-ip'] as string || 
                       request.socket.remoteAddress;
      
      const result = await authService.loginWithPhone(data.phoneNumber, data.password, userAgent, ipAddress);
      
      // Set refresh token as httpOnly cookie
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh',
      });
      
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      if (error instanceof Error && 
          (error.message.includes('Invalid phone number or password') || 
           error.message.includes('Account is deactivated'))) {
        return reply.code(401).send({
          error: 'Authentication Failed',
          message: error.message,
        });
      }
      throw error;
    }
  });

  // Refresh token endpoint
  app.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // Try to get refresh token from cookie first, then from body
      const refreshToken = request.cookies.refreshToken || 
                          (request.body as any)?.refreshToken;
      
      if (!refreshToken) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Refresh token is required',
        });
      }
      
      const result = await authService.refreshAccessToken(refreshToken);
      
      // Update refresh token cookie
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh',
      });
      
      return reply.send(result);
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(401).send({
          error: 'Token Refresh Failed',
          message: error.message,
        });
      }
      throw error;
    }
  });

  // Logout endpoint
  app.post('/logout', {
    schema: {
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          tokenType: { type: 'string', enum: ['access', 'refresh'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // Get token from Authorization header or body
      let token: string | undefined;
      let tokenType: 'access' | 'refresh' = 'access';
      
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        tokenType = 'access';
      } else if ((request.body as any)?.token) {
        const data = logoutSchema.parse(request.body);
        token = data.token;
        tokenType = data.tokenType || 'access';
      }
      
      if (!token) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Token is required',
        });
      }
      
      await authService.logout(token, tokenType);
      
      // Clear refresh token cookie
      reply.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      
      return reply.send({
        message: 'Logged out successfully',
        success: true,
      });
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

  // Get current user endpoint (protected)
  app.get('/me', {
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
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin', 'author'] },
            phoneNumber: { type: 'string' },
            phoneCountryCode: { type: 'string' },
            isPhoneVerified: { type: 'boolean' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            isActive: { type: 'boolean' },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = (request as any).user;
    return reply.send(user);
  });

  // Send phone verification code endpoint (protected)
  app.post('/phone/verify/send', {
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
            success: { type: 'boolean' },
            code: { type: 'string' }, // Only in development
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      
      if (!user.phoneNumber) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No phone number associated with this account',
        });
      }

      const code = await authService.sendPhoneVerificationCode(user.id);
      
      const response: any = {
        message: 'Verification code sent to your phone',
        success: true,
      };
      
      // Only return code in development for testing
      if (process.env.NODE_ENV !== 'production') {
        response.code = code;
      }
      
      return reply.send(response);
    } catch (error) {
      if (error instanceof Error) {
        return reply.code(500).send({
          error: 'Send Failed',
          message: error.message,
        });
      }
      throw error;
    }
  });

  // Verify phone number endpoint (protected)
  app.post('/phone/verify', {
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
        required: ['code'],
        properties: {
          code: { type: 'string', minLength: 6, maxLength: 6 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const data = phoneVerificationSchema.parse(request.body);
      
      await authService.verifyPhoneNumber(user.id, data.code);
      
      return reply.send({
        message: 'Phone number verified successfully',
        success: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      if (error instanceof Error) {
        return reply.code(400).send({
          error: 'Verification Failed',
          message: error.message,
        });
      }
      throw error;
    }
  });

  // Update phone number endpoint (protected)
  app.put('/phone', {
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
        required: ['phoneNumber'],
        properties: {
          phoneNumber: { type: 'string', pattern: '^[+]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[0-9]{1,9}$' },
          phoneCountryCode: { type: 'string', pattern: '^\\+[0-9]{1,4}$' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      const data = updatePhoneSchema.parse(request.body);
      
      await authService.updatePhoneNumber(user.id, data.phoneNumber, data.phoneCountryCode);
      
      return reply.send({
        message: 'Phone number updated successfully. Please verify your new phone number.',
        success: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors,
        });
      }
      if (error instanceof Error && error.message.includes('already registered')) {
        return reply.code(409).send({
          error: 'Conflict',
          message: error.message,
        });
      }
      throw error;
    }
  });
}
