import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  analysisReports, 
  type AnalysisReport, 
  type NewAnalysisReport,
  type SimplizeAnalysisReportsApiResponse,
  type SimplizeAnalysisReportResponse 
} from '../db/schema/analysis-reports';
import { config } from '../config/env';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

export class AnalysisReportsService {
  private static readonly SIMPLIZE_API_BASE_URL = 'https://api2.simplize.vn/api/company/analysis-report/list';
  private static readonly PDF_STORAGE_PATH = path.join(process.cwd(), 'public', 'analysis-reports');
  
  /**
   * Ensure the PDF storage directory exists
   */
  private static async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.PDF_STORAGE_PATH);
    } catch {
      await fs.mkdir(this.PDF_STORAGE_PATH, { recursive: true });
    }
  }
  
  /**
   * Download PDF file from URL and save locally
   */
  private static async downloadPDF(url: string, fileName: string): Promise<string> {
    await this.ensureStorageDirectory();
    
    // Generate safe filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const safeFileName = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(this.PDF_STORAGE_PATH, safeFileName);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }
      
      const fileStream = createWriteStream(filePath);
      await pipeline(response.body as any, fileStream);
      
      // Return the relative path that will be used in the API
      return `/analysis-reports/${safeFileName}`;
    } catch (error) {
      console.error(`Failed to download PDF from ${url}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch analysis reports from Simplize API for a specific ticker
   */
  static async fetchFromSimplizeAPI(
    ticker: string, 
    page: number = 0, 
    size: number = 50,
    isWl: boolean = false
  ): Promise<SimplizeAnalysisReportsApiResponse> {
    const url = new URL(this.SIMPLIZE_API_BASE_URL);
    url.searchParams.append('ticker', ticker.toUpperCase());
    url.searchParams.append('isWl', isWl.toString());
    url.searchParams.append('page', page.toString());
    url.searchParams.append('size', size.toString());
    
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Simplize API error: ${response.statusText}`);
      }
      
      const data = await response.json() as SimplizeAnalysisReportsApiResponse;
      return data;
    } catch (error) {
      console.error('Failed to fetch from Simplize API:', error);
      throw error;
    }
  }
  
  /**
   * Fetch and save reports from Simplize API to database
   */
  static async fetchAndSaveReports(
    ticker: string,
    downloadPDFs: boolean = true
  ): Promise<{ saved: number; errors: number }> {
    let saved = 0;
    let errors = 0;
    let page = 0;
    const pageSize = 50;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await this.fetchFromSimplizeAPI(ticker, page, pageSize);
        
        if (response.status !== 200 || !response.data || response.data.length === 0) {
          hasMore = false;
          break;
        }
        
        for (const report of response.data) {
          try {
            // Check if report already exists
            const existing = await db
              .select()
              .from(analysisReports)
              .where(eq(analysisReports.id, report.id))
              .limit(1);
            
            if (existing.length > 0) {
              console.log(`Report ${report.id} already exists, skipping...`);
              continue;
            }
            
            // Download PDF if requested
            let localPdfPath: string | null = null;
            if (downloadPDFs && report.attachedLink) {
              try {
                localPdfPath = await this.downloadPDF(report.attachedLink, report.fileName);
              } catch (error) {
                console.error(`Failed to download PDF for report ${report.id}:`, error);
                // Continue saving the report even if PDF download fails
              }
            }
            
            // Prepare report data for insertion
            const newReport: NewAnalysisReport = {
              id: report.id,
              ticker: report.ticker.toUpperCase(),
              tickerName: report.tickerName,
              reportType: report.reportType,
              source: report.source,
              issueDate: report.issueDate,
              issueDateTimeAgo: report.issueDateTimeAgo,
              title: report.title,
              attachedLink: report.attachedLink,
              localPdfPath,
              fileName: report.fileName,
              targetPrice: report.targetPrice?.toString() || null,
              recommend: report.recommend,
              lastFetchedAt: new Date(),
            };
            
            await db.insert(analysisReports).values(newReport);
            saved++;
            console.log(`Saved report ${report.id} for ${ticker}`);
          } catch (error) {
            console.error(`Error saving report ${report.id}:`, error);
            errors++;
          }
        }
        
        // Check if there are more pages
        if (response.data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        errors++;
        hasMore = false;
      }
    }
    
    return { saved, errors };
  }
  
  /**
   * Get analysis reports for a specific ticker with pagination
   */
  static async getReportsBySymbol(
    ticker: string,
    page: number = 0,
    size: number = 20
  ): Promise<{
    data: AnalysisReport[];
    total: number;
    page: number;
    size: number;
    totalPages: number;
  }> {
    const offset = page * size;
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(analysisReports)
      .where(eq(analysisReports.ticker, ticker.toUpperCase()));
    
    const total = countResult?.count || 0;
    
    // Get paginated data
    const data = await db
      .select()
      .from(analysisReports)
      .where(eq(analysisReports.ticker, ticker.toUpperCase()))
      .orderBy(desc(analysisReports.issueDate))
      .limit(size)
      .offset(offset);
    
    return {
      data,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }
  
  /**
   * Get all reports with optional filtering
   */
  static async getAllReports(
    page: number = 0,
    size: number = 20,
    filters?: {
      source?: string;
      reportType?: number;
      recommend?: string;
    }
  ): Promise<{
    data: AnalysisReport[];
    total: number;
    page: number;
    size: number;
    totalPages: number;
  }> {
    const offset = page * size;
    const conditions = [];
    
    if (filters?.source) {
      conditions.push(eq(analysisReports.source, filters.source));
    }
    if (filters?.reportType !== undefined) {
      conditions.push(eq(analysisReports.reportType, filters.reportType));
    }
    if (filters?.recommend) {
      conditions.push(eq(analysisReports.recommend, filters.recommend));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(analysisReports)
      .where(whereClause);
    
    const total = countResult?.count || 0;
    
    // Get paginated data
    const data = await db
      .select()
      .from(analysisReports)
      .where(whereClause)
      .orderBy(desc(analysisReports.issueDate))
      .limit(size)
      .offset(offset);
    
    return {
      data,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }
  
  /**
   * Get a single report by ID
   */
  static async getReportById(id: number): Promise<AnalysisReport | null> {
    const [report] = await db
      .select()
      .from(analysisReports)
      .where(eq(analysisReports.id, id))
      .limit(1);
    
    return report || null;
  }
  
  /**
   * Update local PDF path for a report
   */
  static async updateLocalPdfPath(id: number, localPdfPath: string): Promise<void> {
    await db
      .update(analysisReports)
      .set({ 
        localPdfPath,
        updatedAt: new Date()
      })
      .where(eq(analysisReports.id, id));
  }
  
  /**
   * Delete old reports (older than specified days)
   */
  static async deleteOldReports(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await db
      .delete(analysisReports)
      .where(sql`${analysisReports.createdAt} < ${cutoffDate}`)
      .returning();
    
    // Also delete associated PDF files
    for (const report of result) {
      if (report.localPdfPath) {
        const filePath = path.join(process.cwd(), 'public', report.localPdfPath);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error(`Failed to delete PDF file: ${filePath}`, error);
        }
      }
    }
    
    return result.length;
  }
}