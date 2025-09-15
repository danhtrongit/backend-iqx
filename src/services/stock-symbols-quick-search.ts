import { db } from '../db';
import { stockSymbols, StockSymbol } from '../db/schema/stock-symbols';
import { sql, ilike, or, and, eq } from 'drizzle-orm';

export interface QuickSearchResult {
  symbol: string;
  name: string;
  board: string;
  type: string;
  match_type: 'exact_symbol' | 'exact_name' | 'prefix_symbol' | 'prefix_name' | 'contains';
  matched_field: 'symbol' | 'name' | 'both';
}

/**
 * Quick search optimized for symbol lookup
 * Returns top matches prioritizing symbol matches
 */
export async function quickSearchSymbols(
  query: string, 
  limit: number = 10,
  board?: string
): Promise<QuickSearchResult[]> {
  if (!query || query.length < 1) {
    return [];
  }

  const upperQuery = query.toUpperCase();
  
  // Build where clause
  const conditions = [
    or(
      ilike(stockSymbols.symbol, `%${query}%`),
      ilike(stockSymbols.organName, `%${query}%`),
      ilike(stockSymbols.organShortName, `%${query}%`)
    )
  ];

  if (board) {
    conditions.push(eq(stockSymbols.board, board.toUpperCase()));
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  // Query with priority scoring
  const results = await db
    .select({
      symbol: stockSymbols.symbol,
      organName: stockSymbols.organName,
      organShortName: stockSymbols.organShortName,
      board: stockSymbols.board,
      type: stockSymbols.type,
      priority: sql<number>`
        CASE 
          -- Exact matches (highest priority)
          WHEN UPPER(${stockSymbols.symbol}) = ${upperQuery} THEN 1
          WHEN UPPER(${stockSymbols.organShortName}) = ${upperQuery} THEN 2
          WHEN UPPER(${stockSymbols.organName}) = ${upperQuery} THEN 3
          
          -- Symbol starts with query
          WHEN UPPER(${stockSymbols.symbol}) LIKE ${upperQuery + '%'} THEN 4
          
          -- Organization name starts with query (very relevant)
          WHEN UPPER(${stockSymbols.organShortName}) LIKE ${upperQuery + '%'} THEN 5
          WHEN UPPER(${stockSymbols.organName}) LIKE ${upperQuery + '%'} THEN 6
          
          -- Symbol contains query
          WHEN UPPER(${stockSymbols.symbol}) LIKE ${'%' + upperQuery + '%'} THEN 7
          
          -- Organization name contains query at word boundary
          WHEN UPPER(${stockSymbols.organShortName}) LIKE ${'% ' + upperQuery + '%'} THEN 8
          WHEN UPPER(${stockSymbols.organName}) LIKE ${'% ' + upperQuery + '%'} THEN 9
          
          -- Organization name contains query anywhere
          WHEN UPPER(${stockSymbols.organShortName}) LIKE ${'%' + upperQuery + '%'} THEN 10
          WHEN UPPER(${stockSymbols.organName}) LIKE ${'%' + upperQuery + '%'} THEN 11
          
          ELSE 12
        END
      `.as('priority')
    })
    .from(stockSymbols)
    .where(whereClause)
    .orderBy(sql`priority`, stockSymbols.symbol)
    .limit(limit);

  // Transform results with match type
  return results.map(r => {
    const name = r.organShortName || r.organName || '';
    const symbolUpper = r.symbol.toUpperCase();
    const nameUpper = name.toUpperCase();
    
    let matchType: 'exact_symbol' | 'exact_name' | 'prefix_symbol' | 'prefix_name' | 'contains' = 'contains';
    let matchedField: 'symbol' | 'name' | 'both' = 'symbol';
    
    // Check exact matches
    if (symbolUpper === upperQuery) {
      matchType = 'exact_symbol';
      matchedField = 'symbol';
    } else if (nameUpper === upperQuery) {
      matchType = 'exact_name';
      matchedField = 'name';
    }
    // Check prefix matches
    else if (symbolUpper.startsWith(upperQuery)) {
      matchType = 'prefix_symbol';
      matchedField = 'symbol';
    } else if (nameUpper.startsWith(upperQuery)) {
      matchType = 'prefix_name';
      matchedField = 'name';
    }
    // Check contains matches
    else {
      const symbolContains = symbolUpper.includes(upperQuery);
      const nameContains = nameUpper.includes(upperQuery);
      
      if (symbolContains && nameContains) {
        matchedField = 'both';
      } else if (nameContains) {
        matchedField = 'name';
      } else {
        matchedField = 'symbol';
      }
    }

    return {
      symbol: r.symbol,
      name: name || r.symbol,
      board: r.board,
      type: r.type,
      match_type: matchType,
      matched_field: matchedField
    };
  });
}

/**
 * Get symbols that start with specific letters
 * Useful for alphabetical browsing
 */
export async function getSymbolsByPrefix(
  prefix: string,
  board?: string,
  limit: number = 100
): Promise<StockSymbol[]> {
  const conditions = [
    ilike(stockSymbols.symbol, `${prefix}%`)
  ];

  if (board) {
    conditions.push(eq(stockSymbols.board, board.toUpperCase()));
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  return await db
    .select()
    .from(stockSymbols)
    .where(whereClause)
    .orderBy(stockSymbols.symbol)
    .limit(limit);
}

/**
 * Search for exact symbol match (case-insensitive)
 * Returns single result or null
 */
export async function findExactSymbol(symbol: string): Promise<StockSymbol | null> {
  const [result] = await db
    .select()
    .from(stockSymbols)
    .where(eq(sql`UPPER(${stockSymbols.symbol})`, symbol.toUpperCase()))
    .limit(1);

  return result || null;
}