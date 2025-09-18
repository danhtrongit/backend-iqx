#!/usr/bin/env tsx

import { db, closeConnection, testConnection } from '../db';
import { stockSymbols } from '../db/schema/stock-symbols';
import { earningResults } from '../db/schema/earning-results';
import { EarningResultsService } from '../services/earning-results.service';
import { config } from '../config/env';
import { sql } from 'drizzle-orm';

// ASCII art banner
const banner = `
╔═══════════════════════════════════════════════════════════════╗
║           EARNING RESULTS DATA FETCHER                       ║
║                                                              ║
║  Fetches earning results from VietCap API for all symbols   ║
╚═══════════════════════════════════════════════════════════════╝
`;

interface FetchOptions {
  force?: boolean;
  symbols?: string[];
  concurrency?: number;
  testSymbol?: string;
}

async function parseArguments(): Promise<FetchOptions> {
  const args = process.argv.slice(2);
  const options: FetchOptions = {
    concurrency: 128, // Default to 128 workers
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--symbols':
      case '-s':
        if (i + 1 < args.length) {
          options.symbols = args[++i].split(',');
        }
        break;
      case '--concurrency':
      case '-c':
        if (i + 1 < args.length) {
          options.concurrency = parseInt(args[++i], 10) || 128;
        }
        break;
      case '--test':
      case '-t':
        if (i + 1 < args.length) {
          options.testSymbol = args[++i];
        }
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: tsx fetch-earning-results.ts [options]

Options:
  --force, -f              Force update all symbols (ignore existing data)
  --symbols, -s <list>     Comma-separated list of symbols to process
  --concurrency, -c <num>  Number of concurrent workers (default: 128)
  --test, -t <symbol>      Test with a single symbol
  --help, -h               Show this help message

Examples:
  tsx fetch-earning-results.ts                    # Fetch all symbols
  tsx fetch-earning-results.ts --force            # Force update all
  tsx fetch-earning-results.ts -s VIC,VNM,HPG     # Specific symbols
  tsx fetch-earning-results.ts -c 50              # Use 50 workers
  tsx fetch-earning-results.ts --test VIC         # Test with VIC only
        `);
        process.exit(0);
    }
  }

  return options;
}

async function getSymbolsToProcess(options: FetchOptions): Promise<string[]> {
  // If test symbol is specified, only process that one
  if (options.testSymbol) {
    console.log(`\n🧪 Test mode: Processing only symbol ${options.testSymbol}`);
    return [options.testSymbol];
  }

  // If specific symbols are provided
  if (options.symbols && options.symbols.length > 0) {
    console.log(`\n📋 Processing ${options.symbols.length} specified symbols`);
    return options.symbols;
  }

  // Get all symbols from database
  console.log('\n📊 Fetching all symbols from database...');
  const allSymbolsData = await db.select({ symbol: stockSymbols.symbol }).from(stockSymbols);
  
  if (allSymbolsData.length === 0) {
    throw new Error('No symbols found in database. Please run seed script first.');
  }

  const allSymbols = allSymbolsData.map(s => s.symbol);

  // If force mode, process all symbols
  if (options.force) {
    console.log(`✅ Force mode: Will process all ${allSymbols.length} symbols`);
    return allSymbols;
  }

  // Otherwise, check which symbols need updating
  console.log('🔍 Checking for symbols that need updating...');
  
  // Get symbols that already have data
  const existingData = await db
    .select({ symbol: earningResults.symbol })
    .from(earningResults)
    .groupBy(earningResults.symbol);
  
  const existingSymbols = new Set(existingData.map(d => d.symbol));
  const newSymbols = allSymbols.filter(s => !existingSymbols.has(s));
  
  console.log(`📈 Found ${existingSymbols.size} symbols with existing data`);
  console.log(`🆕 Found ${newSymbols.length} new symbols to process`);
  
  return newSymbols;
}

async function displayStats() {
  console.log('\n📊 Database Statistics:');
  
  const totalRecords = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(earningResults);
  
  const uniqueSymbols = await db
    .select({ count: sql<number>`count(distinct symbol)::int` })
    .from(earningResults);
  
  const latestYear = await db
    .select({ year: sql<number>`max(current_year)::int` })
    .from(earningResults);
  
  console.log(`   Total records: ${totalRecords[0]?.count || 0}`);
  console.log(`   Unique symbols: ${uniqueSymbols[0]?.count || 0}`);
  console.log(`   Latest year: ${latestYear[0]?.year || 'N/A'}`);
}

async function main() {
  console.log(banner);
  
  try {
    // Parse command line arguments
    const options = await parseArguments();
    
    // Test database connection
    console.log('🔌 Connecting to database...');
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connected successfully\n');

    // Check if Bearer token is configured
    if (!config.VIETCAP_BEARER_TOKEN) {
      console.warn('⚠️  Warning: VIETCAP_BEARER_TOKEN is not configured');
      console.warn('   You may encounter authentication errors when fetching data.');
      console.warn('   Please set VIETCAP_BEARER_TOKEN in your .env file.\n');
    } else {
      console.log('🔐 Bearer token configured\n');
    }

    // Get symbols to process
    const symbols = await getSymbolsToProcess(options);
    
    if (symbols.length === 0) {
      console.log('\n✨ All symbols are up to date! No processing needed.');
      await displayStats();
      return;
    }

    // Process symbols
    console.log(`\n🚀 Starting to fetch earning results for ${symbols.length} symbols`);
    console.log(`   Using ${options.concurrency} concurrent workers\n`);
    
    const startTime = Date.now();
    
    const results = await EarningResultsService.processSymbolsConcurrently(
      symbols,
      options.concurrency
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Display results
    console.log('\n' + '═'.repeat(60));
    console.log('📋 FETCH SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Successful: ${results.successful.length} symbols`);
    console.log(`❌ Failed: ${results.failed.length} symbols`);
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log(`📊 Processing rate: ${(symbols.length / parseFloat(duration)).toFixed(1)} symbols/sec`);
    
    // Show failed symbols if any
    if (results.failed.length > 0) {
      console.log('\n⚠️  Failed symbols:');
      results.failed.slice(0, 20).forEach(symbol => {
        console.log(`   - ${symbol}`);
      });
      if (results.failed.length > 20) {
        console.log(`   ... and ${results.failed.length - 20} more`);
      }
    }
    
    // Display final statistics
    await displayStats();
    
    console.log('\n✅ Earning results fetch completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await closeConnection();
    console.log('\n👋 Database connection closed');
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});