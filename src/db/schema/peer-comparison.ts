import { pgTable, varchar, real, timestamp, index, uniqueIndex, integer, jsonb } from 'drizzle-orm/pg-core';
import { stockSymbols } from './stock-symbols';

export const peerComparison = pgTable('peer_comparison', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  
  // Symbol reference - storing as varchar for easier queries
  symbol: varchar('symbol', { length: 10 }).notNull(),
  
  // Foreign key to stock_symbols table
  stockSymbolId: integer('stock_symbol_id')
    .references(() => stockSymbols.id, { onDelete: 'cascade' }),
  
  // The ticker being compared (could be the symbol itself or "Median")
  ticker: varchar('ticker', { length: 50 }).notNull(),
  
  // Market data
  marketCap: real('market_cap'),
  projectedTSR: real('projected_tsr'),
  
  // NPATMI Growth data stored as JSONB
  npatmiGrowth: jsonb('npatmi_growth').$type<{
    '2025F'?: number;
    '2026F'?: number;
  }>(),
  
  // PE data stored as JSONB
  pe: jsonb('pe').$type<{
    '2025F'?: number;
    '2026F'?: number;
  }>(),
  
  // PB data stored as JSONB
  pb: jsonb('pb').$type<{
    '2025F'?: number;
    '2026F'?: number;
  }>(),
  
  // Sector type used for the comparison
  sectorType: varchar('sector_type', { length: 20 }).notNull().default('RA'),
  
  // Metadata
  fetchedAt: timestamp('fetched_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for query optimization
  symbolIdx: index('peer_comparison_symbol_idx').on(table.symbol),
  tickerIdx: index('peer_comparison_ticker_idx').on(table.ticker),
  sectorTypeIdx: index('peer_comparison_sector_type_idx').on(table.sectorType),
  fetchedAtIdx: index('peer_comparison_fetched_at_idx').on(table.fetchedAt),
  // Composite unique index to prevent duplicates
  uniqueSymbolTickerSector: uniqueIndex('peer_comparison_symbol_ticker_sector_idx')
    .on(table.symbol, table.ticker, table.sectorType),
}));

// Type exports
export type PeerComparison = typeof peerComparison.$inferSelect;
export type NewPeerComparison = typeof peerComparison.$inferInsert;

// Interface for API response
export interface PeerComparisonApiResponse {
  serverDateTime: string;
  status: number;
  code: number;
  msg: string;
  exception: string | null;
  successful: boolean;
  data: PeerComparisonData[];
}

export interface PeerComparisonData {
  ticker: string;
  marketCap: number | null;
  projectedTSR: number;
  npatmiGrowth: {
    '2025F': number;
    '2026F': number;
  };
  pe: {
    '2025F': number;
    '2026F': number;
  };
  pb: {
    '2025F': number;
    '2026F': number;
  };
}