# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

IQX Backend - A Fastify-based API server running on port 2024 (production) or 3000 (development) with PostgreSQL and comprehensive stock market features for Vietnamese markets (HSX, HNX, UPCOM).

## Essential Commands

### Development Workflow
```bash
# Start development server with hot reload (port 3000)
npm run dev

# Production server using PM2 (port 2024)
npm run pm2:start:dev  # Development mode with watch
npm run pm2:start      # Production mode
npm run pm2:logs       # View live logs
npm run pm2:status     # Check process status
npm run pm2:restart    # Restart server
npm run pm2:reload     # Zero-downtime reload
```

### Database Operations
```bash
# Initial setup
npm run db:push        # Push schema directly (dev only)
npm run db:generate    # Generate migrations
npm run db:migrate     # Apply migrations
npm run db:studio      # Open Drizzle Studio UI

# Data seeding
npm run seed:stocks                    # Import stock symbols (auto-runs on startup)
npm run seed:stocks:force              # Force re-import all symbols
npm run fetch:peer-comparison         # Fetch peer comparison data
npm run fetch:peer-comparison:force   # Force refresh peer data
npm run fetch:analysis-reports        # Fetch analysis reports
npm run fetch:earning-results         # Fetch earning results for all symbols
npm run fetch:earning-results:force   # Force refresh earnings
```

### Scraper Management (Earning Results)
```bash
# Initialize scraper with 128 workers
npm run scraper:init

# Scraping operations
npm run scraper:all           # Scrape all symbols
npm run scraper:outdated      # Scrape symbols older than 24h
tsx scripts/scraper.ts scrape VIC VHM  # Scrape specific symbols

# Monitoring
npm run scraper:jobs          # List all scraping jobs
npm run scraper:workers       # Show worker status
npm run scraper:queue         # Check queue statistics
npm run scraper:db-stats      # Database statistics
tsx scripts/scraper.ts status <jobId>  # Check specific job
```

### Testing Scripts
```bash
# Test specific features
npm run test:analysis-reports         # Test analysis reports API
npm run test:earning-results VIC      # Test earnings for symbol
tsx src/scripts/test-single-symbol.ts VIC  # Test single symbol fetch
tsx src/scripts/test-batch.ts         # Test batch operations
```

### Build & Deployment
```bash
npm run build         # TypeScript compilation
npm run lint          # Run ESLint
npm run format        # Format with Prettier
```

## Architecture Overview

### Core Services Architecture

The application follows a layered architecture with clear separation of concerns:

1. **Fastify Server** (`src/server.ts`) - Main HTTP server setup with plugins
2. **Database Layer** (`src/db/`) - Drizzle ORM with PostgreSQL
3. **Service Layer** (`src/services/`) - Business logic implementation
4. **Route Layer** (`src/routes/`) - HTTP endpoint definitions
5. **Plugin Layer** (`src/plugins/`) - Fastify plugins for auth, error handling
6. **External Integrations** - VietCap API

### Database Schema Structure

Key tables managed through Drizzle ORM:
- **users** - User authentication with phone support
- **refresh_tokens** - JWT refresh token management
- **blacklisted_tokens** - Token revocation tracking
- **stock_symbols** - Vietnamese stock symbols (HSX, HNX, UPCOM)
- **user_watchlists** - User's stock watchlists
- **watchlist_items** - Stocks in watchlists with alerts
- **peer_comparisons** - Stock peer comparison data
- **analysis_reports** - Stock analysis reports
- **earning_results** - Quarterly earning results
- **scrapingJobs/scrapingWorkers** - Scraper job management

### Authentication & Authorization

- **JWT-based auth** with access/refresh token pattern
- **RBAC system** with roles: user, author, admin
- **Phone authentication** support with verification codes
- **Token blacklisting** for logout/revocation
- **Protected routes** using `verifyToken` and `requireRole` decorators

### Proxy Services

Three proxy routes to VietCap services:
- `/proxy/iq/*` → `https://iq.vietcap.com.vn`
- `/proxy/trading/*` → `https://trading.vietcap.com.vn`
- `/proxy/ai/*` → `https://ai.vietcap.com.vn`

All proxy routes preserve original paths and query parameters.

### Scraper System

The earning results scraper (`src/services/earning-scraper.service.ts`) uses:
- **Worker pool** architecture (128 concurrent workers)
- **Job queue** system with Redis for coordination
- **Batch processing** with configurable batch sizes
- **Retry logic** with exponential backoff
- **Progress tracking** in PostgreSQL

### Stock Search System

Optimized search with multiple strategies:
- **Quick search** - Symbol-priority autocomplete
- **Full search** - Advanced filtering with pagination
- **Exact match** - Direct symbol lookup
- **Prefix search** - Alphabetical browsing
- **Vietnamese text** support with accent-insensitive search

## Environment Configuration

Critical environment variables (see `.env.example`):
- `PORT` - Server port (default: 3000, production: 2024)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - Token secrets (min 32 chars)
- `VIETCAP_BEARER_TOKEN` - VietCap API authentication
- `REDIS_URL` - Redis for scraper coordination

## Production Deployment

The application runs under PM2 process manager (`ecosystem.config.js`):
- Auto-restart on 1GB memory limit
- Daily restart at 3 AM
- Log rotation in `logs/` directory
- Cluster mode support for scaling
- Graceful shutdown handling

## API Integration Points

### Internal APIs
- `/api/auth/*` - Authentication endpoints
- `/api/stocks/*` - Stock symbol management
- `/api/favorites/*` - User watchlists
- `/api/peer-comparison/*` - Peer analysis
- `/api/analysis-reports/*` - Research reports
- `/api/earning-results/*` - Earnings data

### External Dependencies
- VietCap API - Stock data and analysis
- PostgreSQL - Primary data storage
- Redis - Scraper job queue (optional)

## Development Notes

### Rate Limiting
- Default: 100 requests per minute per IP
- Configurable via `RATE_LIMIT_MAX` and `RATE_LIMIT_TIME_WINDOW`

### CORS Configuration
- Development: Typically allows `localhost:3001,localhost:3002`
- Production: Set specific origins or use wildcard carefully

### Swagger Documentation
- Available at `/docs` in development mode only
- Auto-generated from route schemas

### Database Migrations
- Always use `db:generate` + `db:migrate` in production
- `db:push` is for development rapid iteration only
- Drizzle Studio provides GUI at port 4983

### Performance Considerations
- Stock symbols auto-import on first startup (~3000 symbols)
- Scraper uses worker pools to avoid overwhelming APIs
- PM2 handles process management and auto-restarts
