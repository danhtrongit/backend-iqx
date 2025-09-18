import axios, { AxiosError } from 'axios';
import { db } from '../db';
import { earningResults, type NewEarningResult, type EarningResultsAPIResponse, type EarningDataItem } from '../db/schema/earning-results';
import { eq, and } from 'drizzle-orm';
import { config } from '../config/env';
import pLimit from 'p-limit';

export class EarningResultsService {
  private static readonly API_BASE_URL = 'https://iq.vietcap.com.vn/api/iq-insight-service/v1/company';
  private static readonly BATCH_SIZE = 50;
  
  /**
   * Fetch earning results for a specific symbol from the API
   */
  static async fetchEarningResultsFromAPI(symbol: string): Promise<EarningResultsAPIResponse | null> {
    try {
      const url = `${this.API_BASE_URL}/${symbol}/earning-result`;
      const headers: any = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': 'https://trading.vietcap.com.vn',
        'Origin': 'https://trading.vietcap.com.vn',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };

      // Add Bearer token if available
      if (config.VIETCAP_BEARER_TOKEN) {
        headers['Authorization'] = `Bearer ${config.VIETCAP_BEARER_TOKEN}`;
      }

      const response = await axios.get<EarningResultsAPIResponse>(url, {
        headers,
        timeout: 10000, // 10 second timeout
      });

      if (response.data.successful && response.data.data) {
        return response.data;
      }
      
      console.warn(`No data available for symbol ${symbol}`);
      return null;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          console.log(`Symbol ${symbol} not found (404)`);
        } else if (error.response?.status === 401) {
          console.error(`Authentication failed for ${symbol}. Please check the Bearer token.`);
        } else {
          console.error(`Error fetching data for ${symbol}:`, error.message);
        }
      } else {
        console.error(`Unexpected error for ${symbol}:`, error);
      }
      return null;
    }
  }

  /**
   * Parse earning data item from API response
   */
  private static parseEarningDataItem(data: EarningDataItem[]): Partial<NewEarningResult> {
    const result: Partial<NewEarningResult> = {};

    for (const item of data) {
      switch (item.name) {
        case 'revenue':
          result.revenuePrevYear = item.prevYearValue ?? null;
          result.revenueCurrentForecast = item.currentYearForecastValue ?? null;
          result.revenueCurrentCumulative = item.currentYearCumulativeValue ?? null;
          result.revenuePercentOfYear = item.percentOfCurrentYear ?? null;
          break;
        case 'revenueGrowth':
          result.revenueGrowthPrevYear = item.prevYearValue ?? null;
          result.revenueGrowthCurrentForecast = item.currentYearForecastValue ?? null;
          result.revenueGrowthCurrentCumulative = item.currentYearCumulativeValue ?? null;
          break;
        case 'npatMi':
          result.npatMiPrevYear = item.prevYearValue ?? null;
          result.npatMiCurrentForecast = item.currentYearForecastValue ?? null;
          result.npatMiCurrentCumulative = item.currentYearCumulativeValue ?? null;
          result.npatMiPercentOfYear = item.percentOfCurrentYear ?? null;
          break;
        case 'npatMiGrowth':
          result.npatMiGrowthPrevYear = item.prevYearValue ?? null;
          result.npatMiGrowthCurrentForecast = item.currentYearForecastValue ?? null;
          result.npatMiGrowthCurrentCumulative = item.currentYearCumulativeValue ?? null;
          break;
        case 'eps':
          result.epsPrevYear = item.prevYearValue ?? null;
          result.epsCurrentForecast = item.currentYearForecastValue ?? null;
          break;
        case 'epsGrowth':
          result.epsGrowthPrevYear = item.prevYearValue ?? null;
          result.epsGrowthCurrentForecast = item.currentYearForecastValue ?? null;
          break;
        case 'roe':
          result.roePrevYear = item.prevYearValue ?? null;
          result.roeCurrentForecast = item.currentYearForecastValue ?? null;
          break;
        case 'roa':
          result.roaPrevYear = item.prevYearValue ?? null;
          result.roaCurrentForecast = item.currentYearForecastValue ?? null;
          break;
        case 'pe':
          result.pePrevYear = item.prevYearValue ?? null;
          result.peCurrentForecast = item.currentYearForecastValue ?? null;
          break;
        case 'pb':
          result.pbPrevYear = item.prevYearValue ?? null;
          result.pbCurrentForecast = item.currentYearForecastValue ?? null;
          break;
      }
    }

    return result;
  }

  /**
   * Save earning results to database
   */
  static async saveEarningResults(symbol: string, data: EarningResultsAPIResponse): Promise<void> {
    try {
      const { extras, earningData } = data.data;
      
      // Parse the earning data items
      const parsedData = this.parseEarningDataItem(earningData);
      
      const earningResult: NewEarningResult = {
        symbol,
        cumulativeQuarter: extras.cumulativeQuarter,
        currentYear: extras.currentYear,
        ...parsedData,
        rawData: data,
        fetchedAt: new Date(),
        updatedAt: new Date(),
      };

      // Check if record exists
      const existing = await db
        .select()
        .from(earningResults)
        .where(
          and(
            eq(earningResults.symbol, symbol),
            eq(earningResults.currentYear, extras.currentYear)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(earningResults)
          .set({
            ...earningResult,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(earningResults.symbol, symbol),
              eq(earningResults.currentYear, extras.currentYear)
            )
          );
        console.log(`Updated earning results for ${symbol} (${extras.currentYear})`);
      } else {
        // Insert new record
        await db.insert(earningResults).values(earningResult);
        console.log(`Inserted earning results for ${symbol} (${extras.currentYear})`);
      }
    } catch (error) {
      console.error(`Error saving earning results for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Process a single symbol: fetch and save
   */
  static async processSymbol(symbol: string): Promise<boolean> {
    try {
      const data = await this.fetchEarningResultsFromAPI(symbol);
      if (data) {
        await this.saveEarningResults(symbol, data);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to process symbol ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Process multiple symbols with concurrency control
   */
  static async processSymbolsConcurrently(
    symbols: string[],
    concurrency: number = 128
  ): Promise<{
    successful: string[];
    failed: string[];
    total: number;
  }> {
    const limit = pLimit(concurrency);
    const successful: string[] = [];
    const failed: string[] = [];
    
    console.log(`Starting to process ${symbols.length} symbols with ${concurrency} concurrent workers`);
    
    const startTime = Date.now();
    
    // Create promises with concurrency limit
    const promises = symbols.map((symbol, index) =>
      limit(async () => {
        const success = await this.processSymbol(symbol);
        
        if (success) {
          successful.push(symbol);
        } else {
          failed.push(symbol);
        }
        
        // Progress logging every 100 symbols
        if ((index + 1) % 100 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = (index + 1) / elapsed;
          console.log(`Progress: ${index + 1}/${symbols.length} symbols processed (${rate.toFixed(1)} symbols/sec)`);
        }
        
        return success;
      })
    );
    
    // Wait for all promises to complete
    await Promise.all(promises);
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\nCompleted processing ${symbols.length} symbols in ${totalTime.toFixed(1)} seconds`);
    console.log(`Success: ${successful.length}, Failed: ${failed.length}`);
    
    return {
      successful,
      failed,
      total: symbols.length,
    };
  }

  /**
   * Get all earning results from database
   */
  static async getAllEarningResults() {
    return await db.select().from(earningResults);
  }

  /**
   * Get earning results for a specific symbol
   */
  static async getEarningResultsBySymbol(symbol: string) {
    return await db
      .select()
      .from(earningResults)
      .where(eq(earningResults.symbol, symbol));
  }

  /**
   * Delete earning results for a specific symbol
   */
  static async deleteEarningResultsBySymbol(symbol: string) {
    return await db
      .delete(earningResults)
      .where(eq(earningResults.symbol, symbol));
  }
}