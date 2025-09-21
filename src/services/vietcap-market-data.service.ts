import { FastifyInstance } from 'fastify';

// Types for VietCap API request/response
export interface VietCapOHLCRequest {
  timeFrame: 'ONE_MINUTE' | 'ONE_DAY' | 'ONE_HOUR';
  symbols: string[];
  to: number; // timestamp
  countBack: number; // number of data points to return
}

export interface VietCapOHLCData {
  symbol: string;
  o: number[]; // open prices
  h: number[]; // high prices  
  l: number[]; // low prices
  c: number[]; // close prices
  v: number[]; // volumes
  t: string[]; // timestamps
  accumulatedVolume: number[];
  accumulatedValue: number[];
  minBatchTruncTime: string;
}

export interface SymbolWithPrice {
  // Stock symbol data from database
  id: number;
  symbol: string;
  type: string;
  board: string;
  enOrganName: string | null;
  enOrganShortName: string | null;
  organShortName: string | null;
  organName: string | null;
  productGrpID: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Price data from VietCap API (optional - may not be available)
  priceData?: {
    currentPrice: number | null;
    openPrice: number | null;
    highPrice: number | null;
    lowPrice: number | null;
    volume: number | null;
    accumulatedVolume: number | null;
    accumulatedValue: number | null;
    lastUpdate: string | null;
  };
}

export class VietCapMarketDataService {
  private readonly baseUrl = 'https://trading.vietcap.com.vn/api/chart/OHLCChart/gap-chart';
  
  constructor(private app: FastifyInstance) {}

  /**
   * Fetch price data for multiple symbols from VietCap API
   */
  async fetchPriceData(
    symbols: string[], 
    timeFrame: 'ONE_MINUTE' | 'ONE_DAY' | 'ONE_HOUR' = 'ONE_DAY'
  ): Promise<Map<string, VietCapOHLCData>> {
    try {
      // Current timestamp (today)
      const to = Math.floor(Date.now() / 1000);
      
      const requestBody: VietCapOHLCRequest = {
        timeFrame,
        symbols,
        to,
        countBack: symbols.length
      };

      this.app.log.info(`Fetching price data for ${symbols.length} symbols from VietCap API`);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Referer': 'https://trading.vietcap.com.vn',
          'Origin': 'https://trading.vietcap.com.vn',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        this.app.log.warn(`VietCap API returned ${response.status}: ${response.statusText}`);
        return new Map();
      }

      const data: VietCapOHLCData[] = await response.json();
      
      if (!Array.isArray(data)) {
        this.app.log.warn('VietCap API returned invalid data format');
        return new Map();
      }

      // Convert array to Map for easy lookup
      const priceMap = new Map<string, VietCapOHLCData>();
      data.forEach(item => {
        if (item && item.symbol) {
          priceMap.set(item.symbol.toUpperCase(), item);
        }
      });

      this.app.log.info(`Successfully fetched price data for ${priceMap.size}/${symbols.length} symbols`);
      return priceMap;

    } catch (error: any) {
      this.app.log.error('Error fetching price data from VietCap API:', error);
      return new Map();
    }
  }

  /**
   * Combine symbol data with price data
   */
  combineSymbolsWithPrices(
    symbols: any[],
    priceDataMap: Map<string, VietCapOHLCData>
  ): SymbolWithPrice[] {
    return symbols.map(symbol => {
      const priceData = priceDataMap.get(symbol.symbol);
      
      const result: SymbolWithPrice = {
        id: symbol.id,
        symbol: symbol.symbol,
        type: symbol.type,
        board: symbol.board,
        enOrganName: symbol.enOrganName,
        enOrganShortName: symbol.enOrganShortName,
        organShortName: symbol.organShortName,
        organName: symbol.organName,
        productGrpID: symbol.productGrpID,
        createdAt: symbol.createdAt,
        updatedAt: symbol.updatedAt
      };

      // Add price data if available
      if (priceData) {
        // Get the latest data point (last index)
        const lastIndex = priceData.c.length - 1;
        
        if (lastIndex >= 0) {
          result.priceData = {
            currentPrice: priceData.c[lastIndex] || null,
            openPrice: priceData.o[lastIndex] || null,
            highPrice: priceData.h[lastIndex] || null,
            lowPrice: priceData.l[lastIndex] || null,
            volume: priceData.v[lastIndex] || null,
            accumulatedVolume: priceData.accumulatedVolume[lastIndex] || null,
            accumulatedValue: priceData.accumulatedValue[lastIndex] || null,
            lastUpdate: priceData.t[lastIndex] || null
          };
        } else {
          result.priceData = {
            currentPrice: null,
            openPrice: null,
            highPrice: null,
            lowPrice: null,
            volume: null,
            accumulatedVolume: null,
            accumulatedValue: null,
            lastUpdate: null
          };
        }
      }

      return result;
    });
  }

  /**
   * Fetch symbols with price data (main method)
   */
  async getSymbolsWithPrices(
    symbols: any[],
    timeFrame: 'ONE_MINUTE' | 'ONE_DAY' | 'ONE_HOUR' = 'ONE_DAY'
  ): Promise<SymbolWithPrice[]> {
    if (symbols.length === 0) {
      return [];
    }

    // Extract symbol codes
    const symbolCodes = symbols.map(s => s.symbol);
    
    // Fetch price data
    const priceDataMap = await this.fetchPriceData(symbolCodes, timeFrame);
    
    // Combine data
    return this.combineSymbolsWithPrices(symbols, priceDataMap);
  }
}
