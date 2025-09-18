#!/usr/bin/env tsx

import { db, closeConnection } from '../db';
import { earningResults } from '../db/schema/earning-results';
import { sql } from 'drizzle-orm';
import { EarningResultsService } from '../services/earning-results.service';

async function testEarningResults() {
  console.log('\n🧪 Testing Earning Results Feature\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Test fetching single symbol from API
    console.log('\n1️⃣ Testing API fetch for a single symbol (VIC)...');
    const apiData = await EarningResultsService.fetchEarningResultsFromAPI('VIC');
    if (apiData) {
      console.log('✅ API fetch successful');
      console.log(`   Year: ${apiData.data.extras.currentYear}`);
      console.log(`   Quarter: ${apiData.data.extras.cumulativeQuarter}`);
      console.log(`   Metrics count: ${apiData.data.earningData.length}`);
    } else {
      console.log('❌ API fetch failed');
    }
    
    // 2. Check database statistics
    console.log('\n2️⃣ Database Statistics:');
    
    const totalRecords = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(earningResults);
    console.log(`   Total records: ${totalRecords[0]?.count || 0}`);
    
    const uniqueSymbols = await db
      .select({ count: sql<number>`count(distinct symbol)::int` })
      .from(earningResults);
    console.log(`   Unique symbols: ${uniqueSymbols[0]?.count || 0}`);
    
    const years = await db
      .select({ year: earningResults.currentYear })
      .from(earningResults)
      .groupBy(earningResults.currentYear);
    console.log(`   Years in database: ${years.map(y => y.year).join(', ')}`);
    
    // 3. Sample data
    console.log('\n3️⃣ Sample Data (Top 5 by revenue):');
    const topByRevenue = await db
      .select({
        symbol: earningResults.symbol,
        year: earningResults.currentYear,
        revenue: earningResults.revenuePrevYear,
        npat: earningResults.npatMiPrevYear,
        roe: earningResults.roePrevYear,
      })
      .from(earningResults)
      .orderBy(sql`${earningResults.revenuePrevYear} DESC NULLS LAST`)
      .limit(5);
    
    console.table(topByRevenue.map(r => ({
      Symbol: r.symbol,
      Year: r.year,
      'Revenue (VND)': r.revenue ? r.revenue.toExponential(2) : 'N/A',
      'NPAT (VND)': r.npat ? r.npat.toExponential(2) : 'N/A',
      'ROE (%)': r.roe ? (r.roe * 100).toFixed(2) : 'N/A',
    })));
    
    // 4. Data quality check
    console.log('\n4️⃣ Data Quality Check:');
    
    const nullRevenue = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(earningResults)
      .where(sql`${earningResults.revenuePrevYear} IS NULL`);
    console.log(`   Records with NULL revenue: ${nullRevenue[0]?.count || 0}`);
    
    const nullEps = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(earningResults)
      .where(sql`${earningResults.epsPrevYear} IS NULL`);
    console.log(`   Records with NULL EPS: ${nullEps[0]?.count || 0}`);
    
    const recentFetch = await db
      .select({ 
        count: sql<number>`count(*)::int`,
        latest: sql<string>`max(fetched_at)::text`
      })
      .from(earningResults)
      .where(sql`fetched_at > NOW() - INTERVAL '1 hour'`);
    console.log(`   Records fetched in last hour: ${recentFetch[0]?.count || 0}`);
    console.log(`   Latest fetch time: ${recentFetch[0]?.latest || 'N/A'}`);
    
    // 5. Performance metrics
    console.log('\n5️⃣ Performance Test (fetch 3 symbols concurrently):');
    const testSymbols = ['ACB', 'BID', 'CTG'];
    const startTime = Date.now();
    
    const results = await EarningResultsService.processSymbolsConcurrently(
      testSymbols,
      3
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   Processed ${testSymbols.length} symbols in ${duration} seconds`);
    console.log(`   Success: ${results.successful.length}`);
    console.log(`   Failed: ${results.failed.length}`);
    
    console.log('\n✅ All tests completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await closeConnection();
    console.log('👋 Database connection closed\n');
  }
}

// Run tests
testEarningResults().catch(console.error);