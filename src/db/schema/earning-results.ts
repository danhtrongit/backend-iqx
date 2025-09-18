import { pgTable, varchar, real, integer, timestamp, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';

export const earningResults = pgTable('earning_results', {
  // Primary key
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  
  // Symbol reference
  symbol: varchar('symbol', { length: 10 }).notNull(),
  
  // Time information
  cumulativeQuarter: varchar('cumulative_quarter', { length: 10 }), // H1, H2, Q1, Q2, Q3, Q4
  currentYear: integer('current_year').notNull(),
  
  // Revenue metrics
  revenuePrevYear: real('revenue_prev_year'),
  revenueCurrentForecast: real('revenue_current_forecast'),
  revenueCurrentCumulative: real('revenue_current_cumulative'),
  revenuePercentOfYear: real('revenue_percent_of_year'),
  
  // Revenue growth metrics
  revenueGrowthPrevYear: real('revenue_growth_prev_year'),
  revenueGrowthCurrentForecast: real('revenue_growth_current_forecast'),
  revenueGrowthCurrentCumulative: real('revenue_growth_current_cumulative'),
  
  // NPAT MI (Net Profit After Tax - Minority Interest) metrics
  npatMiPrevYear: real('npat_mi_prev_year'),
  npatMiCurrentForecast: real('npat_mi_current_forecast'),
  npatMiCurrentCumulative: real('npat_mi_current_cumulative'),
  npatMiPercentOfYear: real('npat_mi_percent_of_year'),
  
  // NPAT MI growth metrics
  npatMiGrowthPrevYear: real('npat_mi_growth_prev_year'),
  npatMiGrowthCurrentForecast: real('npat_mi_growth_current_forecast'),
  npatMiGrowthCurrentCumulative: real('npat_mi_growth_current_cumulative'),
  
  // EPS (Earnings Per Share) metrics
  epsPrevYear: real('eps_prev_year'),
  epsCurrentForecast: real('eps_current_forecast'),
  
  // EPS growth metrics
  epsGrowthPrevYear: real('eps_growth_prev_year'),
  epsGrowthCurrentForecast: real('eps_growth_current_forecast'),
  
  // Financial ratios
  roePrevYear: real('roe_prev_year'), // Return on Equity
  roeCurrentForecast: real('roe_current_forecast'),
  
  roaPrevYear: real('roa_prev_year'), // Return on Assets
  roaCurrentForecast: real('roa_current_forecast'),
  
  pePrevYear: real('pe_prev_year'), // Price to Earnings ratio
  peCurrentForecast: real('pe_current_forecast'),
  
  pbPrevYear: real('pb_prev_year'), // Price to Book ratio
  pbCurrentForecast: real('pb_current_forecast'),
  
  // Raw API response for reference
  rawData: jsonb('raw_data'),
  
  // Metadata
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for efficient queries
  symbolYearIdx: uniqueIndex('earning_results_symbol_year_idx').on(table.symbol, table.currentYear),
  symbolIdx: index('earning_results_symbol_idx').on(table.symbol),
  yearIdx: index('earning_results_year_idx').on(table.currentYear),
  cumulativeQuarterIdx: index('earning_results_cumulative_quarter_idx').on(table.cumulativeQuarter),
  fetchedAtIdx: index('earning_results_fetched_at_idx').on(table.fetchedAt),
}));

// Type exports
export type EarningResult = typeof earningResults.$inferSelect;
export type NewEarningResult = typeof earningResults.$inferInsert;

// Interface for API response
export interface EarningDataItem {
  name: string;
  prevYearValue: number | null;
  currentYearForecastValue: number | null;
  currentYearCumulativeValue: number | null;
  percentOfCurrentYear: number | null;
}

export interface EarningResultsAPIResponse {
  serverDateTime: string;
  status: number;
  code: number;
  msg: string;
  exception: null | string;
  successful: boolean;
  data: {
    extras: {
      cumulativeQuarter: string;
      currentYear: number;
    };
    earningData: EarningDataItem[];
  };
}