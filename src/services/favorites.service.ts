import { FastifyInstance } from 'fastify';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { db } from '../db';
import { 
  userFavorites, 
  UserFavorite, 
  UserFavoriteWithStock,
  stockSymbols
} from '../db/schema';

export class FavoritesService {
  constructor(private app: FastifyInstance) {}

  /**
   * Get all user favorites with stock details
   */
  async getUserFavorites(userId: string): Promise<UserFavoriteWithStock[]> {
    const favorites = await db
      .select({
        favorite: userFavorites,
        stock: {
          id: stockSymbols.id,
          symbol: stockSymbols.symbol,
          type: stockSymbols.type,
          board: stockSymbols.board,
          organName: stockSymbols.organName,
          organShortName: stockSymbols.organShortName,
          enOrganName: stockSymbols.enOrganName,
          enOrganShortName: stockSymbols.enOrganShortName,
        },
      })
      .from(userFavorites)
      .leftJoin(stockSymbols, eq(userFavorites.symbol, stockSymbols.symbol))
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.addedAt));

    return favorites.map(({ favorite, stock }) => ({
      ...favorite,
      stock: stock || undefined,
    }));
  }

  /**
   * Get user favorite symbols only (simple list)
   */
  async getUserFavoriteSymbols(userId: string): Promise<string[]> {
    const favorites = await db
      .select({ symbol: userFavorites.symbol })
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.addedAt));

    return favorites.map(f => f.symbol);
  }

  /**
   * Add symbol to favorites
   */
  async addToFavorites(userId: string, symbol: string, notes?: string): Promise<UserFavorite> {
    // Check if already exists
    const [existing] = await db
      .select()
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.symbol, symbol.toUpperCase())
      ))
      .limit(1);

    if (existing) {
      throw new Error(`${symbol} is already in your favorites`);
    }

    // Add to favorites
    const [favorite] = await db
      .insert(userFavorites)
      .values({
        userId,
        symbol: symbol.toUpperCase(),
        notes,
      })
      .returning();

    return favorite;
  }

  /**
   * Add multiple symbols to favorites
   */
  async batchAddToFavorites(userId: string, symbols: string[]): Promise<{ added: number; skipped: number }> {
    // Normalize symbols
    const normalizedSymbols = symbols.map(s => s.toUpperCase());

    // Get existing favorites
    const existing = await db
      .select({ symbol: userFavorites.symbol })
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        inArray(userFavorites.symbol, normalizedSymbols)
      ));

    const existingSymbols = new Set(existing.map(e => e.symbol));
    
    // Filter out already existing
    const toAdd = normalizedSymbols.filter(symbol => !existingSymbols.has(symbol));

    if (toAdd.length === 0) {
      return { added: 0, skipped: symbols.length };
    }

    // Add new favorites
    await db.insert(userFavorites).values(
      toAdd.map(symbol => ({
        userId,
        symbol,
      }))
    );

    return {
      added: toAdd.length,
      skipped: symbols.length - toAdd.length,
    };
  }

  /**
   * Update favorite notes
   */
  async updateFavoriteNotes(userId: string, symbol: string, notes: string): Promise<UserFavorite | null> {
    const [updated] = await db
      .update(userFavorites)
      .set({ 
        notes,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.symbol, symbol.toUpperCase())
      ))
      .returning();

    return updated || null;
  }

  /**
   * Remove symbol from favorites
   */
  async removeFromFavorites(userId: string, symbol: string): Promise<boolean> {
    const result = await db
      .delete(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.symbol, symbol.toUpperCase())
      ));

    return result.count > 0;
  }

  /**
   * Remove multiple symbols from favorites
   */
  async batchRemoveFromFavorites(userId: string, symbols: string[]): Promise<number> {
    const normalizedSymbols = symbols.map(s => s.toUpperCase());
    
    const result = await db
      .delete(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        inArray(userFavorites.symbol, normalizedSymbols)
      ));

    return result.count;
  }

  /**
   * Check if symbol is in favorites
   */
  async isFavorite(userId: string, symbol: string): Promise<boolean> {
    const [favorite] = await db
      .select({ id: userFavorites.id })
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.symbol, symbol.toUpperCase())
      ))
      .limit(1);

    return !!favorite;
  }

  /**
   * Check multiple symbols if they are favorites
   */
  async checkFavorites(userId: string, symbols: string[]): Promise<Record<string, boolean>> {
    const normalizedSymbols = symbols.map(s => s.toUpperCase());
    
    const favorites = await db
      .select({ symbol: userFavorites.symbol })
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        inArray(userFavorites.symbol, normalizedSymbols)
      ));

    const favoriteSet = new Set(favorites.map(f => f.symbol));
    
    const result: Record<string, boolean> = {};
    normalizedSymbols.forEach(symbol => {
      result[symbol] = favoriteSet.has(symbol);
    });

    return result;
  }

  /**
   * Clear all favorites for user
   */
  async clearFavorites(userId: string): Promise<number> {
    const result = await db
      .delete(userFavorites)
      .where(eq(userFavorites.userId, userId));

    return result.count;
  }

  /**
   * Get favorites count
   */
  async getFavoritesCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: userFavorites.id })
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId));

    return result ? 1 : 0;
  }
}