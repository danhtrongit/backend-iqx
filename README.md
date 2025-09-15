# Fastify Backend with Authentication & Proxy

## 🚀 Overview

Professional Fastify backend server with JWT authentication, PostgreSQL database (via Drizzle ORM), and proxy functionality.

## ✨ Features

- ⚡ **Fastify** - High-performance web framework
- 🔐 **JWT Authentication** - Secure token-based auth with access/refresh tokens
- 👥 **Role-Based Access Control (RBAC)** - User roles: user, author, admin
- 🗄️ **PostgreSQL + Drizzle ORM** - Type-safe database operations
- 🔄 **Proxy Routes** - Proxy requests to external services (IQ, Trading, AI)
- 📈 **Stock Symbols Management** - Auto-import & search Vietnamese stock symbols
- ⭐ **Watchlists/Favorites** - User stock watchlists with notes and alerts
- 📝 **Swagger Documentation** - Auto-generated API documentation
- 🛡️ **Security** - Helmet, CORS, rate limiting, password hashing
- 📊 **Logging** - Structured logging with Pino
- ✅ **Validation** - Request/response validation with Zod
- 🔥 **Hot Reload** - Development mode with tsx watch

## 📋 Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm or yarn

## 🔧 Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
# Generate database migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly (for development)
npm run db:push

# Open Drizzle Studio to manage database
npm run db:studio

# Import stock symbols (automatically done on first startup)
npm run seed:stocks

# Force re-import stock symbols
npm run seed:stocks:force
```

## 🎯 Development

```bash
# Start dev server with hot reload
npm run dev
```

Server runs at: `http://localhost:3000`

## 📦 Production

```bash
# Build TypeScript
npm run build

# Start production server
npm run start:prod
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (supports optional phone number)
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/login/phone` - Login with phone number and password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/phone` - Update phone number (protected)
- `POST /api/auth/phone/verify/send` - Send phone verification code (protected)
- `POST /api/auth/phone/verify` - Verify phone number with code (protected)

### Admin Routes (Admin Role Required)
- `GET /api/admin/users` - Get all users with pagination and filters
- `GET /api/admin/users/:userId` - Get single user details
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:userId` - Update user
- `DELETE /api/admin/users/:userId` - Delete user
- `PATCH /api/admin/users/:userId/role` - Change user role
- `PATCH /api/admin/users/:userId/toggle-active` - Activate/deactivate user
- `GET /api/admin/stats` - Get user statistics

### Protected Routes (Role-Based)
- `GET /api/protected/user-content` - All authenticated users
- `GET /api/protected/author-content` - Authors only
- `GET /api/protected/author-admin-content` - Authors and admins
- `GET /api/protected/admin-content` - Admins only
- `GET /api/protected/premium-content` - Authors and above (hierarchy)
- `POST /api/protected/check-permission` - Check role permissions

### Stock Symbols API
- `GET /api/stocks/search` - Search stock symbols with filters (prioritizes symbol matches)
  - Query params: `query`, `symbol`, `board`, `type`, `limit`, `offset`, `sortBy`, `sortOrder`
  - Example: `/api/stocks/search?query=vin&board=HSX&limit=10`
- `GET /api/stocks/quick-search` - Quick search optimized for autocomplete (symbol priority)
  - Query params: `q` (required), `limit`, `board`
  - Example: `/api/stocks/quick-search?q=vnm&limit=5`
- `GET /api/stocks/exact/:symbol` - Get exact symbol match (case-insensitive)
  - Example: `/api/stocks/exact/VNM`
- `GET /api/stocks/prefix/:prefix` - Get symbols by prefix (alphabetical browsing)
  - Example: `/api/stocks/prefix/V?board=HSX`
- `GET /api/stocks/symbol/:code` - Get single stock by symbol code
- `GET /api/stocks/boards` - Get all available boards (HSX, HNX, UPCOM)
- `GET /api/stocks/types` - Get all stock types
- `GET /api/stocks/board/:board` - Get all stocks in a specific board
- `GET /api/stocks/stats` - Get stock statistics
- `POST /api/stocks/import` - Import/refresh symbols from VietCap API (Admin only)

### Watchlist API (Protected)
- `GET /api/watchlists` - Get user's watchlists
- `POST /api/watchlists` - Create new watchlist
- `GET /api/watchlists/:id` - Get watchlist with items
- `PUT /api/watchlists/:id` - Update watchlist
- `DELETE /api/watchlists/:id` - Delete watchlist
- `POST /api/watchlists/:id/items` - Add stock to watchlist
- `POST /api/watchlists/quick-add` - Quick add to default watchlist
- `POST /api/watchlists/:id/items/batch` - Batch add stocks
- `PUT /api/watchlists/items/:itemId` - Update watchlist item
- `DELETE /api/watchlists/items/:itemId` - Remove from watchlist
- `POST /api/watchlists/items/:itemId/move` - Move to another watchlist
- `POST /api/watchlists/:id/reorder` - Reorder items
- `GET /api/watchlists/check/:stockId` - Check if stock is in watchlists

### Proxy Routes
- `/proxy/iq/*` - Proxy to IQ service (`https://iq.vietcap.com.vn`)
  - Example: `http://localhost:3000/proxy/iq/api/iq-insight-service/v1/market-watch/top-proprietary?timeFrame=ONE_DAY&exchange=ALL`
- `/proxy/trading/*` - Proxy to Trading service (`https://trading.vietcap.com.vn`)
  - Example: `http://localhost:3000/proxy/trading/api/market-watch/v3/ForeignNetValue/top`
- `/proxy/ai/*` - Proxy to AI service (`https://ai.vietcap.com.vn`)

### Health Check
- `GET /health` - Server health status

### Documentation
- `GET /docs` - Swagger UI (development only)

## 📂 Project Structure

```
src/
├── config/         # Configuration files
│   └── env.ts      # Environment variables validation
├── db/             # Database
│   ├── schema/     # Drizzle schemas
│   │   ├── users.ts
│   │   ├── tokens.ts
│   │   └── index.ts
│   └── index.ts    # Database connection
├── plugins/        # Fastify plugins
│   ├── auth.ts     # Authentication plugin
│   └── error-handler.ts # Error handling
├── routes/         # API routes
│   ├── auth.ts     # Auth endpoints
│   └── proxy.ts    # Proxy endpoints
├── services/       # Business logic
│   └── auth.service.ts # Auth service
├── types/          # TypeScript types
│   └── index.ts
├── utils/          # Utility functions
│   ├── jwt.ts      # JWT helpers
│   └── password.ts # Password hashing
├── server.ts       # Fastify server setup
└── index.ts        # Application entry point
```

## ⚙️ Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for access tokens (min 32 chars)
- `JWT_REFRESH_SECRET` - Secret for refresh tokens (min 32 chars)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token blacklisting
- Rate limiting
- CORS configuration
- Helmet security headers
- Request size limits
- SQL injection protection (via Drizzle ORM)

## 🗃️ Database Schema

### Users Table
- `id` - UUID primary key
- `email` - Unique email
- `username` - Unique username
- `password` - Hashed password
- `role` - User role (user, author, admin) - default: user
- `phoneNumber` - Unique phone number (optional)
- `phoneCountryCode` - Phone country code (optional)
- `isPhoneVerified` - Phone verification status
- `phoneVerificationCode` - 6-digit verification code
- `phoneVerificationExpires` - Code expiration timestamp
- `firstName`, `lastName` - User details
- `isActive` - Account status
- `isEmailVerified` - Email verification status
- Timestamps

### Refresh Tokens Table
- `id` - UUID primary key
- `token` - Refresh token
- `userId` - User reference
- `userAgent`, `ipAddress` - Session info
- `expiresAt` - Token expiration

### Blacklisted Tokens Table
- `id` - UUID primary key
- `token` - Blacklisted token
- `tokenType` - access/refresh
- `reason` - Blacklist reason
- `expiresAt` - Natural expiration

### Stock Symbols Table
- `id` - Integer primary key (from VietCap API)
- `symbol` - Stock symbol code (e.g., VNM, VIC)
- `type` - Stock type (STOCK, FUND, BOND, ETF, COVERED_WARRANT)
- `board` - Trading board (HSX, HNX, UPCOM)
- `enOrganName` - English organization name
- `enOrganShortName` - English short name
- `organShortName` - Vietnamese short name
- `organName` - Vietnamese organization name
- `productGrpID` - Product group ID
- Timestamps

### User Watchlists Table
- `id` - UUID primary key
- `userId` - User reference
- `name` - Watchlist name
- `description` - Optional description
- `isDefault` - Default watchlist flag
- `sortOrder` - Display order
- `color` - Hex color for UI
- `icon` - Icon name for UI
- Timestamps

### Watchlist Items Table
- `id` - UUID primary key
- `watchlistId` - Watchlist reference
- `stockId` - Stock symbol reference
- `notes` - User notes
- `targetPrice` - Target price
- `alertPrice` - Alert price
- `position` - User's position
- `avgCost` - Average cost
- `sortOrder` - Display order
- `isHighlighted` - Highlight flag
- Timestamps

## 📝 Notes

- The backup of the original Express server is saved in `src/index.express.backup.ts`
- CORS can be adjusted in `src/config/env.ts` by modifying `CORS_ORIGIN`
- All proxy routes preserve the original query parameters and paths
- Database migrations are managed through Drizzle Kit
- TypeScript compilation errors may occur - fixes are being applied

## 📄 License

ISC
