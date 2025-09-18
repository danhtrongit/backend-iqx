# Earning Results API Documentation

## Overview

The Earning Results API provides access to comprehensive financial earning data from Vietcap for Vietnamese stocks. This API fetches and caches company earning results, including revenue, profit, EPS, and valuation metrics.

## Features

- 📊 **Comprehensive Metrics**: Revenue, net profit, EPS, ROE, ROA, PE, PB ratios
- 🚀 **High Performance**: Built-in caching mechanism (30-minute default)
- 🔐 **Flexible Authentication**: Support for custom Vietcap API tokens
- 📈 **Batch Operations**: Fetch data for multiple symbols efficiently
- 🌟 **Favorites Integration**: Direct integration with user favorites
- 🎨 **Formatted Output**: Human-readable formatted data for UI display

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.yourapp.com/api
```

## Authentication

### Required Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token for user authentication |
| x-vietcap-token | No | Optional Vietcap API token (overrides default) |

### Example Headers

```http
Authorization: Bearer YOUR_USER_TOKEN
x-vietcap-token: VIETCAP_API_TOKEN (optional)
```

## Endpoints

### 1. Get Earning Results for Single Symbol

Fetch earning results for a specific stock symbol.

#### Endpoint
```http
GET /api/earnings/{symbol}
```

#### Parameters
| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| symbol | string | path | Yes | Stock symbol (1-10 characters) |

#### Response
```json
{
  "symbol": "VIC",
  "currentYear": 2025,
  "cumulativeQuarter": "H1",
  "revenue": {
    "value": 130475838000000,
    "prevYear": 189068040000000,
    "forecast": 293812938779680.5,
    "cumulative": 130475838000000,
    "percentComplete": 0.4440779175
  },
  "revenueGrowth": {
    "value": 1.0364024162,
    "prevYear": 0.1712252272,
    "forecast": 0.5540063714,
    "cumulative": 1.0364024162
  },
  "netProfit": {
    "value": 6037854000000,
    "prevYear": 11903028000000,
    "forecast": 12907238099150.883,
    "cumulative": 6037854000000,
    "percentComplete": 0.467788225
  },
  "netProfitGrowth": {
    "value": 0.3705413202,
    "prevYear": 4.5185173337,
    "forecast": 0.0843659361,
    "cumulative": 0.3705413202
  },
  "eps": {
    "value": null,
    "prevYear": 3199.7244313372157,
    "forecast": 3460.002819411333,
    "growth": null,
    "growthPrevYear": 4.6644539866,
    "growthForecast": 0.0813440012
  },
  "roe": {
    "value": null,
    "prevYear": 0.09479278865178414,
    "forecast": 0.08156209245860926
  },
  "roa": {
    "value": null,
    "prevYear": 0.007014823444678273,
    "forecast": 0.011429539774191397
  },
  "pe": {
    "value": null,
    "prevYear": 42.1911332982,
    "forecast": 39.0173092469
  },
  "pb": {
    "value": null,
    "prevYear": 3.6551223662,
    "forecast": 3.3676063658
  },
  "updatedAt": "2025-01-17T10:00:00Z"
}
```

#### Example Request
```bash
curl -X GET http://localhost:3000/api/earnings/VIC \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-vietcap-token: VIETCAP_TOKEN"
```

---

### 2. Get Earning Results for Multiple Symbols (Batch)

Fetch earning results for multiple symbols in a single request.

#### Endpoint
```http
POST /api/earnings/batch
```

#### Request Body
```json
{
  "symbols": ["VIC", "VHM", "VCB", "MSN", "HPG"]
}
```

#### Response
```json
{
  "VIC": { /* Earning data */ },
  "VHM": { /* Earning data */ },
  "VCB": null,  // Failed to fetch
  "MSN": { /* Earning data */ },
  "HPG": { /* Earning data */ }
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/api/earnings/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VIC", "VHM", "VCB"]}'
```

---

### 3. Get Earning Results for Favorites

Fetch earning results for all user's favorite stocks.

#### Endpoint
```http
GET /api/earnings/favorites
```

#### Response
```json
{
  "results": {
    "VIC": { /* Earning data */ },
    "VHM": { /* Earning data */ },
    "VCB": null  // Failed to fetch
  },
  "summary": {
    "totalFavorites": 3,
    "successfulFetches": 2,
    "failedFetches": 1
  }
}
```

#### Example Request
```bash
curl -X GET http://localhost:3000/api/earnings/favorites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Get Formatted Earning Results

Get earning results formatted for display in UI.

#### Endpoint
```http
GET /api/earnings/{symbol}/formatted?format={format}
```

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| format | string | No | simple | Format type: "simple" or "detailed" |

#### Response (Simple Format)
```json
{
  "symbol": "VIC",
  "period": "H1 2025",
  "metrics": {
    "revenue": {
      "current": "130.5T",
      "previous": "189.1T",
      "forecast": "293.8T",
      "growth": "+103.64%",
      "completion": "44.41%"
    },
    "netProfit": {
      "current": "6.0T",
      "previous": "11.9T",
      "forecast": "12.9T",
      "growth": "+37.05%",
      "completion": "46.78%"
    },
    "eps": {
      "current": "N/A",
      "previous": "3,200",
      "forecast": "3,460",
      "growth": "N/A"
    },
    "valuation": {
      "pe": {
        "current": "N/A",
        "previous": "42.19",
        "forecast": "39.02"
      },
      "pb": {
        "current": "N/A",
        "previous": "3.66",
        "forecast": "3.37"
      },
      "roe": "9.48%",
      "roa": "0.70%"
    }
  },
  "updatedAt": "2025-01-17T10:00:00Z"
}
```

#### Example Request
```bash
curl -X GET "http://localhost:3000/api/earnings/VIC/formatted?format=simple" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 5. Clear Cache

Clear cached earning results data.

#### Endpoint
```http
DELETE /api/earnings/cache/{symbol?}
```

#### Parameters
| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| symbol | string | path | No | Specific symbol to clear (omit to clear all) |

#### Response
```json
{
  "message": "Cache cleared for symbol: VIC"
}
```

#### Example Request
```bash
# Clear specific symbol
curl -X DELETE http://localhost:3000/api/earnings/cache/VIC \
  -H "Authorization: Bearer YOUR_TOKEN"

# Clear all cache
curl -X DELETE http://localhost:3000/api/earnings/cache \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 6. Get Cache Statistics

Get information about cached data.

#### Endpoint
```http
GET /api/earnings/cache/stats
```

#### Response
```json
{
  "totalEntries": 5,
  "entries": [
    {
      "symbol": "VIC",
      "fetchedAt": "2025-01-17T09:30:00Z",
      "expiresAt": "2025-01-17T10:00:00Z",
      "isExpired": false
    },
    {
      "symbol": "VHM",
      "fetchedAt": "2025-01-17T09:00:00Z",
      "expiresAt": "2025-01-17T09:30:00Z",
      "isExpired": true
    }
  ]
}
```

#### Example Request
```bash
curl -X GET http://localhost:3000/api/earnings/cache/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Data Models

### EarningMetrics Interface

```typescript
interface ParsedEarningMetrics {
  symbol: string;
  currentYear: number;
  cumulativeQuarter: string;
  revenue: {
    value: number | null;
    prevYear: number | null;
    forecast: number | null;
    cumulative: number | null;
    percentComplete: number | null;
  };
  revenueGrowth: {
    value: number | null;
    prevYear: number | null;
    forecast: number | null;
    cumulative: number | null;
  };
  netProfit: {
    value: number | null;
    prevYear: number | null;
    forecast: number | null;
    cumulative: number | null;
    percentComplete: number | null;
  };
  netProfitGrowth: {
    value: number | null;
    prevYear: number | null;
    forecast: number | null;
    cumulative: number | null;
  };
  eps: {
    value: number | null;
    prevYear: number | null;
    forecast: number | null;
    growth: number | null;
    growthPrevYear: number | null;
    growthForecast: number | null;
  };
  roe: {
    value: number | null;
    prevYear: number | null;
    forecast: number | null;
  };
  roa: {
    value: number | null;
    prevYear: number | null;
    forecast: number | null;
  };
  pe: {
    value: number | null;
    prevYear: number | null;
    forecast: number | null;
  };
  pb: {
    value: number | null;
    prevYear: number | null;
    forecast: number | null;
  };
  updatedAt: Date;
}
```

## Error Handling

### Error Response Format
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { /* Additional error details */ }
}
```

### Error Codes
| Code | Status | Description |
|------|--------|-------------|
| FETCH_FAILED | 500 | Failed to fetch data from Vietcap |
| PARSE_ERROR | 500 | Error parsing response data |
| INVALID_SYMBOL | 400 | Invalid stock symbol format |
| UNAUTHORIZED | 401 | Invalid or expired token |
| RATE_LIMITED | 429 | Too many requests to Vietcap |
| SERVICE_UNAVAILABLE | 503 | Vietcap service is down |
| VALIDATION_ERROR | 400 | Request validation failed |
| INTERNAL_ERROR | 500 | Unexpected server error |

## Code Examples

### TypeScript/JavaScript

```typescript
// services/earning-results.service.ts
import axios from 'axios';

class EarningResultsClient {
  private baseURL: string;
  private token: string;
  private vietcapToken?: string;

  constructor(baseURL: string, token: string, vietcapToken?: string) {
    this.baseURL = baseURL;
    this.token = token;
    this.vietcapToken = vietcapToken;
  }

  async getEarningResults(symbol: string) {
    const response = await axios.get(
      `${this.baseURL}/api/earnings/${symbol}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...(this.vietcapToken && { 'x-vietcap-token': this.vietcapToken })
        }
      }
    );
    return response.data;
  }

  async getBatchEarningResults(symbols: string[]) {
    const response = await axios.post(
      `${this.baseURL}/api/earnings/batch`,
      { symbols },
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...(this.vietcapToken && { 'x-vietcap-token': this.vietcapToken })
        }
      }
    );
    return response.data;
  }

  async getFavoritesEarnings() {
    const response = await axios.get(
      `${this.baseURL}/api/earnings/favorites`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...(this.vietcapToken && { 'x-vietcap-token': this.vietcapToken })
        }
      }
    );
    return response.data;
  }

  async getFormattedEarnings(symbol: string, format = 'simple') {
    const response = await axios.get(
      `${this.baseURL}/api/earnings/${symbol}/formatted?format=${format}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...(this.vietcapToken && { 'x-vietcap-token': this.vietcapToken })
        }
      }
    );
    return response.data;
  }
}

// Usage
const client = new EarningResultsClient(
  'http://localhost:3000',
  'USER_TOKEN',
  'VIETCAP_TOKEN' // optional
);

// Get single stock earnings
const vicEarnings = await client.getEarningResults('VIC');

// Get multiple stocks
const batchResults = await client.getBatchEarningResults(['VIC', 'VHM', 'VCB']);

// Get favorites earnings
const favoritesEarnings = await client.getFavoritesEarnings();

// Get formatted for display
const formatted = await client.getFormattedEarnings('VIC', 'simple');
```

### React Hook Example

```tsx
// hooks/useEarningResults.ts
import { useQuery } from '@tanstack/react-query';
import { EarningResultsClient } from '@/services/earning-results';

const client = new EarningResultsClient(
  process.env.NEXT_PUBLIC_API_URL!,
  localStorage.getItem('token')!,
  localStorage.getItem('vietcapToken') // optional
);

export function useEarningResults(symbol: string) {
  return useQuery({
    queryKey: ['earnings', symbol],
    queryFn: () => client.getEarningResults(symbol),
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });
}

export function useFavoritesEarnings() {
  return useQuery({
    queryKey: ['earnings', 'favorites'],
    queryFn: () => client.getFavoritesEarnings(),
    staleTime: 30 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
  });
}

// Component usage
function EarningsDisplay({ symbol }: { symbol: string }) {
  const { data, isLoading, error } = useEarningResults(symbol);

  if (isLoading) return <Skeleton />;
  if (error) return <Alert>Failed to load earnings</Alert>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{symbol} Earnings - {data.cumulativeQuarter} {data.currentYear}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Metric
            label="Revenue"
            value={formatCurrency(data.revenue.cumulative)}
            growth={formatGrowth(data.revenueGrowth.cumulative)}
          />
          <Metric
            label="Net Profit"
            value={formatCurrency(data.netProfit.cumulative)}
            growth={formatGrowth(data.netProfitGrowth.cumulative)}
          />
          <Metric
            label="EPS"
            value={data.eps.prevYear?.toLocaleString()}
            growth={formatGrowth(data.eps.growthPrevYear)}
          />
          <Metric
            label="PE Ratio"
            value={data.pe.prevYear?.toFixed(2)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Python Example

```python
import requests
from typing import Dict, List, Optional

class EarningResultsClient:
    def __init__(self, base_url: str, token: str, vietcap_token: Optional[str] = None):
        self.base_url = base_url
        self.token = token
        self.vietcap_token = vietcap_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        })
        if vietcap_token:
            self.session.headers['x-vietcap-token'] = vietcap_token

    def get_earning_results(self, symbol: str) -> Dict:
        """Get earning results for a single symbol"""
        response = self.session.get(f"{self.base_url}/api/earnings/{symbol}")
        response.raise_for_status()
        return response.json()

    def get_batch_earnings(self, symbols: List[str]) -> Dict:
        """Get earning results for multiple symbols"""
        response = self.session.post(
            f"{self.base_url}/api/earnings/batch",
            json={'symbols': symbols}
        )
        response.raise_for_status()
        return response.json()

    def get_favorites_earnings(self) -> Dict:
        """Get earning results for user's favorites"""
        response = self.session.get(f"{self.base_url}/api/earnings/favorites")
        response.raise_for_status()
        return response.json()

    def get_formatted_earnings(self, symbol: str, format: str = 'simple') -> Dict:
        """Get formatted earning results for display"""
        response = self.session.get(
            f"{self.base_url}/api/earnings/{symbol}/formatted",
            params={'format': format}
        )
        response.raise_for_status()
        return response.json()

    def clear_cache(self, symbol: Optional[str] = None) -> Dict:
        """Clear cache for specific symbol or all"""
        endpoint = f"{self.base_url}/api/earnings/cache"
        if symbol:
            endpoint += f"/{symbol}"
        response = self.session.delete(endpoint)
        response.raise_for_status()
        return response.json()

    def get_cache_stats(self) -> Dict:
        """Get cache statistics"""
        response = self.session.get(f"{self.base_url}/api/earnings/cache/stats")
        response.raise_for_status()
        return response.json()

# Usage example
if __name__ == "__main__":
    client = EarningResultsClient(
        base_url="http://localhost:3000",
        token="YOUR_USER_TOKEN",
        vietcap_token="VIETCAP_API_TOKEN"  # optional
    )

    try:
        # Get single stock earnings
        vic_earnings = client.get_earning_results("VIC")
        print(f"VIC Revenue: {vic_earnings['revenue']['cumulative']}")
        
        # Get multiple stocks
        batch_results = client.get_batch_earnings(["VIC", "VHM", "VCB"])
        for symbol, data in batch_results.items():
            if data:
                print(f"{symbol}: Revenue = {data['revenue']['cumulative']}")
            else:
                print(f"{symbol}: Failed to fetch")
        
        # Get favorites earnings
        favorites = client.get_favorites_earnings()
        print(f"Successfully fetched: {favorites['summary']['successfulFetches']}")
        
        # Get formatted data
        formatted = client.get_formatted_earnings("VIC", "simple")
        print(f"VIC {formatted['period']}: {formatted['metrics']['revenue']['current']}")
        
        # Check cache stats
        stats = client.get_cache_stats()
        print(f"Cached entries: {stats['totalEntries']}")
        
    except requests.HTTPError as e:
        print(f"API Error: {e.response.status_code} - {e.response.text}")
```

## Performance Considerations

### Caching Strategy

- **Default Cache Duration**: 30 minutes
- **Cache Key**: Stock symbol (uppercase)
- **Cache Invalidation**: Manual via API or automatic expiry
- **Memory-based**: In-memory cache for fast access

### Rate Limiting

- **Batch Processing**: Maximum 5 concurrent requests to Vietcap
- **Batch Size Limit**: Maximum 50 symbols per batch request
- **User Rate Limit**: Inherited from main API (100 req/min default)

### Best Practices

1. **Use Batch Endpoints**: When fetching multiple symbols, use batch endpoints
2. **Leverage Cache**: Data is cached for 30 minutes, avoid unnecessary requests
3. **Handle Null Values**: Some metrics may be null for certain periods
4. **Format for Display**: Use formatted endpoint for UI presentation
5. **Error Handling**: Implement proper error handling for failed fetches

## Environment Variables

```env
# Vietcap API Configuration
VIETCAP_API_TOKEN=your_default_vietcap_token
VIETCAP_API_URL=https://iq.vietcap.com.vn/api/iq-insight-service/v1
VIETCAP_CACHE_MINUTES=30
```

## Testing

### cURL Examples

```bash
# Get earnings for VIC
curl -X GET http://localhost:3000/api/earnings/VIC \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get batch earnings
curl -X POST http://localhost:3000/api/earnings/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VIC", "VHM", "VCB"]}'

# Get favorites earnings
curl -X GET http://localhost:3000/api/earnings/favorites \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get formatted earnings
curl -X GET "http://localhost:3000/api/earnings/VIC/formatted?format=simple" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Clear cache
curl -X DELETE http://localhost:3000/api/earnings/cache/VIC \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get cache stats
curl -X GET http://localhost:3000/api/earnings/cache/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if Vietcap token is valid
   - Token may be expired
   - Solution: Provide valid token via header or environment

2. **429 Rate Limited**
   - Too many requests to Vietcap
   - Solution: Wait and retry, use caching

3. **503 Service Unavailable**
   - Vietcap service is down
   - Solution: Retry later

4. **Null Values in Response**
   - Some metrics not available for period
   - Normal for certain quarters/years
   - Handle gracefully in UI

## Support

For issues or questions:
- Check API documentation
- Review error messages and codes
- Contact support with request details

---

*Last Updated: January 2025*
*Version: 1.0.0*