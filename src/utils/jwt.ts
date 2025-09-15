import { FastifyInstance } from 'fastify';
import { JWTPayload, RefreshTokenPayload } from '../types';
import { User } from '../db/schema';
import { config } from '../config/env';

export function generateAccessToken(app: FastifyInstance, user: User): string {
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role as 'user' | 'admin' | 'author',
  };
  
  return app.jwt.sign(payload, {
    expiresIn: config.JWT_ACCESS_EXPIRY,
  });
}

export function generateRefreshToken(app: FastifyInstance, user: User, tokenId: string): string {
  const payload: RefreshTokenPayload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role as 'user' | 'admin' | 'author',
    tokenId,
  };
  
  return app.jwt.sign(payload, {
    expiresIn: config.JWT_REFRESH_EXPIRY,
    key: Buffer.from(config.JWT_REFRESH_SECRET),
  });
}

export async function verifyAccessToken(app: FastifyInstance, token: string): Promise<JWTPayload> {
  return app.jwt.verify(token) as JWTPayload;
}

export async function verifyRefreshToken(app: FastifyInstance, token: string): Promise<RefreshTokenPayload> {
  return app.jwt.verify(token, {
    key: Buffer.from(config.JWT_REFRESH_SECRET),
  }) as RefreshTokenPayload;
}

export function parseExpiryToMs(expiry: string): number {
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiry}`);
  }
  
  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}