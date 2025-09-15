import { FastifyInstance } from 'fastify';
import { eq, like, ilike, or, and, sql, desc, asc } from 'drizzle-orm';
import { db } from '../db';
import { stockSymbols, StockSymbol, NewStockSymbol, VietCapSymbolResponse } from '../db/schema/stock-symbols';

export interface SearchStockSymbolsParams {
  query?: string;
  symbol?: string;
  board?: string;
  type?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'symbol' | 'organName' | 'board' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchStockSymbolsResult {
  data: StockSymbol[];
  total: number;
  limit: number;
  offset: number;
}

export class StockSymbolsService {
  constructor(private app: FastifyInstance) {}

  /**
   * Fetch all stock symbols from VietCap API
   */
  async fetchFromVietCapAPI(): Promise<VietCapSymbolResponse[]> {
    try {
      const response = await fetch('https://trading.vietcap.com.vn/api/price/symbols/getAll', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch symbols from VietCap API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from VietCap API');
      }

      this.app.log.info(`Fetched ${data.length} symbols from VietCap API`);
      return data;
    } catch (error) {
      this.app.log.error('Error fetching symbols from VietCap API:', error);
      throw error;
    }
  }

  /**
   * Import symbols from VietCap API to database
   * This will only import if the table is empty
   */
  async importSymbols(force: boolean = false): Promise<{ imported: number; skipped: number }> {
    try {
      // Check if we already have data
      if (!force) {
        const existingCount = await this.getSymbolCount();
        if (existingCount > 0) {
          this.app.log.info(`Stock symbols table already contains ${existingCount} records. Skipping import.`);
          return { imported: 0, skipped: existingCount };
        }
      }

      // Fetch data from API
      const apiSymbols = await this.fetchFromVietCapAPI();
      
      if (apiSymbols.length === 0) {
        this.app.log.warn('No symbols received from VietCap API');
        return { imported: 0, skipped: 0 };
      }

      // Prepare data for insertion
      const symbolsToInsert: NewStockSymbol[] = apiSymbols.map(symbol => ({
        id: symbol.id,
        symbol: symbol.symbol,
        type: symbol.type,
        board: symbol.board,
        enOrganName: symbol.enOrganName,
        enOrganShortName: symbol.enOrganShortName,
        organShortName: symbol.organShortName,
        organName: symbol.organName,
        productGrpID: symbol.productGrpID,
      }));

      // Insert in batches to avoid memory issues
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < symbolsToInsert.length; i += batchSize) {
        const batch = symbolsToInsert.slice(i, i + batchSize);
        
        // Use ON CONFLICT to handle duplicates
        await db
          .insert(stockSymbols)
          .values(batch)
          .onConflictDoUpdate({
            target: stockSymbols.id,
            set: {
              symbol: sql`excluded.symbol`,
              type: sql`excluded.type`,
              board: sql`excluded.board`,
              enOrganName: sql`excluded.en_organ_name`,
              enOrganShortName: sql`excluded.en_organ_short_name`,
              organShortName: sql`excluded.organ_short_name`,
              organName: sql`excluded.organ_name`,
              productGrpID: sql`excluded.product_grp_id`,
              updatedAt: new Date(),
            }
          });
        
        imported += batch.length;
        this.app.log.info(`Imported ${imported}/${symbolsToInsert.length} symbols`);
      }

      this.app.log.info(`Successfully imported ${imported} stock symbols`);
      return { imported, skipped: 0 };
    } catch (error) {
      this.app.log.error('Error importing stock symbols:', error);
      throw error;
    }
  }

  /**
   * Get total count of symbols in database
   */
  async getSymbolCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(stockSymbols);
    
    return Number(result[0]?.count || 0);
  }

  /**
   * Search stock symbols with various filters
   * Prioritizes symbol matches over name matches
   */
  async searchSymbols(params: SearchStockSymbolsParams): Promise<SearchStockSymbolsResult> {
    const {
      query,
      symbol,
      board,
      type,
      limit = 20,
      offset = 0,
      sortBy = 'symbol',
      sortOrder = 'asc'
    } = params;

    // Build where conditions
    const conditions = [];

    // General search query (searches in symbol, organName, enOrganName)
    if (query) {
      const searchPattern = `%${query}%`;
      conditions.push(
        or(
          ilike(stockSymbols.symbol, searchPattern),
          ilike(stockSymbols.organName, searchPattern),
          ilike(stockSymbols.enOrganName, searchPattern),
          ilike(stockSymbols.organShortName, searchPattern),
          ilike(stockSymbols.enOrganShortName, searchPattern)
        )
      );
    }

    // Specific field filters
    if (symbol) {
      conditions.push(ilike(stockSymbols.symbol, `${symbol}%`));
    }

    if (board) {
      conditions.push(eq(stockSymbols.board, board.toUpperCase()));
    }

    if (type) {
      conditions.push(eq(stockSymbols.type, type.toUpperCase()));
    }

    // Combine conditions
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order column
    const orderColumn = {
      symbol: stockSymbols.symbol,
      organName: stockSymbols.organName,
      board: stockSymbols.board,
      type: stockSymbols.type,
    }[sortBy] || stockSymbols.symbol;

    const orderDirection = sortOrder === 'desc' ? desc : asc;

    // Execute queries
    let dataQuery = db
      .select({
        id: stockSymbols.id,
        symbol: stockSymbols.symbol,
        type: stockSymbols.type,
        board: stockSymbols.board,
        enOrganName: stockSymbols.enOrganName,
        enOrganShortName: stockSymbols.enOrganShortName,
        organShortName: stockSymbols.organShortName,
        organName: stockSymbols.organName,
        productGrpID: stockSymbols.productGrpID,
        createdAt: stockSymbols.createdAt,
        updatedAt: stockSymbols.updatedAt,
        // Add priority score for sorting when there's a query
        ...(query ? {
          priority: sql<number>`
            CASE 
              -- Exact matches (highest priority)
              WHEN UPPER(${stockSymbols.symbol}) = UPPER(${query}) THEN 1
              WHEN UPPER(${stockSymbols.organShortName}) = UPPER(${query}) THEN 2
              WHEN UPPER(${stockSymbols.organName}) = UPPER(${query}) THEN 3
              
              -- Symbol prefix matches
              WHEN UPPER(${stockSymbols.symbol}) LIKE UPPER(${query + '%'}) THEN 4
              
              -- Organization name starts with query
              WHEN UPPER(${stockSymbols.organShortName}) LIKE UPPER(${query + '%'}) THEN 5
              WHEN UPPER(${stockSymbols.organName}) LIKE UPPER(${query + '%'}) THEN 6
              
              -- Symbol contains query
              WHEN UPPER(${stockSymbols.symbol}) LIKE UPPER(${'%' + query + '%'}) THEN 7
              
              -- Organization name contains query (word boundary)
              WHEN UPPER(${stockSymbols.organShortName}) LIKE UPPER(${'% ' + query + '%'}) THEN 8
              WHEN UPPER(${stockSymbols.organName}) LIKE UPPER(${'% ' + query + '%'}) THEN 9
              
              -- Organization name contains query (anywhere)
              WHEN UPPER(${stockSymbols.organShortName}) LIKE UPPER(${'%' + query + '%'}) THEN 10
              WHEN UPPER(${stockSymbols.organName}) LIKE UPPER(${'%' + query + '%'}) THEN 11
              
              -- English names (lower priority)
              WHEN UPPER(${stockSymbols.enOrganShortName}) LIKE UPPER(${'%' + query + '%'}) THEN 12
              WHEN UPPER(${stockSymbols.enOrganName}) LIKE UPPER(${'%' + query + '%'}) THEN 13
              
              ELSE 14
            END
          `.as('priority')
        } : {})
      })
      .from(stockSymbols)
      .where(whereClause);

    // Apply ordering
    if (query && !symbol) {
      // Sort by priority first, then by the selected column
      dataQuery = dataQuery.orderBy(
        sql`priority`,
        orderDirection(orderColumn)
      );
    } else {
      // Normal ordering
      dataQuery = dataQuery.orderBy(orderDirection(orderColumn));
    }

    const [data, countResult] = await Promise.all([
      // Get paginated data
      dataQuery.limit(limit).offset(offset),
      
      // Get total count
      db
        .select({ count: sql<number>`count(*)` })
        .from(stockSymbols)
        .where(whereClause)
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      data,
      total,
      limit,
      offset
    };
  }

  /**
   * Get a single stock symbol by ID
   */
  async getSymbolById(id: number): Promise<StockSymbol | null> {
    const [symbol] = await db
      .select()
      .from(stockSymbols)
      .where(eq(stockSymbols.id, id))
      .limit(1);

    return symbol || null;
  }

  /**
   * Get a single stock symbol by symbol code
   */
  async getSymbolByCode(symbol: string): Promise<StockSymbol | null> {
    const [result] = await db
      .select()
      .from(stockSymbols)
      .where(eq(stockSymbols.symbol, symbol.toUpperCase()))
      .limit(1);

    return result || null;
  }

  /**
   * Get all unique boards
   */
  async getBoards(): Promise<string[]> {
    const result = await db
      .selectDistinct({ board: stockSymbols.board })
      .from(stockSymbols)
      .orderBy(stockSymbols.board);

    return result.map(r => r.board);
  }

  /**
   * Get all unique types
   */
  async getTypes(): Promise<string[]> {
    const result = await db
      .selectDistinct({ type: stockSymbols.type })
      .from(stockSymbols)
      .orderBy(stockSymbols.type);

    return result.map(r => r.type);
  }

  /**
   * Get symbols by board
   */
  async getSymbolsByBoard(board: string): Promise<StockSymbol[]> {
    return await db
      .select()
      .from(stockSymbols)
      .where(eq(stockSymbols.board, board.toUpperCase()))
      .orderBy(stockSymbols.symbol);
  }

  /**
   * Update symbol data (manual update)
   */
  async updateSymbol(id: number, data: Partial<NewStockSymbol>): Promise<StockSymbol | null> {
    const [updated] = await db
      .update(stockSymbols)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(stockSymbols.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Delete a symbol (rarely used)
   */
  async deleteSymbol(id: number): Promise<boolean> {
    const result = await db
      .delete(stockSymbols)
      .where(eq(stockSymbols.id, id));

    return result.count > 0;
  }
}