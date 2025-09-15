import Fastify from 'fastify';
import { StockSymbolsService } from '../services/stock-symbols.service';
import { config } from '../config/env';
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function seedStockSymbols() {
  // Create a minimal Fastify instance for logging
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL || 'info',
      transport: config.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      } : undefined,
    },
  });

  try {
    app.log.info('Starting stock symbols seeding process...');
    
    // Check database connection
    await db.execute(sql`SELECT 1`);
    app.log.info('Database connection successful');

    const stockSymbolsService = new StockSymbolsService(app);
    
    // Check current count
    const currentCount = await stockSymbolsService.getSymbolCount();
    
    if (currentCount > 0) {
      app.log.info(`Stock symbols table already contains ${currentCount} records`);
      const answer = process.argv.includes('--force');
      
      if (!answer) {
        app.log.info('Use --force flag to reimport symbols');
        process.exit(0);
      }
      
      app.log.warn('Force flag detected. Reimporting symbols...');
    }
    
    // Import symbols
    app.log.info('Fetching stock symbols from VietCap API...');
    const result = await stockSymbolsService.importSymbols(process.argv.includes('--force'));
    
    if (result.imported > 0) {
      app.log.info(`✅ Successfully imported ${result.imported} stock symbols`);
    } else if (result.skipped > 0) {
      app.log.info(`ℹ️  Import skipped. Database already contains ${result.skipped} symbols`);
    } else {
      app.log.warn('⚠️  No symbols were imported');
    }
    
    // Show some statistics
    const finalCount = await stockSymbolsService.getSymbolCount();
    const boards = await stockSymbolsService.getBoards();
    const types = await stockSymbolsService.getTypes();
    
    app.log.info('📊 Stock Symbols Statistics:');
    app.log.info(`   Total symbols: ${finalCount}`);
    app.log.info(`   Boards: ${boards.join(', ')}`);
    app.log.info(`   Types: ${types.join(', ')}`);
    
    process.exit(0);
  } catch (error) {
    app.log.error('Error during stock symbols seeding:', error);
    process.exit(1);
  }
}

// Run the seeding script
seedStockSymbols();