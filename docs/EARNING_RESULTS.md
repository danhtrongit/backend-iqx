# Earning Results Feature Documentation

## Overview
The Earning Results feature fetches and stores business profit data from the VietCap API for stock symbols. It supports concurrent fetching with up to 128 workers for efficient data collection.

## Features
- Fetch earning results data from VietCap API
- Store comprehensive financial metrics including revenue, NPAT MI, EPS, ROE, ROA, PE, and PB ratios
- Support for concurrent fetching with configurable worker count (default: 128)
- API endpoints for accessing and managing earning results
- Command-line scripts for batch processing

## Configuration

### Environment Variables
Add the following to your `.env` file:

```env
# VietCap API Authentication (Optional but recommended)
VIETCAP_BEARER_TOKEN=your-bearer-token-here
```

Note: While the Bearer token is optional, you may encounter rate limiting or authentication errors without it.

### API Headers
The service automatically includes the following headers for API compatibility:
- `Referer: https://trading.vietcap.com.vn`
- `Origin: https://trading.vietcap.com.vn`
- `User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)`
- `Authorization: Bearer <token>` (if configured)

## Database Schema

The earning results are stored in the `earning_results` table with the following key fields:

- **Symbol Information**: `symbol`, `current_year`, `cumulative_quarter`
- **Revenue Metrics**: Previous year, current forecast, cumulative, and growth rates
- **NPAT MI Metrics**: Net Profit After Tax - Minority Interest data
- **EPS Metrics**: Earnings Per Share data and growth rates
- **Financial Ratios**: ROE, ROA, PE, PB ratios
- **Metadata**: `fetched_at`, `created_at`, `updated_at`, `raw_data` (complete API response)

## Command-Line Scripts

### Test with Single Symbol
```bash
npm run test:earning-results
# Or specify a symbol:
npx tsx src/scripts/fetch-earning-results.ts --test VIC
```

### Fetch All Symbols
```bash
npm run fetch:earning-results
```

### Force Update All Symbols
```bash
npm run fetch:earning-results:force
```

### Advanced Options
```bash
# Fetch specific symbols
npx tsx src/scripts/fetch-earning-results.ts -s VIC,VNM,HPG

# Adjust concurrency (default: 128)
npx tsx src/scripts/fetch-earning-results.ts -c 50

# Show help
npx tsx src/scripts/fetch-earning-results.ts --help
```

## API Endpoints

### Get All Earning Results
```http
GET /api/earning-results
```

### Get Earning Results for Specific Symbol
```http
GET /api/earning-results/:symbol
```

Example:
```bash
curl http://localhost:3000/api/earning-results/VIC
```

### Fetch Earning Results (Manual Trigger)
```http
POST /api/earning-results/fetch
Content-Type: application/json

{
  "symbols": ["VIC", "VNM", "HPG"],
  "force": false
}
```

### Delete Earning Results for Symbol
```http
DELETE /api/earning-results/:symbol
```

## Data Structure

### API Response Format
The VietCap API returns data in the following structure:
```json
{
  "data": {
    "extras": {
      "cumulativeQuarter": "H1",
      "currentYear": 2025
    },
    "earningData": [
      {
        "name": "revenue",
        "prevYearValue": 189068040000000,
        "currentYearForecastValue": 293812938779680,
        "currentYearCumulativeValue": 130475838000000,
        "percentOfCurrentYear": 0.4440779175
      },
      // ... other metrics
    ]
  }
}
```

### Database Record Structure
Each record stores:
- Individual metric values (revenue, NPAT MI, EPS, etc.)
- Previous year values and current year forecasts
- Growth rates and percentages
- Complete raw API response in JSONB format

## Performance

- **Concurrent Workers**: Configurable from 1 to 128 (default: 128)
- **Processing Rate**: Typically 50-100+ symbols per second with full concurrency
- **Timeout**: 10 seconds per API request
- **Batch Processing**: Automatic progress reporting every 100 symbols

## Error Handling

- **404 Errors**: Symbol not found in API (logged, continues processing)
- **401 Errors**: Authentication failure (check Bearer token)
- **403 Errors**: Access forbidden (may need valid Bearer token)
- **Network Errors**: Logged with details, processing continues for other symbols
- **Database Conflicts**: Updates existing records based on symbol + year unique constraint

## Maintenance

### Update Existing Data
```bash
# Force update all symbols
npm run fetch:earning-results:force

# Update specific symbols
npx tsx src/scripts/fetch-earning-results.ts -s VIC,VNM --force
```

### Monitor Database Statistics
The fetch script displays statistics after completion:
- Total records in database
- Number of unique symbols
- Latest year in dataset

### Clean Up Data
Use the API endpoint to delete specific symbol data:
```bash
curl -X DELETE http://localhost:3000/api/earning-results/VIC
```

## Troubleshooting

### No Bearer Token Warning
If you see "VIETCAP_BEARER_TOKEN is not configured", add the token to your `.env` file.

### 403 Forbidden Errors
This typically means authentication is required. Ensure you have a valid Bearer token configured.

### Slow Processing
Reduce concurrency if experiencing rate limiting:
```bash
npx tsx src/scripts/fetch-earning-results.ts -c 10
```

### Database Connection Issues
Check your `DATABASE_URL` configuration and ensure PostgreSQL is running.