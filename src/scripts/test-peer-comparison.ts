#!/usr/bin/env tsx

import { db } from '../db';
import { PeerComparisonService } from '../services/peer-comparison.service';
import pino from 'pino';

const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

async function testFetchVCB() {
  try {
    logger.info('Testing peer comparison fetch for VCB...');
    
    // Create mock Fastify instance with logger
    const mockApp = { log: logger } as any;
    const service = new PeerComparisonService(mockApp);
    
    // Test fetching from API
    logger.info('Fetching from VietCap API...');
    const apiResponse = await service.fetchFromVietCapAPI('VCB', 'RA');
    
    logger.info(`API Response status: ${apiResponse.status}`);
    logger.info(`Data items received: ${apiResponse.data?.length || 0}`);
    
    if (apiResponse.data && apiResponse.data.length > 0) {
      logger.info('Sample data:');
      apiResponse.data.slice(0, 3).forEach(item => {
        logger.info(`  ${item.ticker}: TSR=${item.projectedTSR?.toFixed(4)}, PE(2025F)=${item.pe?.['2025F']?.toFixed(2)}`);
      });
      
      // Save to database
      logger.info('Saving to database...');
      const fetchedAt = new Date();
      const dataToInsert = apiResponse.data.map(item => ({
        symbol: 'VCB',
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
      logger.info(`Successfully saved ${dataToInsert.length} records to database`);
      
      // Verify data was saved
      logger.info('Verifying saved data...');
      const savedData = await service.getSymbolPeerComparison('VCB', 'RA');
      logger.info(`Found ${savedData.length} records in database for VCB`);
      
    } else {
      logger.error('No data received from API');
    }
    
  } catch (error) {
    logger.error('Error during test:', error);
    if (error instanceof Error) {
      logger.error(`Error message: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
    }
  } finally {
    // Database connection will be closed automatically
    logger.info('Test completed');
    process.exit(0);
  }
}

// Run the test
testFetchVCB();