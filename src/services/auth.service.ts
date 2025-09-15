import { FastifyInstance } from 'fastify';
import { eq, and, gte, not } from 'drizzle-orm';
import { db } from '../db';
import { users, refreshTokens, blacklistedTokens, User, NewUser } from '../db/schema';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, parseExpiryToMs } from '../utils/jwt';
import { config } from '../config/env';
import { LoginResponse } from '../types';

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(userData: {
    email: string;
    username: string;
    password: string;
    phoneNumber?: string;
    phoneCountryCode?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    const existingUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, userData.username))
      .limit(1);

    if (existingUsername.length > 0) {
      throw new Error('Username already taken');
    }

    // Check if phone number already exists (if provided)
    if (userData.phoneNumber) {
      const existingPhone = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, userData.phoneNumber))
        .limit(1);

      if (existingPhone.length > 0) {
        throw new Error('Phone number already registered');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create user
    const newUser: NewUser = {
      ...userData,
      password: hashedPassword,
    };

    const [createdUser] = await db.insert(users).values(newUser).returning();
    
    // Remove password from response
    const { password, ...userWithoutPassword } = createdUser;
    return userWithoutPassword as User;
  }

  async login(email: string, password: string, userAgent?: string, ipAddress?: string): Promise<LoginResponse> {
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Generate tokens
    const accessToken = generateAccessToken(this.app, user);
    
    // Create refresh token record
    const refreshTokenExpiry = new Date(Date.now() + parseExpiryToMs(config.JWT_REFRESH_EXPIRY));
    const [refreshTokenRecord] = await db
      .insert(refreshTokens)
      .values({
        token: '', // Will be updated with actual token
        userId: user.id,
        userAgent,
        ipAddress,
        expiresAt: refreshTokenExpiry,
      })
      .returning();

    const refreshToken = generateRefreshToken(this.app, user, refreshTokenRecord.id);
    
    // Update refresh token with actual token
    await db
      .update(refreshTokens)
      .set({ token: refreshToken })
      .where(eq(refreshTokens.id, refreshTokenRecord.id));

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Check if token is blacklisted
    const [blacklisted] = await db
      .select()
      .from(blacklistedTokens)
      .where(eq(blacklistedTokens.token, refreshToken))
      .limit(1);

    if (blacklisted) {
      throw new Error('Token has been revoked');
    }

    // Find refresh token record
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.token, refreshToken),
        gte(refreshTokens.expiresAt, new Date())
      ))
      .limit(1);

    if (!tokenRecord) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new access token
    const accessToken = generateAccessToken(this.app, user);

    // Optionally rotate refresh token
    // Delete old token
    await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));

    // Create new refresh token
    const refreshTokenExpiry = new Date(Date.now() + parseExpiryToMs(config.JWT_REFRESH_EXPIRY));
    const [newRefreshTokenRecord] = await db
      .insert(refreshTokens)
      .values({
        token: '',
        userId: user.id,
        userAgent: tokenRecord.userAgent,
        ipAddress: tokenRecord.ipAddress,
        expiresAt: refreshTokenExpiry,
      })
      .returning();

    const newRefreshToken = generateRefreshToken(this.app, user, newRefreshTokenRecord.id);
    
    await db
      .update(refreshTokens)
      .set({ token: newRefreshToken })
      .where(eq(refreshTokens.id, newRefreshTokenRecord.id));

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string, tokenType: 'access' | 'refresh' = 'access'): Promise<void> {
    // Add token to blacklist
    const expiresAt = new Date(Date.now() + parseExpiryToMs(
      tokenType === 'access' ? config.JWT_ACCESS_EXPIRY : config.JWT_REFRESH_EXPIRY
    ));

    await db.insert(blacklistedTokens).values({
      token,
      tokenType,
      expiresAt,
      reason: 'User logout',
    });

    // If it's a refresh token, also delete it from refresh_tokens table
    if (tokenType === 'refresh') {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const [blacklisted] = await db
      .select()
      .from(blacklistedTokens)
      .where(and(
        eq(blacklistedTokens.token, token),
        gte(blacklistedTokens.expiresAt, new Date())
      ))
      .limit(1);

    return !!blacklisted;
  }

  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    
    // Delete expired refresh tokens
    await db.delete(refreshTokens).where(gte(now, refreshTokens.expiresAt));
    
    // Delete expired blacklisted tokens
    await db.delete(blacklistedTokens).where(gte(now, blacklistedTokens.expiresAt));
  }

  async loginWithPhone(phoneNumber: string, password: string, userAgent?: string, ipAddress?: string): Promise<LoginResponse> {
    // Find user by phone number
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user) {
      throw new Error('Invalid phone number or password');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid phone number or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Generate tokens
    const accessToken = generateAccessToken(this.app, user);
    
    // Create refresh token record
    const refreshTokenExpiry = new Date(Date.now() + parseExpiryToMs(config.JWT_REFRESH_EXPIRY));
    const [refreshTokenRecord] = await db
      .insert(refreshTokens)
      .values({
        token: '', // Will be updated with actual token
        userId: user.id,
        userAgent,
        ipAddress,
        expiresAt: refreshTokenExpiry,
      })
      .returning();

    const refreshToken = generateRefreshToken(this.app, user, refreshTokenRecord.id);
    
    // Update refresh token with actual token
    await db
      .update(refreshTokens)
      .set({ token: refreshToken })
      .where(eq(refreshTokens.id, refreshTokenRecord.id));

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  }

  async sendPhoneVerificationCode(userId: string): Promise<string> {
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with verification code
    await db
      .update(users)
      .set({
        phoneVerificationCode: code,
        phoneVerificationExpires: expiresAt,
      })
      .where(eq(users.id, userId));

    // In production, you would send this via SMS
    // For now, we'll return it (only for development)
    return code;
  }

  async verifyPhoneNumber(userId: string, code: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.phoneVerificationCode || !user.phoneVerificationExpires) {
      throw new Error('No verification code requested');
    }

    if (new Date() > user.phoneVerificationExpires) {
      throw new Error('Verification code expired');
    }

    if (user.phoneVerificationCode !== code) {
      throw new Error('Invalid verification code');
    }

    // Mark phone as verified
    await db
      .update(users)
      .set({
        isPhoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpires: null,
      })
      .where(eq(users.id, userId));

    return true;
  }

  async updatePhoneNumber(userId: string, phoneNumber: string, phoneCountryCode?: string): Promise<void> {
    // Check if phone number already exists
    const [existingPhone] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.phoneNumber, phoneNumber),
        not(eq(users.id, userId))
      ))
      .limit(1);

    if (existingPhone) {
      throw new Error('Phone number already registered');
    }

    // Update phone number
    await db
      .update(users)
      .set({
        phoneNumber,
        phoneCountryCode,
        isPhoneVerified: false,
      })
      .where(eq(users.id, userId));
  }
}