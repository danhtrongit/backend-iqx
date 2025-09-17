import { AnalysisReportsService } from '../services/analysis-reports.service';
import { db } from '../db';
import { stockSymbols } from '../db/schema';

interface FetchOptions {
  symbol?: string;
  force?: boolean;
  downloadPDFs?: boolean;
}

async function fetchAnalysisReports() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options: FetchOptions = {
      downloadPDFs: true
    };

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--symbol' || args[i] === '-s') {
        options.symbol = args[++i]?.toUpperCase();
      } else if (args[i] === '--force' || args[i] === '-f') {
        options.force = true;
      } else if (args[i] === '--no-pdfs') {
        options.downloadPDFs = false;
      }
    }

    // If no symbol is provided, fetch all symbols from the database
    if (!options.symbol) {
      console.log('No symbol specified, fetching all symbols from database...');
      
      const symbols = await db
        .select({
          symbol: stockSymbols.symbol,
          type: stockSymbols.type,
          board: stockSymbols.board
        })
        .from(stockSymbols)
        .orderBy(stockSymbols.symbol);

      console.log(`Found ${symbols.length} symbols in database.`);
      
      let totalSaved = 0;
      let totalErrors = 0;
      let processedCount = 0;
      
      for (const stockSymbol of symbols) {
        processedCount++;
        console.log(`\n[${processedCount}/${symbols.length}] Processing ${stockSymbol.symbol} (${stockSymbol.type} - ${stockSymbol.board})...`);
        
        try {
          const result = await AnalysisReportsService.fetchAndSaveReports(
            stockSymbol.symbol,
            options.downloadPDFs
          );
          
          totalSaved += result.saved;
          totalErrors += result.errors;
          
          if (result.saved > 0) {
            const reports = await AnalysisReportsService.getReportsBySymbol(stockSymbol.symbol, 0, 3);
            console.log(`Latest reports for ${stockSymbol.symbol}:`);
            reports.data.forEach((report, i) => {
              console.log(`  ${i + 1}. ${report.title} (${report.issueDate})`);
            });
          }
          
          console.log(`Results for ${stockSymbol.symbol}: ${result.saved} saved, ${result.errors} errors`);
          
          // Add a small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`Error processing ${stockSymbol.symbol}:`, error);
          totalErrors++;
        }
      }
      
      console.log('\n=== Final Results ===');
      console.log(`Total symbols processed: ${symbols.length}`);
      console.log(`Total reports saved: ${totalSaved}`);
      console.log(`Total errors: ${totalErrors}`);
      return;
    }

    console.log(`\nFetching analysis reports for ${options.symbol}...`);
    console.log('Options:', {
      force: options.force || false,
      downloadPDFs: options.downloadPDFs
    });

    // If force is true, we could delete existing reports first
    // This could be implemented if needed

    // Fetch and save reports
    const result = await AnalysisReportsService.fetchAndSaveReports(
      options.symbol,
      options.downloadPDFs
    );

    console.log('\nFetch completed!');
    console.log('-----------------------------');
    console.log(`Reports saved: ${result.saved}`);
    console.log(`Errors: ${result.errors}`);
    
    if (result.saved > 0) {
      // Show sample of fetched reports
      const reports = await AnalysisReportsService.getReportsBySymbol(options.symbol, 0, 5);
      console.log('\nLatest reports:');
      reports.data.forEach((report, i) => {
        console.log(`\n${i + 1}. ${report.title}`);
        console.log(`   Date: ${report.issueDate}`);
        console.log(`   Source: ${report.source}`);
        console.log(`   Target Price: ${report.targetPrice}`);
        if (report.localPdfPath) {
          console.log(`   PDF: ${report.localPdfPath}`);
        }
      });
    }

  } catch (error) {
    console.error('Error fetching analysis reports:', error);
    process.exit(1);
  }
}

// Only run if directly called (not imported)
if (require.main === module) {
  fetchAnalysisReports();
}