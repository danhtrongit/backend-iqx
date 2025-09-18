#!/usr/bin/env tsx

import { Command } from 'commander';
import { createSpinner } from 'nanospinner';
import chalk from 'chalk';
import { config } from 'dotenv';
import { db } from '../src/db';
import { EarningScraperService } from '../src/services/earning-scraper.service';
import { scrapingJobs, scrapingWorkers, earningResults } from '../src/db/schema/earning-results';
import { eq, desc, sql } from 'drizzle-orm';
import pino from 'pino';

// Load environment variables
config();

// Create logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

// Mock Fastify app for service initialization
const mockApp: any = {
  log: logger,
};

// Initialize scraper service
const scraperService = new EarningScraperService(mockApp, {
  maxWorkers: Number(process.env.SCRAPER_MAX_WORKERS) || 128,
  batchSize: Number(process.env.SCRAPER_BATCH_SIZE) || 100,
  retryAttempts: Number(process.env.SCRAPER_RETRY_ATTEMPTS) || 3,
  retryDelay: Number(process.env.SCRAPER_RETRY_DELAY) || 5000,
  vietcapToken: process.env.VIETCAP_API_TOKEN,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  concurrencyPerWorker: Number(process.env.SCRAPER_CONCURRENCY_PER_WORKER) || 2,
});

// Create CLI program
const program = new Command();

program
  .name('scraper')
  .description('Earning Results Scraper CLI')
  .version('1.0.0');

// Initialize command
program
  .command('init')
  .description('Initialize the scraper service with 128 workers')
  .action(async () => {
    const spinner = createSpinner('Initializing scraper service...').start();
    
    try {
      await scraperService.initialize();
      spinner.success({ text: chalk.green('✓ Scraper service initialized with 128 workers') });
      
      // Show queue stats
      const stats = await scraperService.getQueueStats();
      console.log(chalk.cyan('\n📊 Queue Statistics:'));
      console.log(`  Workers: ${stats.workers}`);
      console.log(`  Status: ${stats.isRunning ? chalk.green('Running') : chalk.yellow('Stopped')}`);
      
      process.exit(0);
    } catch (error) {
      spinner.error({ text: chalk.red(`Failed to initialize: ${error}`) });
      process.exit(1);
    }
  });

// Scrape all symbols
program
  .command('scrape-all')
  .description('Scrape earning results for all symbols in database')
  .action(async () => {
    const spinner = createSpinner('Starting full scraping job...').start();
    
    try {
      await scraperService.initialize();
      const job = await scraperService.scrapeAllSymbols('CLI');
      
      spinner.success({ text: chalk.green(`✓ Started scraping ${job.totalSymbols} symbols`) });
      console.log(chalk.cyan(`\n📋 Job ID: ${job.id}`));
      console.log(chalk.cyan(`📊 Total Symbols: ${job.totalSymbols}`));
      console.log(chalk.cyan(`⚙️  Workers: ${job.workerCount}`));
      
      // Monitor progress
      await monitorJob(job.id);
      
    } catch (error) {
      spinner.error({ text: chalk.red(`Failed to start scraping: ${error}`) });
      process.exit(1);
    }
  });

// Scrape specific symbols
program
  .command('scrape')
  .description('Scrape earning results for specific symbols')
  .argument('<symbols...>', 'Stock symbols to scrape (e.g., VIC VHM VCB)')
  .action(async (symbols: string[]) => {
    const spinner = createSpinner(`Starting scraping for ${symbols.length} symbols...`).start();
    
    try {
      await scraperService.initialize();
      const job = await scraperService.startScrapingJob(
        symbols,
        symbols.length === 1 ? 'SINGLE' : 'PARTIAL',
        'CLI'
      );
      
      spinner.success({ text: chalk.green(`✓ Started scraping ${symbols.length} symbols`) });
      console.log(chalk.cyan(`\n📋 Job ID: ${job.id}`));
      console.log(chalk.cyan(`📊 Symbols: ${symbols.join(', ')}`));
      console.log(chalk.cyan(`⚙️  Workers: ${job.workerCount}`));
      
      // Monitor progress
      await monitorJob(job.id);
      
    } catch (error) {
      spinner.error({ text: chalk.red(`Failed to start scraping: ${error}`) });
      process.exit(1);
    }
  });

// Scrape outdated symbols
program
  .command('scrape-outdated')
  .description('Scrape symbols with data older than specified hours')
  .option('-h, --hours <hours>', 'Hours threshold for outdated data', '24')
  .action(async (options) => {
    const hours = parseInt(options.hours);
    const spinner = createSpinner(`Finding symbols older than ${hours} hours...`).start();
    
    try {
      await scraperService.initialize();
      const job = await scraperService.scrapeOutdatedSymbols(hours);
      
      spinner.success({ text: chalk.green(`✓ Started scraping ${job.totalSymbols} outdated symbols`) });
      console.log(chalk.cyan(`\n📋 Job ID: ${job.id}`));
      console.log(chalk.cyan(`📊 Total Symbols: ${job.totalSymbols}`));
      console.log(chalk.cyan(`⏰ Threshold: ${hours} hours`));
      console.log(chalk.cyan(`⚙️  Workers: ${job.workerCount}`));
      
      // Monitor progress
      await monitorJob(job.id);
      
    } catch (error: any) {
      if (error.message === 'No symbols need updating') {
        spinner.success({ text: chalk.green('✓ All symbols are up to date') });
        process.exit(0);
      } else {
        spinner.error({ text: chalk.red(`Failed to start scraping: ${error}`) });
        process.exit(1);
      }
    }
  });

// Show job status
program
  .command('status')
  .description('Show status of a scraping job')
  .argument('<jobId>', 'Job ID to check')
  .action(async (jobId: string) => {
    try {
      const job = await scraperService.getJobStatus(jobId);
      
      if (!job) {
        console.log(chalk.red('✗ Job not found'));
        process.exit(1);
      }
      
      displayJobStatus(job);
      process.exit(0);
    } catch (error) {
      console.log(chalk.red(`Failed to get job status: ${error}`));
      process.exit(1);
    }
  });

// List all jobs
program
  .command('jobs')
  .description('List all scraping jobs')
  .option('-l, --limit <limit>', 'Number of jobs to show', '10')
  .action(async (options) => {
    try {
      const limit = parseInt(options.limit);
      const { jobs, total } = await scraperService.getAllJobs(limit, 0);
      
      console.log(chalk.cyan(`\n📋 Scraping Jobs (showing ${jobs.length} of ${total}):\n`));
      
      for (const job of jobs) {
        const status = getStatusEmoji(job.status);
        const progress = job.totalSymbols > 0 
          ? Math.round((job.processedSymbols / job.totalSymbols) * 100)
          : 0;
        
        console.log(`${status} ${chalk.gray(job.id.substring(0, 8))}... ${chalk.white(job.jobType.padEnd(8))} ` +
          `[${job.processedSymbols}/${job.totalSymbols}] ${progress}% ` +
          `${chalk.gray(new Date(job.createdAt).toLocaleString())}`);
      }
      
      process.exit(0);
    } catch (error) {
      console.log(chalk.red(`Failed to get jobs: ${error}`));
      process.exit(1);
    }
  });

// Show worker statistics
program
  .command('workers')
  .description('Show worker statistics')
  .action(async () => {
    try {
      const workers = await scraperService.getWorkerStats();
      
      console.log(chalk.cyan(`\n👷 Worker Statistics (${workers.length} workers):\n`));
      
      // Summary
      const active = workers.filter(w => w.status === 'WORKING').length;
      const idle = workers.filter(w => w.status === 'IDLE').length;
      const totalProcessed = workers.reduce((sum, w) => sum + w.processedCount, 0);
      const totalSuccess = workers.reduce((sum, w) => sum + w.successCount, 0);
      const totalErrors = workers.reduce((sum, w) => sum + w.errorCount, 0);
      
      console.log(chalk.green(`  Active: ${active}`));
      console.log(chalk.yellow(`  Idle: ${idle}`));
      console.log(chalk.white(`  Total Processed: ${totalProcessed}`));
      console.log(chalk.green(`  Total Success: ${totalSuccess}`));
      console.log(chalk.red(`  Total Errors: ${totalErrors}`));
      
      // Show active workers
      if (active > 0) {
        console.log(chalk.cyan('\n  Active Workers:'));
        workers
          .filter(w => w.status === 'WORKING')
          .forEach(w => {
            console.log(`    ${w.workerId}: ${chalk.yellow(w.currentSymbol || 'N/A')}`);
          });
      }
      
      process.exit(0);
    } catch (error) {
      console.log(chalk.red(`Failed to get worker stats: ${error}`));
      process.exit(1);
    }
  });

// Show queue statistics
program
  .command('queue')
  .description('Show queue statistics')
  .action(async () => {
    try {
      await scraperService.initialize();
      const stats = await scraperService.getQueueStats();
      
      console.log(chalk.cyan('\n📊 Queue Statistics:\n'));
      console.log(`  ${chalk.yellow('Waiting:')} ${stats.waiting}`);
      console.log(`  ${chalk.green('Active:')} ${stats.active}`);
      console.log(`  ${chalk.blue('Completed:')} ${stats.completed}`);
      console.log(`  ${chalk.red('Failed:')} ${stats.failed}`);
      console.log(`  ${chalk.white('Workers:')} ${stats.workers}`);
      console.log(`  ${chalk.white('Status:')} ${stats.isRunning ? chalk.green('Running') : chalk.red('Stopped')}`);
      
      process.exit(0);
    } catch (error) {
      console.log(chalk.red(`Failed to get queue stats: ${error}`));
      process.exit(1);
    }
  });

// Database statistics
program
  .command('db-stats')
  .description('Show database statistics for earning results')
  .action(async () => {
    try {
      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(earningResults);
      
      // Get latest scraped
      const latest = await db
        .select({
          symbol: earningResults.symbol,
          lastScrapedAt: earningResults.lastScrapedAt,
        })
        .from(earningResults)
        .orderBy(desc(earningResults.lastScrapedAt))
        .limit(5);
      
      // Get outdated count (> 24 hours)
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [{ outdated }] = await db
        .select({ outdated: sql<number>`count(*)` })
        .from(earningResults)
        .where(sql`${earningResults.lastScrapedAt} < ${cutoffDate}`);
      
      console.log(chalk.cyan('\n💾 Database Statistics:\n'));
      console.log(`  ${chalk.white('Total Records:')} ${count}`);
      console.log(`  ${chalk.yellow('Outdated (>24h):')} ${outdated}`);
      console.log(`  ${chalk.green('Up to date:')} ${Number(count) - Number(outdated)}`);
      
      if (latest.length > 0) {
        console.log(chalk.cyan('\n  Recently Updated:'));
        latest.forEach(item => {
          const hours = Math.round((Date.now() - new Date(item.lastScrapedAt).getTime()) / (1000 * 60 * 60));
          console.log(`    ${item.symbol}: ${hours} hours ago`);
        });
      }
      
      process.exit(0);
    } catch (error) {
      console.log(chalk.red(`Failed to get database stats: ${error}`));
      process.exit(1);
    }
  });

// Shutdown command
program
  .command('shutdown')
  .description('Shutdown the scraper service gracefully')
  .action(async () => {
    const spinner = createSpinner('Shutting down scraper service...').start();
    
    try {
      await scraperService.shutdown();
      spinner.success({ text: chalk.green('✓ Scraper service shut down successfully') });
      process.exit(0);
    } catch (error) {
      spinner.error({ text: chalk.red(`Failed to shutdown: ${error}`) });
      process.exit(1);
    }
  });

// Helper functions
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'PENDING': return '⏳';
    case 'RUNNING': return '🔄';
    case 'COMPLETED': return '✅';
    case 'COMPLETED_WITH_ERRORS': return '⚠️';
    case 'FAILED': return '❌';
    default: return '❓';
  }
}

function displayJobStatus(job: any) {
  const progress = job.totalSymbols > 0 
    ? Math.round((job.processedSymbols / job.totalSymbols) * 100)
    : 0;
  
  console.log(chalk.cyan('\n📋 Job Status:\n'));
  console.log(`  ${chalk.white('ID:')} ${job.id}`);
  console.log(`  ${chalk.white('Type:')} ${job.jobType}`);
  console.log(`  ${chalk.white('Status:')} ${getStatusEmoji(job.status)} ${job.status}`);
  console.log(`  ${chalk.white('Progress:')} ${job.processedSymbols}/${job.totalSymbols} (${progress}%)`);
  console.log(`  ${chalk.green('Success:')} ${job.successfulSymbols}`);
  console.log(`  ${chalk.red('Failed:')} ${job.failedSymbols}`);
  console.log(`  ${chalk.white('Workers:')} ${job.workerCount}`);
  
  if (job.startedAt) {
    const duration = job.completedAt 
      ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
      : Date.now() - new Date(job.startedAt).getTime();
    
    console.log(`  ${chalk.white('Duration:')} ${Math.round(duration / 1000)}s`);
  }
  
  if (job.status === 'RUNNING' && job.processedSymbols > 0) {
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    const timePerSymbol = elapsed / job.processedSymbols;
    const remainingSymbols = job.totalSymbols - job.processedSymbols;
    const estimatedTimeRemaining = Math.round(timePerSymbol * remainingSymbols / 1000);
    
    console.log(`  ${chalk.white('Est. Time Remaining:')} ${estimatedTimeRemaining}s`);
  }
  
  if (job.lastError) {
    console.log(`  ${chalk.red('Last Error:')} ${job.lastError}`);
  }
}

async function monitorJob(jobId: string) {
  console.log(chalk.cyan('\n🔄 Monitoring progress...\n'));
  
  let lastProgress = -1;
  let spinnerText = 'Processing...';
  const spinner = createSpinner(spinnerText).start();
  
  const interval = setInterval(async () => {
    try {
      const job = await scraperService.getJobStatus(jobId);
      
      if (!job) {
        spinner.error({ text: chalk.red('Job not found') });
        clearInterval(interval);
        process.exit(1);
      }
      
      const progress = job.totalSymbols > 0 
        ? Math.round((job.processedSymbols / job.totalSymbols) * 100)
        : 0;
      
      if (progress !== lastProgress) {
        lastProgress = progress;
        spinnerText = `Progress: ${job.processedSymbols}/${job.totalSymbols} (${progress}%) - ` +
          `Success: ${job.successfulSymbols}, Failed: ${job.failedSymbols}`;
        spinner.update({ text: spinnerText });
      }
      
      if (job.status === 'COMPLETED' || job.status === 'COMPLETED_WITH_ERRORS' || job.status === 'FAILED') {
        clearInterval(interval);
        
        if (job.status === 'COMPLETED') {
          spinner.success({ text: chalk.green(`✓ Job completed successfully! Processed ${job.totalSymbols} symbols`) });
        } else if (job.status === 'COMPLETED_WITH_ERRORS') {
          spinner.warn({ text: chalk.yellow(`⚠ Job completed with ${job.failedSymbols} errors`) });
        } else {
          spinner.error({ text: chalk.red(`✗ Job failed: ${job.lastError}`) });
        }
        
        // Show final stats
        console.log(chalk.cyan('\n📊 Final Statistics:'));
        console.log(`  Total: ${job.totalSymbols}`);
        console.log(`  Success: ${chalk.green(job.successfulSymbols)}`);
        console.log(`  Failed: ${chalk.red(job.failedSymbols)}`);
        
        if (job.completedAt && job.startedAt) {
          const duration = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
          console.log(`  Duration: ${Math.round(duration / 1000)}s`);
          console.log(`  Speed: ${Math.round(job.totalSymbols / (duration / 1000))} symbols/sec`);
        }
        
        process.exit(job.status === 'FAILED' ? 1 : 0);
      }
    } catch (error) {
      spinner.error({ text: chalk.red(`Error monitoring job: ${error}`) });
      clearInterval(interval);
      process.exit(1);
    }
  }, 1000);
}

// Parse command line arguments
program.parse(process.argv);