import { FastifyInstance } from 'fastify';
import { eq, and, desc, asc, inArray, gte, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  peerComparison, 
  PeerComparison, 
  NewPeerComparison, 
  PeerComparisonApiResponse,
  PeerComparisonData 
} from '../db/schema/peer-comparison';
import { stockSymbols, StockSymbol } from '../db/schema/stock-symbols';

export interface SearchPeerComparisonParams {
  symbol?: string;
  symbols?: string[];
  ticker?: string;
  sectorType?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'symbol' | 'ticker' | 'projectedTSR' | 'fetchedAt';
  sortOrder?: 'asc' | 'desc';
  includeFreshOnly?: boolean; // Only include data fetched within last 24 hours
}

export interface SearchPeerComparisonResult {
  data: PeerComparison[];
  total: number;
  limit: number;
  offset: number;
}

export interface FetchProgressCallback {
  (current: number, total: number, symbol: string): void;
}

export interface WorkerPoolOptions {
  maxWorkers?: number;
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  progressCallback?: FetchProgressCallback;
}

interface WorkerTask {
  symbol: string;
  sectorType: string;
  retryCount: number;
}

interface WorkerResult {
  symbol: string;
  success: boolean;
  data?: PeerComparisonData[];
  error?: string;
}

class WorkerPool {
  private workers: Promise<WorkerResult>[] = [];
  private queue: WorkerTask[] = [];
  private activeCount = 0;
  private completed = 0;
  private failed = 0;
  private total = 0;
  
  constructor(
    private maxWorkers: number,
    private fetchFn: (task: WorkerTask) => Promise<WorkerResult>,
    private options: WorkerPoolOptions
  ) {}

  async execute(tasks: WorkerTask[]): Promise<WorkerResult[]> {
    this.queue = [...tasks];
    this.total = tasks.length;
    this.completed = 0;
    this.failed = 0;
    
    const results: WorkerResult[] = [];
    
    // Start initial workers
    while (this.activeCount < this.maxWorkers && this.queue.length > 0) {
      this.startWorker(results);
    }
    
    // Wait for all workers to complete
    while (this.activeCount > 0 || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  private async startWorker(results: WorkerResult[]) {
    if (this.queue.length === 0) return;
    
    const task = this.queue.shift()!;
    this.activeCount++;
    
    try {
      const result = await this.fetchFn(task);
      results.push(result);
      
      if (result.success) {
        this.completed++;
      } else {
        this.failed++;
        
        // Retry logic
        if (task.retryCount < (this.options.retryAttempts || 3)) {
          task.retryCount++;
          this.queue.push(task);
        }
      }
      
      // Progress callback
      if (this.options.progressCallback) {
        this.options.progressCallback(
          this.completed + this.failed,
          this.total,
          task.symbol
        );
      }
    } catch (error) {
      this.failed++;
      results.push({
        symbol: task.symbol,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.activeCount--;
      
      // Start new worker if there are tasks remaining
      if (this.queue.length > 0 && this.activeCount < this.maxWorkers) {
        this.startWorker(results);
      }
    }
  }
}

export class PeerComparisonService {
  constructor(private app: FastifyInstance) {}

  /**
   * Fetch peer comparison data for a single symbol from VietCap API
   */
  async fetchFromVietCapAPI(symbol: string, sectorType: string = 'RA'): Promise<PeerComparisonApiResponse> {
    const url = `https://iq.vietcap.com.vn/api/iq-insight-service/v1/valuation/${symbol}/peer-comparison?sectorType=${sectorType}`;
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
          'Authorization': 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJyb2xlIjoiVVNFUiIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwidXNlcl90eXBlIjoiT1JHQU5JWkFUSU9OIiwiYWNjb3VudE5vIjoia2lldC50cmFuQHZpbmFjYXBpdGFsLmNvbSIsInNlc3Npb25faWQiOiI5NDFjNTQ1ZC1hM2EzLTQ4YzctYTEzNi04MGQwYTkwZmRiOTIiLCJjbGllbnRfdHlwZSI6MSwidXVpZCI6ImUzMGI4YmZmLWIwYzctNDFjNi05NDlkLWE4NTJhZTBiMDk1MSIsImVtYWlsIjoia2lldC50cmFuQHZpbmFjYXBpdGFsLmNvbSIsImNsaWVudF9pZCI6ImE2NzA5MTRjLTg5NjQtNGIyYy1hMjg5LTZkZTRkNWI5ZDJjNCIsInVzZXJuYW1lIjoia2lldC50cmFuQHZpbmFjYXBpdGFsLmNvbSIsImlhdCI6MTc1NzkzMTY3MiwiZXhwIjoxNzU4NTM2NDcyfQ.wP5RSKVPhVIfZmu5jQKVFvNdexzq09KzKRQaFQjnSlkefRfSzUbyJYsfxTP4fk8w0GitSGUNiHx8714iZ8A4NynIa8MhvC2nYgWO8kyuCOi-vzFTzRd-9BGofNT5iHJspbH94jrleokrwPsvhlc068UW9fgHMr1pyzeuw14C2ysyveVScEjQbgPxVqv3EbRBYdzW5iryivzuSGV_J6gvQASfeuP-1QRe-k_SkEVHHAflbWEssp6mhWK25HSrDPC5CVPnbR5mQQHn9_zng0USDtCgA5a7_3jyPwgEtpNIJNS3gCLT6FcKtpPkKkMXJ-s15L48zJ_1mXTyhYop_JWgWg',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://trading.vietcap.com.vn',
          'Referer': 'https://trading.vietcap.com.vn/',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Log the response for debugging
      this.app.log.debug(`API Response: ${JSON.stringify(data).substring(0, 500)}`);
      
      // Check if the response has the expected structure
      if (!data || !Array.isArray(data.data)) {
        throw new Error(`Invalid API response structure: ${JSON.stringify(data).substring(0, 200)}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout for symbol ${symbol}`);
      }
      throw error;
    }
  }

  /**
   * Fetch peer comparison data for all symbols using worker pool
   */
  async fetchAllSymbolsWithWorkerPool(options: WorkerPoolOptions = {}): Promise<{
    successful: number;
    failed: number;
    errors: { symbol: string; error: string }[];
  }> {
    const {
      maxWorkers = 128,
      batchSize = 50,
      retryAttempts = 3,
      retryDelay = 1000,
      progressCallback
    } = options;

    // Get all symbols from database
    const symbols = await db
      .select({ symbol: stockSymbols.symbol })
      .from(stockSymbols)
      .where(eq(stockSymbols.type, 'STOCK'));

    this.app.log.info(`Starting to fetch peer comparison data for ${symbols.length} symbols with ${maxWorkers} workers`);

    // Create tasks
    const tasks: WorkerTask[] = symbols.map(s => ({
      symbol: s.symbol,
      sectorType: 'RA',
      retryCount: 0
    }));

    // Create worker pool
    const workerPool = new WorkerPool(
      maxWorkers,
      async (task) => this.fetchWorkerTask(task, retryDelay),
      options
    );

    // Execute all tasks
    const results = await workerPool.execute(tasks);

    // Process results in batches
    let successful = 0;
    let failed = 0;
    const errors: { symbol: string; error: string }[] = [];
    const fetchedAt = new Date();

    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      const dataToInsert: NewPeerComparison[] = [];

      for (const result of batch) {
        if (result.success && result.data) {
          for (const item of result.data) {
            dataToInsert.push({
              symbol: result.symbol,
              ticker: item.ticker,
              marketCap: item.marketCap,
              projectedTSR: item.projectedTSR,
              npatmiGrowth: item.npatmiGrowth,
              pe: item.pe,
              pb: item.pb,
              sectorType: 'RA',
              fetchedAt
            });
          }
          successful++;
        } else {
          failed++;
          errors.push({ symbol: result.symbol, error: result.error || 'Unknown error' });
        }
      }

      // Insert batch into database
      if (dataToInsert.length > 0) {
        await this.insertPeerComparisonData(dataToInsert);
      }

      this.app.log.info(`Processed batch ${Math.ceil((i + batchSize) / batchSize)}/${Math.ceil(results.length / batchSize)}`);
    }

    this.app.log.info(`Completed fetching peer comparison data: ${successful} successful, ${failed} failed`);

    return { successful, failed, errors };
  }

  /**
   * Worker task for fetching a single symbol
   */
  private async fetchWorkerTask(task: WorkerTask, retryDelay: number): Promise<WorkerResult> {
    try {
      // Add delay for retries
      if (task.retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * task.retryCount));
      }

      const response = await this.fetchFromVietCapAPI(task.symbol, task.sectorType);
      
      return {
        symbol: task.symbol,
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        symbol: task.symbol,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Insert or update peer comparison data in database
   */
  async insertPeerComparisonData(data: NewPeerComparison[]): Promise<void> {
    if (data.length === 0) return;

    // Delete existing data for these symbols
    const symbolsToUpdate = [...new Set(data.map(d => d.symbol))];
    await db
      .delete(peerComparison)
      .where(
        and(
          inArray(peerComparison.symbol, symbolsToUpdate),
          eq(peerComparison.sectorType, data[0].sectorType || 'RA')
        )
      );

    // Insert new data
    await db.insert(peerComparison).values(data);
  }

  /**
   * Search peer comparison data with filters
   */
  async searchPeerComparison(params: SearchPeerComparisonParams): Promise<SearchPeerComparisonResult> {
    const {
      symbol,
      symbols,
      ticker,
      sectorType = 'RA',
      limit = 20,
      offset = 0,
      sortBy = 'symbol',
      sortOrder = 'asc',
      includeFreshOnly = false
    } = params;

    // Build where conditions
    const conditions = [];

    if (symbol) {
      conditions.push(eq(peerComparison.symbol, symbol));
    }

    if (symbols && symbols.length > 0) {
      conditions.push(inArray(peerComparison.symbol, symbols));
    }

    if (ticker) {
      conditions.push(eq(peerComparison.ticker, ticker));
    }

    conditions.push(eq(peerComparison.sectorType, sectorType));

    // Only include fresh data (within last 24 hours)
    if (includeFreshOnly) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      conditions.push(gte(peerComparison.fetchedAt, oneDayAgo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order column
    const orderColumn = {
      symbol: peerComparison.symbol,
      ticker: peerComparison.ticker,
      projectedTSR: peerComparison.projectedTSR,
      fetchedAt: peerComparison.fetchedAt,
    }[sortBy] || peerComparison.symbol;

    const orderDirection = sortOrder === 'desc' ? desc : asc;

    // Execute queries
    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(peerComparison)
        .where(whereClause)
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`count(*)` })
        .from(peerComparison)
        .where(whereClause)
    ]);

    const total = Number(totalResult[0]?.count || 0);

    return {
      data,
      total,
      limit,
      offset
    };
  }

  /**
   * Get peer comparison data for a specific symbol
   */
  async getSymbolPeerComparison(symbol: string, sectorType: string = 'RA'): Promise<PeerComparison[]> {
    return db
      .select()
      .from(peerComparison)
      .where(
        and(
          eq(peerComparison.symbol, symbol),
          eq(peerComparison.sectorType, sectorType)
        )
      )
      .orderBy(asc(peerComparison.ticker));
  }

  /**
   * Get latest fetch timestamp for a symbol
   */
  async getLatestFetchTime(symbol?: string): Promise<Date | null> {
    const conditions = symbol ? [eq(peerComparison.symbol, symbol)] : [];
    
    const result = await db
      .select({ maxFetchedAt: sql<Date>`max(fetched_at)` })
      .from(peerComparison)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result[0]?.maxFetchedAt || null;
  }

  /**
   * Delete old peer comparison data (older than specified days)
   */
  async deleteOldData(daysToKeep: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    const result = await db
      .delete(peerComparison)
      .where(sql`${peerComparison.fetchedAt} < ${cutoffDate}`)
      .returning({ id: peerComparison.id });

    return result.length;
  }
}