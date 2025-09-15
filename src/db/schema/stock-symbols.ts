import { pgTable, varchar, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const stockSymbols = pgTable('stock_symbols', {
  // Using the ID from the API as primary key
  id: integer('id').primaryKey(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // STOCK, FUND, etc.
  board: varchar('board', { length: 20 }).notNull(), // HSX, HNX, UPCOM
  enOrganName: varchar('en_organ_name', { length: 500 }),
  enOrganShortName: varchar('en_organ_short_name', { length: 255 }),
  organShortName: varchar('organ_short_name', { length: 255 }),
  organName: varchar('organ_name', { length: 500 }),
  productGrpID: varchar('product_grp_id', { length: 20 }),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for search optimization
  symbolIdx: uniqueIndex('stock_symbols_symbol_idx').on(table.symbol),
  boardIdx: index('stock_symbols_board_idx').on(table.board),
  typeIdx: index('stock_symbols_type_idx').on(table.type),
  organNameIdx: index('stock_symbols_organ_name_idx').on(table.organName),
  enOrganNameIdx: index('stock_symbols_en_organ_name_idx').on(table.enOrganName),
  productGrpIdx: index('stock_symbols_product_grp_idx').on(table.productGrpID),
}));

// Type exports
export type StockSymbol = typeof stockSymbols.$inferSelect;
export type NewStockSymbol = typeof stockSymbols.$inferInsert;

// Interface for API response
export interface VietCapSymbolResponse {
  id: number;
  symbol: string;
  type: string;
  board: string;
  enOrganName: string | null;
  enOrganShortName: string | null;
  organShortName: string | null;
  organName: string | null;
  productGrpID: string;
}