#!/usr/bin/env tsx

/**
 * Test script for DNSE OHLC Data
 * Tests fetching OHLC (candlestick) data from DNSE market data API
 */

import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { createSpinner } from 'nanospinner';
import axios from 'axios';

// Load environment variables
dotenv.config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 2024}`;
const TEST_SYMBOLS = ['VIC', 'VNM', 'FPT', 'VCB', 'HPG'];

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

async function checkServerStatus() {
  const spinner = createSpinner('Checking server status...').start();
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    spinner.success({ text: chalk.green('✓ Server is running') });
    return true;
  } catch (error) {
    spinner.error({ text: chalk.red('✗ Server is not running. Please start the server first.') });
    console.log(chalk.yellow(`\nRun: npm run pm2:start:dev`));
    return false;
  }
}

async function checkMarketDataStatus() {
  const spinner = createSpinner('Checking DNSE market data service...').start();
  
  try {
    const response = await axios.get<ApiResponse<any>>(`${API_BASE_URL}/api/dnse-market/status`);
    const status = response.data.data;
    
    if (status.initialized) {
      spinner.success({ text: chalk.green('✓ DNSE market data service is ready') });
      console.log(chalk.cyan(`   Connected: ${status.connected}`));
      console.log(chalk.cyan(`   Subscribed Symbols: ${status.subscribedSymbols}`));
      console.log(chalk.cyan(`   Cached Symbols: ${status.cachedSymbols}`));
    } else {
      spinner.warn({ text: chalk.yellow('⚠ DNSE market data service not initialized') });
    }
    
    return status;
  } catch (error: any) {
    spinner.error({ text: chalk.red(`✗ Failed to check status: ${error.message}`) });
    return null;
  }
}

async function subscribeToSymbols(symbols: string[]) {
  const spinner = createSpinner(`Subscribing to ${symbols.length} symbols...`).start();
  
  try {
    const response = await axios.post<ApiResponse<any>>(
      `${API_BASE_URL}/api/dnse-market/subscribe`,
      {
        symbols,
        dataTypes: ['tick', 'top_price', 'ohlc'] // Include OHLC in subscription
      }
    );
    
    if (response.data.success) {
      spinner.success({ text: chalk.green(`✓ Subscribed to ${symbols.length} symbols`) });
      return true;
    } else {
      spinner.error({ text: chalk.red(`✗ Failed to subscribe: ${response.data.error}`) });
      return false;
    }
  } catch (error: any) {
    spinner.error({ text: chalk.red(`✗ Subscription failed: ${error.message}`) });
    if (error.response?.data?.error) {
      console.log(chalk.red(`   Error: ${error.response.data.error}`));
    }
    return false;
  }
}

async function fetchOHLCData(symbol: string, timeframe?: string) {
  try {
    const url = timeframe 
      ? `${API_BASE_URL}/api/dnse-market/ohlc/${symbol}?timeframe=${timeframe}`
      : `${API_BASE_URL}/api/dnse-market/ohlc/${symbol}`;
    
    const response = await axios.get<ApiResponse<any>>(url);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      console.log(chalk.yellow(`   ⚠ No OHLC data for ${symbol}: ${response.data.error}`));
      return null;
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(chalk.yellow(`   ⚠ No OHLC data available for ${symbol}`));
    } else {
      console.log(chalk.red(`   ✗ Error fetching OHLC for ${symbol}: ${error.message}`));
    }
    return null;
  }
}

function displayOHLCData(symbol: string, ohlc: any) {
  if (!ohlc) return;
  
  console.log(chalk.bold.blue(`\n📊 OHLC Data for ${symbol}:`));
  
  // If single OHLC data
  if (!Array.isArray(ohlc)) {
    console.log(chalk.cyan(`   Timeframe: ${ohlc.timeframe || 'N/A'}`));
    console.log(chalk.green(`   Open:  ${ohlc.open}`));
    console.log(chalk.green(`   High:  ${ohlc.high}`));
    console.log(chalk.red(`   Low:   ${ohlc.low}`));
    console.log(chalk.white(`   Close: ${ohlc.close}`));
    console.log(chalk.magenta(`   Volume: ${ohlc.volume}`));
    console.log(chalk.gray(`   Time: ${ohlc.timestamp}`));
  } else {
    // If multiple OHLC data (different timeframes)
    ohlc.forEach((candle: any) => {
      console.log(chalk.cyan(`\n   [${candle.timeframe}]`));
      console.log(`   O: ${candle.open} | H: ${candle.high} | L: ${candle.low} | C: ${candle.close}`);
      console.log(`   Volume: ${candle.volume}`);
    });
  }
}

async function fetchAllOHLCData() {
  console.log(chalk.bold.cyan('\n📈 Fetching OHLC Data for All Symbols:\n'));
  
  const timeframes = ['1m', '5m', '15m', '30m', '1h', '1d'];
  
  for (const symbol of TEST_SYMBOLS) {
    console.log(chalk.bold.white(`\n${symbol}:`));
    
    // Try different timeframes
    for (const tf of timeframes) {
      const ohlc = await fetchOHLCData(symbol, tf);
      if (ohlc) {
        console.log(chalk.green(`   ✓ ${tf}: O:${ohlc.open} H:${ohlc.high} L:${ohlc.low} C:${ohlc.close} V:${ohlc.volume}`));
      } else {
        console.log(chalk.gray(`   - ${tf}: No data`));
      }
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function waitForOHLCData(symbols: string[], duration: number = 30000) {
  console.log(chalk.yellow(`\n⏳ Waiting for OHLC data (${duration/1000} seconds)...`));
  console.log(chalk.gray('   Note: OHLC data is generated from tick data over time\n'));
  
  const startTime = Date.now();
  const checkInterval = 5000; // Check every 5 seconds
  
  while (Date.now() - startTime < duration) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    
    console.log(chalk.cyan(`\n[${new Date().toLocaleTimeString()}] Checking for OHLC data...`));
    
    for (const symbol of symbols) {
      // Try to get 1-minute OHLC
      const ohlc = await fetchOHLCData(symbol, '1m');
      if (ohlc) {
        displayOHLCData(symbol, ohlc);
      }
    }
  }
}

async function main() {
  console.log(chalk.bold.blue('\n🚀 DNSE OHLC Data Test\n'));
  console.log(chalk.gray('This script tests fetching OHLC (candlestick) data from DNSE\n'));
  
  // Check server
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    process.exit(1);
  }
  
  // Check market data service
  const status = await checkMarketDataStatus();
  
  // Subscribe to symbols
  const subscribed = await subscribeToSymbols(TEST_SYMBOLS);
  if (!subscribed) {
    console.log(chalk.yellow('\n⚠ Could not subscribe to symbols. DNSE credentials may not be configured.'));
    console.log(chalk.yellow('Please set DNSE_USERNAME and DNSE_PASSWORD in .env file\n'));
  }
  
  // Wait a moment for initial data
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Fetch OHLC data
  await fetchAllOHLCData();
  
  // Wait for real-time OHLC updates
  if (subscribed) {
    await waitForOHLCData(TEST_SYMBOLS.slice(0, 3), 30000); // Monitor first 3 symbols for 30 seconds
  }
  
  console.log(chalk.bold.green('\n✅ OHLC Data test completed!\n'));
  
  // Tips
  console.log(chalk.yellow('💡 Tips:'));
  console.log(chalk.yellow('  - OHLC data is built from tick data over time'));
  console.log(chalk.yellow('  - Different timeframes (1m, 5m, 15m, 30m, 1h, 1d) are available'));
  console.log(chalk.yellow('  - Data is only available during market hours (9:00-15:00 on weekdays)'));
  console.log(chalk.yellow('\n📊 API Endpoints for OHLC:'));
  console.log(chalk.cyan('  GET /api/dnse-market/ohlc/{symbol}              - Get all timeframes'));
  console.log(chalk.cyan('  GET /api/dnse-market/ohlc/{symbol}?timeframe=1m - Get specific timeframe'));
  
  process.exit(0);
}

// Run the test
main().catch((error) => {
  console.error(chalk.red(`\n❌ Unexpected error: ${error.message}`));
  process.exit(1);
});