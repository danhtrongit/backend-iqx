import { pgTable, uuid, text, timestamp, index, varchar, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('refresh_token_idx').on(table.token),
  userIdIdx: index('refresh_user_id_idx').on(table.userId),
  expiresAtIdx: index('refresh_expires_at_idx').on(table.expiresAt),
}));

export const blacklistedTokens = pgTable('blacklisted_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: text('token').notNull().unique(),
  tokenType: varchar('token_type', { length: 20 }).notNull(), // 'access' or 'refresh'
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  reason: text('reason'),
  expiresAt: timestamp('expires_at').notNull(), // When the token would have expired naturally
  blacklistedAt: timestamp('blacklisted_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('blacklisted_token_idx').on(table.token),
  expiresAtIdx: index('blacklisted_expires_at_idx').on(table.expiresAt),
}));

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type BlacklistedToken = typeof blacklistedTokens.$inferSelect;
export type NewBlacklistedToken = typeof blacklistedTokens.$inferInsert;