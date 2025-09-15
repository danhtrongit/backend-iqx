import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '../types';

/**
 * Check if user has required role(s)
 */
export function hasRole(allowedRoles: UserRole | UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(user.role)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
        statusCode: 403,
      });
    }
  };
}

/**
 * Check if user is admin
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  return hasRole('admin')(request, reply);
}

/**
 * Check if user is author or admin
 */
export async function requireAuthorOrAdmin(request: FastifyRequest, reply: FastifyReply) {
  return hasRole(['author', 'admin'])(request, reply);
}

/**
 * Check if user owns the resource or is admin
 */
export function ownsResourceOrAdmin(getResourceUserId: (request: FastifyRequest) => string | Promise<string>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    // Admins can access any resource
    if (user.role === 'admin') {
      return;
    }

    // Check if user owns the resource
    const resourceUserId = await getResourceUserId(request);
    
    if (resourceUserId !== user.id) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
        statusCode: 403,
      });
    }
  };
}

/**
 * Role hierarchy check
 * admin > author > user
 */
export function hasMinimumRole(minimumRole: UserRole) {
  const roleHierarchy: Record<UserRole, number> = {
    user: 1,
    author: 2,
    admin: 3,
  };

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
        statusCode: 401,
      });
    }

    const userRoleLevel = roleHierarchy[user.role as UserRole];
    const requiredRoleLevel = roleHierarchy[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Minimum role required: ${minimumRole}`,
        statusCode: 403,
      });
    }
  };
}