# Earning Results Scraper - NPM Scripts Guide

## 🎯 Overview

A simplified command-line interface for managing the earning results scraping system with **128 parallel workers**. No API endpoints needed - everything is controlled via npm scripts!

## ⚡ Quick Start

### 1. Install Redis (Required)
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### 2. Configure Environment
Add to `.env` file:
```env
REDIS_URL=redis://localhost:6379
VIETCAP_API_TOKEN=your_vietcap_token_here
SCRAPER_MAX_WORKERS=128
SCRAPER_BATCH_SIZE=100
SCRAPER_RETRY_ATTEMPTS=3
SCRAPER_RETRY_DELAY=5000
SCRAPER_CONCURRENCY_PER_WORKER=2
```

### 3. Initialize Scraper
```bash
npm run scraper:init
```

## 📝 Available NPM Scripts

### Core Operations

| Command | Description |
|---------|-------------|
| `npm run scraper:init` | Initialize the scraper service with 128 workers |
| `npm run scraper:all` | Scrape ALL symbols from database |
| `npm run scraper:outdated` | Scrape symbols older than 24 hours |
| `npm run scraper:shutdown` | Gracefully shutdown the scraper |

### Monitoring & Statistics

| Command | Description |
|---------|-------------|
| `npm run scraper:jobs` | List all scraping jobs |
| `npm run scraper:workers` | Show worker statistics |
| `npm run scraper:queue` | Show queue statistics |
| `npm run scraper:db-stats` | Show database statistics |

### Advanced Usage

#### Scrape Specific Symbols
```bash
npm run scraper -- scrape VIC VHM VCB MSN HPG
```

#### Scrape with Custom Hours Threshold
```bash
npm run scraper -- scrape-outdated --hours 48
```

#### Check Specific Job Status
```bash
npm run scraper -- status <job-id>
```

#### Show More Jobs
```bash
npm run scraper -- jobs --limit 20
```

#### Get Help
```bash
npm run scraper -- --help
```

## 🚀 Common Workflows

### Daily Update (Recommended)
```bash
# Update all symbols older than 24 hours
npm run scraper:outdated
```

### Initial Data Load
```bash
# 1. Initialize scraper
npm run scraper:init

# 2. Scrape all symbols
npm run scraper:all

# 3. Check progress
npm run scraper:jobs
```

### Monitor Active Scraping
```bash
# Check queue status
npm run scraper:queue

# Check worker activity
npm run scraper:workers

# Check database freshness
npm run scraper:db-stats
```

### Scrape Specific Stocks
```bash
# Scrape individual stocks
npm run scraper -- scrape VIC
npm run scraper -- scrape VIC VHM VCB
```

## 📊 Performance Metrics

- **Workers**: 128 parallel workers
- **Speed**: ~2000 symbols in < 1 minute
- **Cache**: 30-minute memory cache + 24-hour database cache
- **Database-first**: Serves data from DB (50ms) vs API (1000ms)

## 🔄 Automation with Cron

Add to crontab for daily updates:
```bash
# Run at 6 AM daily
0 6 * * * cd /path/to/backend && npm run scraper:outdated

# Run every 6 hours
0 */6 * * * cd /path/to/backend && npm run scraper:outdated
```

## 🛠️ Troubleshooting

### Check if Redis is Running
```bash
redis-cli ping
# Should return: PONG
```

### View Logs
```bash
# The scraper shows colorful real-time logs
npm run scraper:all
# Shows progress bar and statistics
```

### Check Database Content
```bash
# See how many records and their freshness
npm run scraper:db-stats
```

### Monitor Active Jobs
```bash
# List all jobs with progress
npm run scraper:jobs

# Check specific job
npm run scraper -- status <job-id>
```

## 📈 Example Output

### Scraping Progress
```
✓ Started scraping 1847 symbols
📋 Job ID: 550e8400-e29b-41d4-a716-446655440000
📊 Total Symbols: 1847
⚙️  Workers: 128

🔄 Monitoring progress...

Progress: 924/1847 (50%) - Success: 920, Failed: 4
```

### Database Statistics
```
💾 Database Statistics:

  Total Records: 1847
  Outdated (>24h): 0
  Up to date: 1847

  Recently Updated:
    VIC: 1 hours ago
    VHM: 1 hours ago
    VCB: 1 hours ago
```

### Worker Statistics
```
👷 Worker Statistics (128 workers):

  Active: 64
  Idle: 64
  Total Processed: 1847
  Total Success: 1843
  Total Errors: 4
```

## 💡 Tips

1. **First Time Setup**: Run `npm run scraper:all` to populate database
2. **Daily Updates**: Use `npm run scraper:outdated` for incremental updates
3. **Monitor Progress**: The CLI shows real-time progress with spinner
4. **Check Health**: Use `npm run scraper:db-stats` to see data freshness
5. **Graceful Shutdown**: Always use `npm run scraper:shutdown` before stopping

## 🔒 Security Notes

- Scraper runs locally - no exposed API endpoints
- Redis should be password-protected in production
- VIETCAP_API_TOKEN stored securely in .env file
- Database credentials protected via environment variables

## 📝 Script Details

All commands are powered by a single CLI script at `scripts/scraper.ts` that:
- Manages 128 workers efficiently
- Provides colorful, interactive output
- Monitors progress in real-time
- Handles errors gracefully
- Supports both simple and advanced operations

---

*No API endpoints needed! Everything controlled via simple npm scripts.* 🎉