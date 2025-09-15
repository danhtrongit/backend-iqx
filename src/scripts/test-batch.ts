#!/usr/bin/env tsx

import { db } from '../db';
import { PeerComparisonService } from '../services/peer-comparison.service';
import pino from 'pino';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

async function testBatch() {
  const testSymbols = ['ACB', 'VCB', 'FPT', 'VNM', 'HPG'];
  
  logger.info(`Testing batch fetch for ${testSymbols.length} symbols`);
  
  const mockApp = { log: logger } as any;
  const service = new PeerComparisonService(mockApp);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const symbol of testSymbols) {
    try {
      logger.info(`Fetching ${symbol}...`);
      const response = await service.fetchFromVietCapAPI(symbol, 'RA');
      
      if (response.data && response.data.length > 0) {
        logger.info(`✅ ${symbol}: Got ${response.data.length} records`);
        
        // Save to database
        const fetchedAt = new Date();
        const dataToInsert = response.data.map(item => ({
          symbol: symbol,
          ticker: item.ticker,
          marketCap: item.marketCap,
          projectedTSR: item.projectedTSR,
          npatmiGrowth: item.npatmiGrowth,
          pe: item.pe,
          pb: item.pb,
          sectorType: 'RA',
          fetchedAt
        }));
        
        await service.insertPeerComparisonData(dataToInsert);
        logger.info(`  Saved ${dataToInsert.length} records to database`);
        successCount++;
      } else {
        logger.warn(`⚠️ ${symbol}: No data returned`);
        failCount++;
      }
    } catch (error) {
      logger.error(`❌ ${symbol}: ${error}`);
      failCount++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  logger.info('='.repeat(60));
  logger.info(`Summary: ${successCount} successful, ${failCount} failed`);
  
  // Check database
  const count = await db.$count(service.getSymbolPeerComparison('ACB', 'RA'));
  logger.info(`Total records for ACB in database: ${count}`);
}

testBatch().then(() => {
  logger.info('Test completed');
  process.exit(0);
}).catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});