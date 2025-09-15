import { FastifyRequest } from 'fastify';
import { User } from '../db/schema';

export type UserRole = 'user' | 'admin' | 'author';

export interface JWTPayload {
  sub: string; // user id
  email: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload extends JWTPayload {
  tokenId: string; // refresh token id for tracking
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: User;
  token?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password'>;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}