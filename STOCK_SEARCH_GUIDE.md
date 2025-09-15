# Stock Symbols Search Guide

## 🔍 Overview

The stock symbols search system provides intelligent search capabilities with prioritization for both **symbol codes** and **organization names** (Vietnamese and English). The system is optimized for Vietnamese stock market data from VietCap.

## 📊 Search Priority System

The search results are ordered by relevance using the following priority system:

### Priority Levels (1 = Highest)

1. **Exact Symbol Match** - Query exactly matches stock symbol (e.g., "VNM")
2. **Exact Organization Short Name Match** - Query exactly matches short name
3. **Exact Organization Full Name Match** - Query exactly matches full name
4. **Symbol Prefix Match** - Symbol starts with query (e.g., "VN" → VNM, VND, VNR)
5. **Organization Name Prefix** - Organization name starts with query
6. **Symbol Contains** - Symbol contains query anywhere
7. **Organization Name Word Boundary** - Query matches at word start in name
8. **Organization Name Contains** - Name contains query anywhere
9. **English Name Match** - Matches in English organization names (lower priority)

## 🚀 API Endpoints

### 1. Main Search Endpoint
**`GET /api/stocks/search`**

Full-featured search with filters and pagination.

```bash
# Search by keyword (searches both symbol and name)
curl "http://localhost:3000/api/stocks/search?query=vinamilk"
curl "http://localhost:3000/api/stocks/search?query=vnm"
curl "http://localhost:3000/api/stocks/search?query=ngân hàng"

# With filters
curl "http://localhost:3000/api/stocks/search?query=bank&board=HSX&type=STOCK"

# With pagination
curl "http://localhost:3000/api/stocks/search?query=công ty&limit=20&offset=0"
```

**Parameters:**
- `query` - Search term (searches symbol and names)
- `symbol` - Filter by symbol prefix
- `board` - Filter by board (HSX, HNX, UPCOM)
- `type` - Filter by type (STOCK, FUND, BOND, ETF)
- `limit` - Results per page (default: 20, max: 100)
- `offset` - Skip results for pagination
- `sortBy` - Sort field (symbol, organName, board, type)
- `sortOrder` - Sort direction (asc, desc)

### 2. Quick Search (Autocomplete)
**`GET /api/stocks/quick-search`**

Optimized for autocomplete with simplified response.

```bash
# Quick search
curl "http://localhost:3000/api/stocks/quick-search?q=vin&limit=5"

# Response includes match type and field
{
  "symbol": "VNM",
  "name": "Vinamilk",
  "board": "HSX",
  "type": "STOCK",
  "match_type": "prefix_symbol",
  "matched_field": "symbol"
}
```

**Match Types:**
- `exact_symbol` - Exact symbol match
- `exact_name` - Exact name match
- `prefix_symbol` - Symbol starts with query
- `prefix_name` - Name starts with query
- `contains` - Contains query

**Matched Fields:**
- `symbol` - Matched in symbol
- `name` - Matched in organization name
- `both` - Matched in both fields

### 3. Exact Symbol Lookup
**`GET /api/stocks/exact/:symbol`**

Get exact symbol match (case-insensitive).

```bash
curl "http://localhost:3000/api/stocks/exact/VNM"
curl "http://localhost:3000/api/stocks/exact/vnm"  # Also works
```

### 4. Browse by Prefix
**`GET /api/stocks/prefix/:prefix`**

Get all symbols starting with specific letters.

```bash
# Get all stocks starting with 'V'
curl "http://localhost:3000/api/stocks/prefix/V"

# Filter by board
curl "http://localhost:3000/api/stocks/prefix/A?board=HSX&limit=50"
```

## 💡 Search Examples

### Example 1: Search for Vinamilk
```bash
# By symbol
curl "http://localhost:3000/api/stocks/search?query=VNM"
# Results: VNM (exact match) appears first

# By company name
curl "http://localhost:3000/api/stocks/search?query=vinamilk"
# Results: VNM (Vinamilk) appears first

# By Vietnamese name
curl "http://localhost:3000/api/stocks/search?query=sữa"
# Results: Companies with "sữa" in name
```

### Example 2: Search for Banks
```bash
# General bank search
curl "http://localhost:3000/api/stocks/search?query=bank"
# Results: Banking stocks (BID, CTG, VCB, etc.)

# Vietnamese search
curl "http://localhost:3000/api/stocks/search?query=ngân hàng"
# Results: All banks with "Ngân hàng" in name

# Specific bank
curl "http://localhost:3000/api/stocks/search?query=vietcombank"
# Results: VCB appears first
```

### Example 3: Industry Search
```bash
# Real estate
curl "http://localhost:3000/api/stocks/search?query=bất động sản"

# Technology
curl "http://localhost:3000/api/stocks/search?query=công nghệ"

# Oil & Gas
curl "http://localhost:3000/api/stocks/search?query=dầu khí"
```

## 🎯 Best Practices

### For Frontend Implementation

1. **Autocomplete/Search-as-you-type**
   ```javascript
   // Use quick-search for autocomplete
   const searchStock = async (query) => {
     if (query.length < 2) return [];
     
     const response = await fetch(
       `/api/stocks/quick-search?q=${query}&limit=10`
     );
     return response.json();
   };
   ```

2. **Debouncing Search**
   ```javascript
   import { debounce } from 'lodash';
   
   const debouncedSearch = debounce(async (query) => {
     const results = await searchStock(query);
     updateSearchResults(results);
   }, 300);
   ```

3. **Display Match Type**
   ```javascript
   // Show why result matched
   results.map(item => ({
     ...item,
     displayText: item.match_type === 'exact_symbol' 
       ? `${item.symbol} (Exact match)`
       : `${item.symbol} - ${item.name}`
   }));
   ```

4. **Highlight Matched Text**
   ```javascript
   function highlightMatch(text, query) {
     const regex = new RegExp(`(${query})`, 'gi');
     return text.replace(regex, '<mark>$1</mark>');
   }
   ```

## 🌏 Vietnamese Language Support

The search system supports Vietnamese text with:

1. **Diacritics Handling**: Can search without tone marks
2. **Word Boundary Detection**: Matches words within company names
3. **Multiple Name Fields**: Searches both short and full organization names

### Examples:
```bash
# With diacritics
curl "http://localhost:3000/api/stocks/search?query=ngân+hàng"

# Without diacritics (also works)
curl "http://localhost:3000/api/stocks/search?query=ngan+hang"

# Partial name
curl "http://localhost:3000/api/stocks/search?query=thương+mại"
```

## 📈 Performance Tips

1. **Use Quick Search for Autocomplete**: It's optimized for speed
2. **Limit Results**: Use appropriate limits (5-10 for autocomplete, 20-50 for lists)
3. **Cache Common Searches**: Cache results for popular queries
4. **Use Exact Endpoint**: When you know the symbol, use `/exact/:symbol`
5. **Implement Pagination**: For large result sets

## 🔧 Advanced Usage

### Combining Filters
```bash
# HSX stocks in technology sector
curl "http://localhost:3000/api/stocks/search?query=công+nghệ&board=HSX&type=STOCK"

# Search with custom sorting
curl "http://localhost:3000/api/stocks/search?query=bank&sortBy=organName&sortOrder=asc"
```

### Building Search URLs
```javascript
function buildSearchUrl(params) {
  const base = '/api/stocks/search';
  const query = new URLSearchParams();
  
  if (params.query) query.append('query', params.query);
  if (params.board) query.append('board', params.board);
  if (params.type) query.append('type', params.type);
  query.append('limit', params.limit || 20);
  query.append('offset', params.offset || 0);
  
  return `${base}?${query.toString()}`;
}
```

## 📊 Response Format

### Search Response
```json
{
  "data": [
    {
      "id": 8424579,
      "symbol": "VNM",
      "type": "STOCK",
      "board": "HSX",
      "organName": "Công ty Cổ phần Sữa Việt Nam",
      "organShortName": "Vinamilk",
      "enOrganName": "Vietnam Dairy Products Joint Stock Company",
      "enOrganShortName": "Vinamilk",
      "productGrpID": "STO",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### Quick Search Response
```json
[
  {
    "symbol": "VNM",
    "name": "Vinamilk",
    "board": "HSX",
    "type": "STOCK",
    "match_type": "exact_symbol",
    "matched_field": "symbol"
  }
]
```

## 🚨 Error Handling

```javascript
try {
  const response = await fetch('/api/stocks/search?query=vnm');
  
  if (!response.ok) {
    if (response.status === 400) {
      // Invalid parameters
      const error = await response.json();
      console.error('Validation error:', error.details);
    } else if (response.status === 404) {
      // No results found
      console.log('No stocks found');
    }
  }
  
  const data = await response.json();
  // Process results
} catch (error) {
  console.error('Search failed:', error);
}
```

## 📝 Notes

- Search is case-insensitive
- Minimum query length for quick-search is 1 character
- Results are limited to prevent overwhelming responses
- The system prioritizes exact matches and symbol matches over partial name matches
- Vietnamese text search supports both with and without diacritics

---

*For more information, see the main README.md file.*