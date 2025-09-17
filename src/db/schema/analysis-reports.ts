import { pgTable, varchar, integer, timestamp, index, decimal, text } from 'drizzle-orm/pg-core';

export const analysisReports = pgTable('analysis_reports', {
  // Primary key from Simplize API
  id: integer('id').primaryKey(),
  
  // Stock information
  ticker: varchar('ticker', { length: 10 }).notNull(),
  tickerName: varchar('ticker_name', { length: 10 }),
  
  // Report details
  reportType: integer('report_type').notNull(), // 1, 2, etc.
  source: varchar('source', { length: 100 }).notNull(), // "Vietcap", etc.
  issueDate: varchar('issue_date', { length: 20 }).notNull(), // "05/09/2025"
  issueDateTimeAgo: varchar('issue_date_time_ago', { length: 50 }), // "11 ngày"
  title: text('title').notNull(),
  
  // File information
  attachedLink: text('attached_link').notNull(), // Original Simplize URL
  localPdfPath: text('local_pdf_path'), // Local saved PDF path
  fileName: varchar('file_name', { length: 500 }),
  
  // Analysis information
  targetPrice: decimal('target_price', { precision: 12, scale: 2 }),
  recommend: varchar('recommend', { length: 50 }), // "TRUNG LẬP", "MUA", "BÁN", etc.
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastFetchedAt: timestamp('last_fetched_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for search and filtering
  tickerIdx: index('analysis_reports_ticker_idx').on(table.ticker),
  sourceIdx: index('analysis_reports_source_idx').on(table.source),
  issueDateIdx: index('analysis_reports_issue_date_idx').on(table.issueDate),
  reportTypeIdx: index('analysis_reports_report_type_idx').on(table.reportType),
  recommendIdx: index('analysis_reports_recommend_idx').on(table.recommend),
  // Composite index for ticker + issueDate for efficient filtering
  tickerIssueDateIdx: index('analysis_reports_ticker_issue_date_idx').on(table.ticker, table.issueDate),
}));

// Type exports
export type AnalysisReport = typeof analysisReports.$inferSelect;
export type NewAnalysisReport = typeof analysisReports.$inferInsert;

// Interface for Simplize API response
export interface SimplizeAnalysisReportResponse {
  id: number;
  ticker: string;
  tickerName: string;
  reportType: number;
  source: string;
  issueDate: string;
  issueDateTimeAgo: string;
  title: string;
  attachedLink: string;
  fileName: string;
  targetPrice: number | null;
  recommend: string;
}

export interface SimplizeAnalysisReportsApiResponse {
  status: number;
  message: string;
  total: number;
  data: SimplizeAnalysisReportResponse[];
}