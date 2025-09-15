import { pgTable, uuid, varchar, timestamp, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

// Simple user favorites table - one watchlist per user
export const userFavorites = pgTable('user_favorites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  symbol: varchar('symbol', { length: 10 }).notNull(), // Stock symbol (e.g., VNM, VCB)
  
  // Optional user data
  notes: text('notes'), // User notes about this stock
  
  // Metadata
  addedAt: timestamp('added_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: same symbol can't be added twice by same user
  uniqueUserSymbol: uniqueIndex('user_favorites_unique_idx').on(table.userId, table.symbol),
}));

// Relations
export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
}));

// Type exports
export type UserFavorite = typeof userFavorites.$inferSelect;
export type NewUserFavorite = typeof userFavorites.$inferInsert;

// Interface for API responses with stock details
export interface UserFavoriteWithStock extends UserFavorite {
  stock?: {
    id: number;
    symbol: string;
    type: string;
    board: string;
    organName: string | null;
    organShortName: string | null;
    enOrganName: string | null;
    enOrganShortName: string | null;
  };
}