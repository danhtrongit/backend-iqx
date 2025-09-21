# API Documentation: Stocks with Prices

## Overview

API endpoint để lấy danh sách cổ phiếu với phân trang và thông tin giá real-time từ VietCap API.

**Endpoint**: `GET /api/stocks/with-prices`

## Features

- ✅ **Phân trang đầy đủ** với limit/offset
- ✅ **Tìm kiếm thông minh** theo symbol và tên công ty 
- ✅ **Lọc dữ liệu** theo board, type
- ✅ **Sắp xếp linh hoạt** theo nhiều trường
- ✅ **Tích hợp giá real-time** từ VietCap API
- ✅ **Error handling graceful** khi API bên ngoài không available
- ✅ **Performance tối ưu** với option tắt price data

## Request Parameters

### Query Parameters

| Tham số | Kiểu | Mặc định | Bắt buộc | Mô tả |
|---------|------|----------|----------|-------|
| `query` | string | - | ❌ | Tìm kiếm theo symbol hoặc tên công ty |
| `symbol` | string | - | ❌ | Lọc theo mã cổ phiếu cụ thể |
| `board` | enum | - | ❌ | Sàn giao dịch: `HSX`, `HNX`, `UPCOM` |
| `type` | enum | - | ❌ | Loại chứng khoán: `STOCK`, `FUND`, `BOND`, `ETF`, `COVERED_WARRANT` |
| `limit` | number | 20 | ❌ | Số lượng kết quả (1-100) |
| `offset` | number | 0 | ❌ | Vị trí bắt đầu (cho phân trang) |
| `sortBy` | enum | symbol | ❌ | Sắp xếp theo: `symbol`, `organName`, `board`, `type` |
| `sortOrder` | enum | asc | ❌ | Thứ tự: `asc`, `desc` |
| `timeFrame` | enum | ONE_DAY | ❌ | Khung thời gian giá: `ONE_MINUTE`, `ONE_DAY`, `ONE_HOUR` |
| `includePrices` | boolean | true | ❌ | Có lấy thông tin giá từ VietCap API không |

## Response Format

### Success Response (200)

```json
{
  "data": [
    {
      "id": 8424670,
      "symbol": "VIC",
      "type": "STOCK", 
      "board": "HSX",
      "enOrganName": "VinGroup Joint Stock Company",
      "enOrganShortName": null,
      "organShortName": "VinGroup",
      "organName": "Tập đoàn Vingroup - Công ty CP",
      "productGrpID": "STO",
      "createdAt": "2025-09-12T16:39:21.187Z",
      "updatedAt": "2025-09-15T13:56:01.964Z",
      "priceData": {
        "currentPrice": 129200,
        "openPrice": 129200,
        "highPrice": 129200, 
        "lowPrice": 129200,
        "volume": 352100,
        "accumulatedVolume": 2659700,
        "accumulatedValue": 340608.93,
        "lastUpdate": "1757403900"
      }
    }
  ],
  "total": 671,
  "limit": 20,
  "offset": 0
}
```

### Price Data Fields

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `currentPrice` | number \| null | Giá hiện tại (giá đóng cửa) |
| `openPrice` | number \| null | Giá mở cửa |
| `highPrice` | number \| null | Giá cao nhất |
| `lowPrice` | number \| null | Giá thấp nhất |
| `volume` | number \| null | Khối lượng giao dịch |
| `accumulatedVolume` | number \| null | Tổng khối lượng tích lũy |
| `accumulatedValue` | number \| null | Tổng giá trị tích lũy (tỷ VND) |
| `lastUpdate` | string \| null | Timestamp cập nhật cuối |

### Error Response (400)

```json
{
  "error": "Validation Error",
  "message": "Invalid query parameters", 
  "details": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["limit"],
      "message": "Expected number, received string"
    }
  ]
}
```

### Error Response (500)

```json
{
  "error": "Internal Server Error",
  "message": "Failed to fetch symbols with prices"
}
```

## Usage Examples

### 1. Lấy danh sách cổ phiếu HSX với giá

```bash
curl -X GET "http://localhost:3000/api/stocks/with-prices?board=HSX&limit=10" \
  -H "Accept: application/json"
```

### 2. Tìm kiếm cổ phiếu theo tên

```bash
curl -X GET "http://localhost:3000/api/stocks/with-prices?query=VinGroup&limit=5" \
  -H "Accept: application/json"
```

### 3. Phân trang với sắp xếp

```bash
curl -X GET "http://localhost:3000/api/stocks/with-prices?limit=20&offset=40&sortBy=symbol&sortOrder=desc" \
  -H "Accept: application/json"
```

### 4. Lấy data không có giá (performance cao)

```bash
curl -X GET "http://localhost:3000/api/stocks/with-prices?board=HSX&includePrices=false" \
  -H "Accept: application/json"
```

### 5. Lấy giá theo phút

```bash
curl -X GET "http://localhost:3000/api/stocks/with-prices?symbol=VIC&timeFrame=ONE_MINUTE" \
  -H "Accept: application/json"
```

### 6. Tìm kiếm với nhiều điều kiện

```bash
curl -X GET "http://localhost:3000/api/stocks/with-prices?board=HSX&type=STOCK&query=Vin&limit=10&sortBy=organName" \
  -H "Accept: application/json"
```

## JavaScript/TypeScript Examples

### Fetch API

```javascript
// Lấy danh sách cổ phiếu với giá
async function getStocksWithPrices(params = {}) {
  const queryString = new URLSearchParams({
    limit: 20,
    offset: 0,
    includePrices: true,
    ...params
  }).toString();
  
  const response = await fetch(`/api/stocks/with-prices?${queryString}`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// Usage examples
const stocks = await getStocksWithPrices({ board: 'HSX', limit: 10 });
const searchResults = await getStocksWithPrices({ query: 'VinGroup' });
const page2 = await getStocksWithPrices({ offset: 20, limit: 20 });
```

### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Accept': 'application/json'
  }
});

// Lấy cổ phiếu HSX với giá
const response = await api.get('/stocks/with-prices', {
  params: {
    board: 'HSX',
    limit: 10,
    includePrices: true
  }
});

console.log(response.data);
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface StockWithPrice {
  id: number;
  symbol: string;
  type: string;
  board: string;
  organName: string;
  priceData?: {
    currentPrice: number;
    openPrice: number;
    highPrice: number;
    lowPrice: number;
    volume: number;
    lastUpdate: string;
  };
}

interface StocksResponse {
  data: StockWithPrice[];
  total: number;
  limit: number;
  offset: number;
}

function useStocksWithPrices(params: Record<string, any> = {}) {
  const [data, setData] = useState<StocksResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStocks() {
      setLoading(true);
      setError(null);
      
      try {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`/api/stocks/with-prices?${queryString}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStocks();
  }, [JSON.stringify(params)]);

  return { data, loading, error };
}

// Usage in component
function StocksList() {
  const { data, loading, error } = useStocksWithPrices({
    board: 'HSX',
    limit: 20,
    includePrices: true
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h3>Stocks ({data.total} total)</h3>
      {data.data.map(stock => (
        <div key={stock.id}>
          <strong>{stock.symbol}</strong> - {stock.organName}
          {stock.priceData && (
            <span> - {stock.priceData.currentPrice.toLocaleString()} VND</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Performance Considerations

### 1. Sử dụng `includePrices=false` khi không cần giá

```bash
# Nhanh hơn - chỉ lấy thông tin symbols
GET /api/stocks/with-prices?board=HSX&includePrices=false

# Chậm hơn - lấy cả giá từ VietCap API  
GET /api/stocks/with-prices?board=HSX&includePrices=true
```

### 2. Pagination thông minh

```bash
# Lấy 20 kết quả đầu tiên
GET /api/stocks/with-prices?limit=20&offset=0

# Lấy 20 kết quả tiếp theo
GET /api/stocks/with-prices?limit=20&offset=20
```

### 3. Cache results phía client

```javascript
// Cache results for 5 minutes
const cache = new Map();
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

async function getCachedStocks(params) {
  const cacheKey = JSON.stringify(params);
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
    return cached.data;
  }
  
  const data = await getStocksWithPrices(params);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

## Rate Limiting

API có rate limiting được áp dụng:
- **Max requests**: 100 requests per minute per IP
- **Time window**: 1 minute
- **Headers trả về**:
  - `X-RateLimit-Limit`: Giới hạn request
  - `X-RateLimit-Remaining`: Số request còn lại
  - `X-RateLimit-Reset`: Thời gian reset

## Error Handling Best Practices

### 1. Handle network errors

```javascript
async function getStocksWithRetry(params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await getStocksWithPrices(params);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 2. Handle validation errors

```javascript
try {
  const stocks = await getStocksWithPrices({ limit: 'invalid' });
} catch (error) {
  if (error.status === 400) {
    console.error('Validation error:', error.details);
    // Show user-friendly validation messages
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### 3. Graceful degradation for price data

```javascript
function renderStock(stock) {
  return (
    <div>
      <h3>{stock.symbol} - {stock.organName}</h3>
      {stock.priceData ? (
        <p>Price: {stock.priceData.currentPrice.toLocaleString()} VND</p>
      ) : (
        <p>Price data unavailable</p>
      )}
    </div>
  );
}
```

## Security

### CORS Policy
API đã được cấu hình CORS để cho phép cross-origin requests:
- **All Origins Allowed**: `Access-Control-Allow-Origin: *` hoặc specific origin
- **Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, Origin, Accept
- **Credentials**: Disabled để tương thích với wildcard origin

**CORS Headers Response**:
```
Access-Control-Allow-Origin: http://localhost:8080
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Origin, Accept
Vary: Origin
```

### Authentication
- API này **không yêu cầu authentication**
- Có thể thêm authentication cho production nếu cần

## Monitoring & Logging

### Server-side logs
- All API calls được log với request ID
- VietCap API calls được log với response status
- Error rates được monitor

### Metrics có thể track
- Response time per endpoint
- VietCap API success rate  
- Cache hit/miss ratio
- Error rate by error type

## Changelog

### Version 1.0.0 (2025-09-21)
- ✅ Initial release
- ✅ Basic pagination and filtering
- ✅ VietCap API integration
- ✅ Price data support
- ✅ Comprehensive error handling
- ✅ Performance optimizations

## Support

Nếu có vấn đề với API, vui lòng:

1. **Check logs** tại server console
2. **Verify request format** theo document này
3. **Test with curl** để isolate issues
4. **Check VietCap API status** nếu price data không available

---

**Last updated**: September 21, 2025  
**API Version**: 1.0.0
