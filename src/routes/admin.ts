import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, and, or, like, desc, asc } from 'drizzle-orm';
import { hasRole, requireAdmin } from '../middleware/authorization';
import { hashPassword } from '../utils/password';
import { UserRole } from '../types';

// Request schemas
const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
  phoneNumber: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['user', 'admin', 'author']).default('user'),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(3).max(100).optional(),
  password: z.string().min(8).optional(),
  phoneNumber: z.string().optional(),
  phoneCountryCode: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['user', 'admin', 'author']).optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
  isPhoneVerified: z.boolean().optional(),
});

const getUsersQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  search: z.string().optional(),
  role: z.enum(['user', 'admin', 'author']).optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'email', 'username']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export default async function adminRoutes(app: FastifyInstance) {
  // Get all users (admin only)
  app.get('/users', {
    preHandler: [app.authenticate, requireAdmin],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', default: '1' },
          limit: { type: 'string', default: '10' },
          search: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin', 'author'] },
          isActive: { type: 'string', enum: ['true', 'false'] },
          sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'email', 'username'] },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const query = getUsersQuerySchema.parse(request.query);
      const offset = (query.page - 1) * query.limit;

      // Build where conditions
      const conditions = [];
      
      if (query.search) {
        conditions.push(
          or(
            like(users.email, `%${query.search}%`),
            like(users.username, `%${query.search}%`),
            like(users.firstName, `%${query.search}%`),
            like(users.lastName, `%${query.search}%`)
          )
        );
      }

      if (query.role) {
        conditions.push(eq(users.role, query.role));
      }

      if (query.isActive !== undefined) {
        conditions.push(eq(users.isActive, query.isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get users with pagination
      const orderBy = query.sortOrder === 'asc' 
        ? asc(users[query.sortBy as keyof typeof users])
        : desc(users[query.sortBy as keyof typeof users]);

      const [usersList, totalCount] = await Promise.all([
        db
          .select({
            id: users.id,
            email: users.email,
            username: users.username,
            phoneNumber: users.phoneNumber,
            phoneCountryCode: users.phoneCountryCode,
            isPhoneVerified: users.isPhoneVerified,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            isActive: users.isActive,
            isEmailVerified: users.isEmailVerified,
            lastLogin: users.lastLogin,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(whereClause)
          .orderBy(orderBy)
          .limit(query.limit)
          .offset(offset),
        db
          .select({ count: users.id })
          .from(users)
          .where(whereClause)
          .then(result => result.length),
      ]);

      const totalPages = Math.ceil(totalCount / query.limit);

      return reply.send({
        data: usersList,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: totalCount,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1,
        },
      });
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

  // Get single user by ID (admin only)
  app.get('/users/:userId', {
    preHandler: [app.authenticate, requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        phoneNumber: users.phoneNumber,
        phoneCountryCode: users.phoneCountryCode,
        isPhoneVerified: users.isPhoneVerified,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        isEmailVerified: users.isEmailVerified,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return reply.send(user);
  });

  // Create new user (admin only)
  app.post('/users', {
    preHandler: [app.authenticate, requireAdmin],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'username', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 100 },
          password: { type: 'string', minLength: 8 },
          phoneNumber: { type: 'string' },
          phoneCountryCode: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin', 'author'] },
          isActive: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = createUserSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(or(
          eq(users.email, data.email),
          eq(users.username, data.username)
        ))
        .limit(1);

      if (existingUser.length > 0) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'User with this email or username already exists',
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          ...data,
          password: hashedPassword,
        })
        .returning();

      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;

      return reply.code(201).send(userWithoutPassword);
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

  // Update user (admin only)
  app.put('/users/:userId', {
    preHandler: [app.authenticate, requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 100 },
          password: { type: 'string', minLength: 8 },
          phoneNumber: { type: 'string' },
          phoneCountryCode: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin', 'author'] },
          isActive: { type: 'boolean' },
          isEmailVerified: { type: 'boolean' },
          isPhoneVerified: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const data = updateUserSchema.parse(request.body);

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Prepare update data
      const updateData: any = { ...data, updatedAt: new Date() };

      // Hash password if provided
      if (data.password) {
        updateData.password = await hashPassword(data.password);
      }

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;

      return reply.send(userWithoutPassword);
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

  // Delete user (admin only)
  app.delete('/users/:userId', {
    preHandler: [app.authenticate, requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    // Prevent admin from deleting themselves
    const currentUser = (request as any).user;
    if (currentUser.id === userId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'You cannot delete your own account',
      });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Delete user
    await db
      .delete(users)
      .where(eq(users.id, userId));

    return reply.send({
      message: 'User deleted successfully',
      success: true,
    });
  });

  // Change user role (admin only)
  app.patch('/users/:userId/role', {
    preHandler: [app.authenticate, requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['user', 'admin', 'author'] },
        },
      },
    },
  }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { role } = request.body as { role: UserRole };

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Update role
    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return reply.send({
      message: `User role updated to ${role}`,
      user: userWithoutPassword,
    });
  });

  // Toggle user active status (admin only)
  app.patch('/users/:userId/toggle-active', {
    preHandler: [app.authenticate, requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    // Prevent admin from deactivating themselves
    const currentUser = (request as any).user;
    if (currentUser.id === userId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'You cannot deactivate your own account',
      });
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      return reply.code(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Toggle active status
    const [updatedUser] = await db
      .update(users)
      .set({ 
        isActive: !existingUser.isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    return reply.send({
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: userWithoutPassword,
    });
  });

  // Get user statistics (admin only)
  app.get('/stats', {
    preHandler: [app.authenticate, requireAdmin],
  }, async (request, reply) => {
    const [
      totalUsers,
      activeUsers,
      verifiedEmails,
      verifiedPhones,
      roleStats,
    ] = await Promise.all([
      // Total users
      db.select({ count: users.id }).from(users).then(r => r.length),
      
      // Active users
      db.select({ count: users.id }).from(users).where(eq(users.isActive, true)).then(r => r.length),
      
      // Verified emails
      db.select({ count: users.id }).from(users).where(eq(users.isEmailVerified, true)).then(r => r.length),
      
      // Verified phones
      db.select({ count: users.id }).from(users).where(eq(users.isPhoneVerified, true)).then(r => r.length),
      
      // Users by role
      db
        .select({
          role: users.role,
          count: users.id,
        })
        .from(users)
        .groupBy(users.role),
    ]);

    const roleBreakdown = {
      user: 0,
      admin: 0,
      author: 0,
    };

    roleStats.forEach(stat => {
      if (stat.role) {
        roleBreakdown[stat.role as UserRole] = 1; // Since we're counting by id, each row represents one user
      }
    });

    return reply.send({
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      emailVerified: verifiedEmails,
      phoneVerified: verifiedPhones,
      byRole: roleBreakdown,
      verificationRate: {
        email: totalUsers > 0 ? (verifiedEmails / totalUsers * 100).toFixed(2) + '%' : '0%',
        phone: totalUsers > 0 ? (verifiedPhones / totalUsers * 100).toFixed(2) + '%' : '0%',
      },
    });
  });
}