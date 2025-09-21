# Quick Reference: Stocks with Prices API

## 🚀 Endpoint

```
GET /api/stocks/with-prices
```

## 📝 Quick Examples

### Basic Usage
```bash
# Get 10 HSX stocks with prices
curl "http://localhost:3000/api/stocks/with-prices?board=HSX&limit=10"

# Search for VinGroup
curl "http://localhost:3000/api/stocks/with-prices?query=VinGroup"

# Fast response without prices
curl "http://localhost:3000/api/stocks/with-prices?board=HSX&includePrices=false"
```

### JavaScript
```javascript
// Fetch stocks with prices
const response = await fetch('/api/stocks/with-prices?board=HSX&limit=10');
const data = await response.json();

console.log(data.data[0].priceData.currentPrice); // Current price
```

## 🔧 Key Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `board` | - | `HSX`, `HNX`, `UPCOM` |
| `limit` | 20 | Max 100 |
| `includePrices` | true | Set false for speed |
| `timeFrame` | ONE_DAY | `ONE_MINUTE`, `ONE_HOUR`, `ONE_DAY` |
| `query` | - | Search symbol/company name |

## 📊 Response Structure

```json
{
  "data": [{
    "symbol": "VIC",
    "organName": "Tập đoàn Vingroup - Công ty CP",
    "priceData": {
      "currentPrice": 129200,
      "openPrice": 129200,
      "volume": 352100
    }
  }],
  "total": 671,
  "limit": 10,
  "offset": 0
}
```

## ⚡ Performance Tips

- Use `includePrices=false` for listing pages
- Cache responses for 1-5 minutes
- Use pagination with `limit` + `offset`
- Filter by `board` for better performance

## 🔗 Full Documentation

See [API_STOCKS_WITH_PRICES.md](./API_STOCKS_WITH_PRICES.md) for complete documentation.
