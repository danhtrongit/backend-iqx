import { AnalysisReportsService } from '../services/analysis-reports.service';

async function testAnalysisReports() {
  try {
    console.log('Testing analysis reports functionality...\n');
    
    // Test symbol to use
    const testSymbol = 'VIC';
    
    console.log(`1. Fetching and saving reports for ${testSymbol}...`);
    const syncResult = await AnalysisReportsService.fetchAndSaveReports(testSymbol, true);
    console.log('Sync result:', syncResult);
    console.log('-----------------------------\n');
    
    // Get reports with pagination
    console.log(`2. Getting reports for ${testSymbol} (page 0, size 10)...`);
    const paginatedReports = await AnalysisReportsService.getReportsBySymbol(testSymbol, 0, 10);
    console.log(`Total reports: ${paginatedReports.total}`);
    console.log(`Total pages: ${paginatedReports.totalPages}`);
    console.log(`First page reports (${paginatedReports.data.length}):`);
    paginatedReports.data.forEach((report, i) => {
      console.log(`\n${i + 1}. ${report.title}`);
      console.log(`   Date: ${report.issueDate}`);
      console.log(`   Source: ${report.source}`);
      console.log(`   Recommendation: ${report.recommend}`);
      console.log(`   Target Price: ${report.targetPrice}`);
      if (report.localPdfPath) {
        console.log(`   PDF saved at: ${report.localPdfPath}`);
      }
    });
    console.log('-----------------------------\n');
    
    if (paginatedReports.data.length > 0) {
      // Test getting a single report
      const testReportId = paginatedReports.data[0].id;
      console.log(`3. Getting single report by ID: ${testReportId}...`);
      const singleReport = await AnalysisReportsService.getReportById(testReportId);
      console.log('Single report:', singleReport);
      console.log('-----------------------------\n');
    }
    
    // Test filtering reports
    console.log('4. Getting all reports with filters...');
    const filteredReports = await AnalysisReportsService.getAllReports(0, 10, {
      source: 'Vietcap',
    });
    console.log(`Found ${filteredReports.total} reports from Vietcap`);
    console.log('Sample reports:');
    filteredReports.data.slice(0, 3).forEach((report, i) => {
      console.log(`\n${i + 1}. ${report.title}`);
      console.log(`   Source: ${report.source}`);
      console.log(`   Date: ${report.issueDate}`);
    });
    console.log('-----------------------------\n');
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

// Only run if directly called (not imported)
if (require.main === module) {
  testAnalysisReports();
}