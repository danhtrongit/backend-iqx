#!/usr/bin/env tsx

import { config } from '../config/env';
import { db } from '../db';
import { PeerComparisonService, WorkerPoolOptions } from '../services/peer-comparison.service';
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

interface FetchOptions {
  maxWorkers?: number;
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
  forceRefresh?: boolean;
  cleanOldData?: boolean;
  daysToKeep?: number;
}

async function fetchPeerComparisonData(options: FetchOptions = {}) {
  const {
    maxWorkers = 128,
    batchSize = 50,
    retryAttempts = 3,
    retryDelay = 1000,
    forceRefresh = false,
    cleanOldData = true,
    daysToKeep = 7
  } = options;

  logger.info('Starting peer comparison data fetch...');
  logger.info(`Configuration: maxWorkers=${maxWorkers}, batchSize=${batchSize}, retryAttempts=${retryAttempts}`);

  try {
    // Create mock Fastify instance with logger
    const mockApp = { log: logger } as any;
    const service = new PeerComparisonService(mockApp);

    // Check if we need to fetch new data
    if (!forceRefresh) {
      const latestFetch = await service.getLatestFetchTime();
      if (latestFetch) {
        const fetchTime = new Date(latestFetch);
        const hoursSinceLastFetch = (Date.now() - fetchTime.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastFetch < 24) {
          logger.info(`Data was fetched ${hoursSinceLastFetch.toFixed(2)} hours ago. Skipping refresh.`);
          logger.info('Use --force flag to force refresh.');
          return;
        }
      }
    }

    // Clean old data if requested
    if (cleanOldData) {
      logger.info(`Cleaning data older than ${daysToKeep} days...`);
      const deletedCount = await service.deleteOldData(daysToKeep);
      logger.info(`Deleted ${deletedCount} old records`);
    }

    // Fetch new data
    const workerPoolOptions: WorkerPoolOptions = {
      maxWorkers,
      batchSize,
      retryAttempts,
      retryDelay,
      progressCallback: (current, total, symbol) => {
        const percentage = ((current / total) * 100).toFixed(1);
        if (current % 50 === 0 || current === total) {
          logger.info(`Progress: ${current}/${total} (${percentage}%) - Current: ${symbol}`);
        }
      }
    };

    const startTime = Date.now();
    const result = await service.fetchAllSymbolsWithWorkerPool(workerPoolOptions);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('='.repeat(60));
    logger.info('Fetch completed!');
    logger.info(`Time elapsed: ${elapsedTime} seconds`);
    logger.info(`Successful: ${result.successful}`);
    logger.info(`Failed: ${result.failed}`);
    
    if (result.failed > 0) {
      logger.warn('Failed symbols:');
      result.errors.slice(0, 10).forEach(error => {
        logger.warn(`  - ${error.symbol}: ${error.error}`);
      });
      if (result.errors.length > 10) {
        logger.warn(`  ... and ${result.errors.length - 10} more`);
      }
    }

    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('Error during fetch:', error);
    if (error instanceof Error) {
      logger.error(`Error message: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs(): FetchOptions {
  const args = process.argv.slice(2);
  const options: FetchOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--workers':
      case '-w':
        options.maxWorkers = parseInt(args[++i], 10);
        break;
      case '--batch':
      case '-b':
        options.batchSize = parseInt(args[++i], 10);
        break;
      case '--retry':
      case '-r':
        options.retryAttempts = parseInt(args[++i], 10);
        break;
      case '--delay':
      case '-d':
        options.retryDelay = parseInt(args[++i], 10);
        break;
      case '--force':
      case '-f':
        options.forceRefresh = true;
        break;
      case '--no-clean':
        options.cleanOldData = false;
        break;
      case '--keep-days':
      case '-k':
        options.daysToKeep = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Fetch Peer Comparison Data Script

Usage: npm run fetch:peer-comparison [options]
       tsx src/scripts/fetch-peer-comparison.ts [options]

Options:
  -w, --workers <n>      Number of concurrent workers (default: 128)
  -b, --batch <n>        Batch size for database inserts (default: 50)
  -r, --retry <n>        Number of retry attempts for failed requests (default: 3)
  -d, --delay <n>        Delay between retries in milliseconds (default: 1000)
  -f, --force            Force refresh even if data is recent
  --no-clean             Don't clean old data before fetching
  -k, --keep-days <n>    Number of days of data to keep (default: 7)
  -h, --help             Show this help message

Examples:
  # Fetch with default settings
  npm run fetch:peer-comparison

  # Force refresh with 256 workers
  npm run fetch:peer-comparison --force --workers 256

  # Fetch without cleaning old data
  npm run fetch:peer-comparison --no-clean

  # Keep 30 days of data
  npm run fetch:peer-comparison --keep-days 30
`);
}

// Main execution
async function main() {
  const options = parseArgs();
  
  logger.info('Peer Comparison Data Fetcher');
  logger.info('=============================');
  
  await fetchPeerComparisonData(options);
  
  // Database connection will be closed automatically
  
  logger.info('Script completed successfully');
  process.exit(0);
}

// Run the script
main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});