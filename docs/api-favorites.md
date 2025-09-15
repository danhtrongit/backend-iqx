# Favorites API Documentation

## Overview
The Favorites API allows users to manage their favorite stocks. Users can add, remove, update, and retrieve their favorite stock symbols with optional notes.

## Base URL
```
http://localhost:3000/api/favorites
```

## Authentication
All endpoints require authentication. Include the user authentication token in the request headers.

## Endpoints

### 1. Get All Favorites
Retrieve all favorite stocks for the authenticated user, including detailed stock information.

**Endpoint:** `GET /api/favorites`

**Response:**
```json
{
  "favorites": [
    {
      "id": "uuid",
      "userId": "uuid",
      "symbol": "VCB",
      "notes": "Ngân hàng tốt, theo dõi dài hạn",
      "addedAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "stock": {
        "symbol": "VCB",
        "name": "Ngân hàng TMCP Ngoại thương Việt Nam",
        "exchange": "HOSE",
        "sector": "Tài chính",
        "industry": "Ngân hàng",
        "currentPrice": 89500,
        "change": 500,
        "changePercent": 0.56,
        "volume": 2500000,
        "marketCap": 450000000000000
      }
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Successfully retrieved favorites
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Server error

---

### 2. Add Single Favorite
Add a single stock symbol to favorites.

**Endpoint:** `POST /api/favorites`

**Request Body:**
```json
{
  "symbol": "VCB",
  "notes": "Ngân hàng tốt, theo dõi dài hạn" // optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "symbol": "VCB",
  "notes": "Ngân hàng tốt, theo dõi dài hạn",
  "addedAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `201 Created` - Successfully added to favorites
- `400 Bad Request` - Invalid request body or symbol already in favorites
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Stock symbol not found
- `409 Conflict` - Symbol already in favorites
- `500 Internal Server Error` - Server error

---

### 3. Add Multiple Favorites (Batch)
Add multiple stock symbols to favorites at once.

**Endpoint:** `POST /api/favorites/batch`

**Request Body:**
```json
{
  "symbols": ["VCB", "VHM", "VIC", "MSN", "HPG"]
}
```

**Response:**
```json
{
  "added": ["VCB", "VHM", "VIC"],
  "skipped": ["MSN", "HPG"], // Already in favorites
  "failed": []
}
```

**Status Codes:**
- `200 OK` - Batch operation completed (check response for details)
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Server error

---

### 4. Update Favorite Notes
Update the notes for a favorite stock.

**Endpoint:** `PATCH /api/favorites/:symbol`

**Parameters:**
- `symbol` (path parameter) - Stock symbol (e.g., "VCB")

**Request Body:**
```json
{
  "notes": "Updated notes for this stock"
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "symbol": "VCB",
  "notes": "Updated notes for this stock",
  "addedAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-16T14:20:00Z"
}
```

**Status Codes:**
- `200 OK` - Successfully updated
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Symbol not in favorites
- `500 Internal Server Error` - Server error

---

### 5. Remove Single Favorite
Remove a single stock from favorites.

**Endpoint:** `DELETE /api/favorites/:symbol`

**Parameters:**
- `symbol` (path parameter) - Stock symbol (e.g., "VCB")

**Response:**
```json
{
  "message": "Stock removed from favorites"
}
```

**Status Codes:**
- `200 OK` - Successfully removed
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Symbol not in favorites
- `500 Internal Server Error` - Server error

---

### 6. Remove Multiple Favorites (Batch)
Remove multiple stocks from favorites at once.

**Endpoint:** `DELETE /api/favorites/batch`

**Request Body:**
```json
{
  "symbols": ["VCB", "VHM", "VIC"]
}
```

**Response:**
```json
{
  "removed": ["VCB", "VHM", "VIC"],
  "notFound": []
}
```

**Status Codes:**
- `200 OK` - Batch operation completed
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Server error

---

### 7. Check Favorite Status
Check if a specific stock is in the user's favorites.

**Endpoint:** `GET /api/favorites/check/:symbol`

**Parameters:**
- `symbol` (path parameter) - Stock symbol (e.g., "VCB")

**Response:**
```json
{
  "isFavorite": true,
  "favorite": {
    "id": "uuid",
    "symbol": "VCB",
    "notes": "Ngân hàng tốt",
    "addedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `200 OK` - Successfully checked status
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Server error

---

### 8. Clear All Favorites
Remove all stocks from the user's favorites list.

**Endpoint:** `DELETE /api/favorites/all`

**Response:**
```json
{
  "message": "All favorites cleared",
  "count": 5
}
```

**Status Codes:**
- `200 OK` - Successfully cleared all favorites
- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Server error

---

## Data Models

### Favorite Model
```typescript
interface Favorite {
  id: string;           // UUID
  userId: string;       // UUID of the user
  symbol: string;       // Stock symbol (max 10 characters)
  notes?: string;       // Optional notes
  addedAt: Date;        // Timestamp when added
  updatedAt: Date;      // Timestamp when last updated
}
```

### Stock Model (returned with favorites)
```typescript
interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  industry?: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
}
```

## Error Response Format
All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

## Common Error Codes
- `UNAUTHORIZED` - User not authenticated
- `INVALID_SYMBOL` - Stock symbol is invalid or not found
- `DUPLICATE_FAVORITE` - Stock is already in favorites
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Request validation failed
- `INTERNAL_ERROR` - Internal server error

## Rate Limiting
- Rate limit: 100 requests per minute per user
- Headers returned:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: Number of requests remaining
  - `X-RateLimit-Reset`: Timestamp when limit resets

## Examples

### cURL Examples

#### Get all favorites
```bash
curl -X GET http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Add a favorite
```bash
curl -X POST http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "VCB", "notes": "Watch for Q4 earnings"}'
```

#### Add multiple favorites
```bash
curl -X POST http://localhost:3000/api/favorites/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VCB", "VHM", "VIC"]}'
```

#### Update notes
```bash
curl -X PATCH http://localhost:3000/api/favorites/VCB \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Updated notes"}'
```

#### Remove a favorite
```bash
curl -X DELETE http://localhost:3000/api/favorites/VCB \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Check if stock is favorite
```bash
curl -X GET http://localhost:3000/api/favorites/check/VCB \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript/TypeScript Examples

```typescript
// Using fetch API
const API_BASE = 'http://localhost:3000/api/favorites';

// Get all favorites
async function getFavorites() {
  const response = await fetch(API_BASE, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

// Add a favorite
async function addFavorite(symbol: string, notes?: string) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ symbol, notes })
  });
  return response.json();
}

// Remove a favorite
async function removeFavorite(symbol: string) {
  const response = await fetch(`${API_BASE}/${symbol}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}

// Check if stock is favorite
async function checkFavorite(symbol: string) {
  const response = await fetch(`${API_BASE}/check/${symbol}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
}
```

## Notes

1. **Symbol Format**: Stock symbols should be uppercase and typically 3-4 characters (e.g., "VCB", "VHM")
2. **Duplicates**: The system prevents duplicate favorites through a unique constraint on (userId, symbol)
3. **Stock Data**: When retrieving favorites, the API enriches the response with current stock data when available
4. **Notes**: Notes are optional and can be used to store personal reminders or analysis
5. **Batch Operations**: Batch endpoints are optimized for bulk operations and return partial success information

## Migration from Watchlists

If you were using the previous watchlist API, here's the migration guide:

### Old Endpoints → New Endpoints
- `GET /api/watchlists` → `GET /api/favorites`
- `POST /api/watchlists/:id/items` → `POST /api/favorites`
- `DELETE /api/watchlists/:id/items/:itemId` → `DELETE /api/favorites/:symbol`

### Key Changes
1. Simplified to single-user favorites (no multiple watchlists)
2. Direct symbol-based operations (no item IDs)
3. Batch operations for efficiency
4. Notes field for personal annotations
5. Built-in duplicate prevention