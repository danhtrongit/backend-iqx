# Analysis Reports API Documentation

## Overview

The Analysis Reports API provides endpoints to manage and retrieve financial analysis reports for stocks. It supports fetching reports by symbol, filtering, pagination, and PDF document serving.

## Base URL

```
http://localhost:3000/api/analysis-reports
```

## Authentication

Most endpoints are publicly accessible. Admin endpoints require JWT authentication.

---

## Endpoints

### 1. Get Reports by Symbol

Retrieve analysis reports for a specific stock symbol with pagination support.

**Endpoint:** `GET /:symbol`

**Example:** `GET /api/analysis-reports/VIC`

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| symbol | string | path | Yes | Stock symbol (1-10 characters, e.g., "VIC", "VNM") |
| page | integer | query | No | Page number (0-based, default: 0) |
| size | integer | query | No | Number of items per page (1-100, default: 20) |

#### Response

```json
{
  "data": [
    {
      "id": 1234,
      "ticker": "VIC",
      "tickerName": "Tập đoàn Vingroup",
      "reportType": 1,
      "source": "SSI",
      "issueDate": "2025-09-15",
      "issueDateTimeAgo": "2 days ago",
      "title": "Kết quả kinh doanh quý 3/2025",
      "attachedLink": "https://example.com/report.pdf",
      "localPdfPath": "http://localhost:3000/api/analysis-reports/pdfs/1234_report.pdf",
      "fileName": "1234_report.pdf",
      "targetPrice": "120000",
      "recommend": "MUA",
      "createdAt": "2025-09-15T10:00:00Z",
      "updatedAt": "2025-09-15T10:00:00Z"
    }
  ],
  "total": 29,
  "page": 0,
  "size": 20,
  "totalPages": 2
}
```

#### Status Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Server error

#### Example Request

```bash
curl "http://localhost:3000/api/analysis-reports/VIC?page=0&size=10"
```

---

### 2. Get All Reports

Retrieve all analysis reports with optional filtering and pagination.

**Endpoint:** `GET /`

**Example:** `GET /api/analysis-reports`

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| page | integer | query | No | Page number (0-based, default: 0) |
| size | integer | query | No | Number of items per page (1-100, default: 20) |
| source | string | query | No | Filter by source (e.g., "SSI", "VND", "MBS") |
| reportType | integer | query | No | Filter by report type (1, 2, 3, etc.) |
| recommend | string | query | No | Filter by recommendation (e.g., "MUA", "BÁN", "GIỮ") |

#### Response

```json
{
  "data": [
    {
      "id": 1234,
      "ticker": "VIC",
      "tickerName": "Tập đoàn Vingroup",
      "reportType": 1,
      "source": "SSI",
      "issueDate": "2025-09-15",
      "issueDateTimeAgo": "2 days ago",
      "title": "Kết quả kinh doanh quý 3/2025",
      "attachedLink": "https://example.com/report.pdf",
      "localPdfPath": "http://localhost:3000/api/analysis-reports/pdfs/1234_report.pdf",
      "fileName": "1234_report.pdf",
      "targetPrice": "120000",
      "recommend": "MUA",
      "createdAt": "2025-09-15T10:00:00Z",
      "updatedAt": "2025-09-15T10:00:00Z"
    }
  ],
  "total": 500,
  "page": 0,
  "size": 20,
  "totalPages": 25
}
```

#### Example Requests

```bash
# Get all reports
curl "http://localhost:3000/api/analysis-reports"

# Get reports from SSI source
curl "http://localhost:3000/api/analysis-reports?source=SSI"

# Get reports with MUA recommendation, page 2, 10 items per page
curl "http://localhost:3000/api/analysis-reports?recommend=MUA&page=2&size=10"

# Get report type 1 from VND source
curl "http://localhost:3000/api/analysis-reports?source=VND&reportType=1"
```

---

### 3. Get Report by ID

Retrieve a single analysis report by its ID.

**Endpoint:** `GET /report/:id`

**Example:** `GET /api/analysis-reports/report/1234`

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| id | integer | path | Yes | Report ID |

#### Response

```json
{
  "id": 1234,
  "ticker": "VIC",
  "tickerName": "Tập đoàn Vingroup",
  "reportType": 1,
  "source": "SSI",
  "issueDate": "2025-09-15",
  "issueDateTimeAgo": "2 days ago",
  "title": "Kết quả kinh doanh quý 3/2025",
  "attachedLink": "https://example.com/report.pdf",
  "localPdfPath": "http://localhost:3000/api/analysis-reports/pdfs/1234_report.pdf",
  "fileName": "1234_report.pdf",
  "targetPrice": "120000",
  "recommend": "MUA",
  "createdAt": "2025-09-15T10:00:00Z",
  "updatedAt": "2025-09-15T10:00:00Z"
}
```

#### Status Codes

- `200 OK` - Success
- `404 Not Found` - Report not found
- `400 Bad Request` - Invalid ID format
- `500 Internal Server Error` - Server error

#### Example Request

```bash
curl "http://localhost:3000/api/analysis-reports/report/1234"
```

---

### 4. Get PDF Document

Retrieve the PDF file for a report.

**Endpoint:** `GET /pdfs/:filename`

**Example:** `GET /api/analysis-reports/pdfs/1234_report.pdf`

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| filename | string | path | Yes | PDF filename |

#### Response

Returns the PDF file with appropriate headers:
- `Content-Type: application/pdf`
- `Content-Length: [file size]`

#### Status Codes

- `200 OK` - Success, returns PDF file
- `404 Not Found` - File not found

#### Example Request

```bash
# Download PDF
curl -O "http://localhost:3000/api/analysis-reports/pdfs/1234_report.pdf"

# View in browser
open "http://localhost:3000/api/analysis-reports/pdfs/1234_report.pdf"
```

---

### 5. Sync Reports (Admin Only) 🔒

Fetch and save analysis reports from external Simplize API for a specific stock symbol.

**Endpoint:** `POST /sync`

**Authentication Required:** Yes (JWT Bearer Token)

#### Request Body

```json
{
  "symbol": "VIC",
  "downloadPDFs": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Yes | Stock symbol to sync (1-10 characters) |
| downloadPDFs | boolean | No | Whether to download PDF files (default: true) |

#### Response

```json
{
  "message": "Sync completed for VIC",
  "saved": 15,
  "errors": 0
}
```

#### Status Codes

- `200 OK` - Sync completed successfully
- `401 Unauthorized` - Authentication required
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Server error

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/analysis-reports/sync" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "VIC",
    "downloadPDFs": true
  }'
```

---

### 6. Clean Up Old Reports (Admin Only) 🔒

Delete analysis reports older than specified days.

**Endpoint:** `DELETE /cleanup`

**Authentication Required:** Yes (JWT Bearer Token)

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| daysToKeep | integer | query | No | Number of days to keep reports (minimum: 30, default: 365) |

#### Response

```json
{
  "message": "Deleted reports older than 365 days",
  "deletedCount": 42
}
```

#### Status Codes

- `200 OK` - Cleanup completed successfully
- `401 Unauthorized` - Authentication required
- `400 Bad Request` - Invalid parameters (daysToKeep < 30)
- `500 Internal Server Error` - Server error

#### Example Request

```bash
# Delete reports older than 90 days
curl -X DELETE "http://localhost:3000/api/analysis-reports/cleanup?daysToKeep=90" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Delete reports older than 1 year (default)
curl -X DELETE "http://localhost:3000/api/analysis-reports/cleanup" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Data Models

### Report Object

```typescript
interface AnalysisReport {
  id: number;                    // Unique report ID
  ticker: string;                 // Stock symbol (e.g., "VIC")
  tickerName: string | null;      // Company name
  reportType: number;             // Type of report (1, 2, 3, etc.)
  source: string;                 // Report source (e.g., "SSI", "VND")
  issueDate: string;              // Date issued (YYYY-MM-DD format)
  issueDateTimeAgo: string | null; // Human-readable time ago
  title: string;                  // Report title
  attachedLink: string;           // Original PDF URL
  localPdfPath: string | null;    // Local PDF path (full URL)
  fileName: string | null;        // PDF filename
  targetPrice: string | null;     // Target stock price
  recommend: string | null;       // Recommendation (MUA/BÁN/GIỮ)
  createdAt: string;              // ISO 8601 timestamp
  updatedAt: string;              // ISO 8601 timestamp
}
```

### Pagination Response

```typescript
interface PaginatedResponse<T> {
  data: T[];           // Array of items
  total: number;       // Total number of items
  page: number;        // Current page (0-based)
  size: number;        // Items per page
  totalPages: number;  // Total number of pages
}
```

---

## Report Types

| Type | Description |
|------|-------------|
| 1 | Báo cáo phân tích |
| 2 | Báo cáo ngành |
| 3 | Báo cáo thị trường |
| ... | Other types |

## Sources

Common report sources include:
- **SSI** - SSI Securities Corporation
- **VND** - VNDirect Securities
- **MBS** - MB Securities
- **HSC** - HSC Securities
- **VCI** - Viet Capital Securities
- **VCSC** - Viet Capital Securities
- **FPTS** - FPT Securities

## Recommendations

- **MUA** - Buy recommendation
- **BÁN** - Sell recommendation
- **GIỮ** - Hold recommendation
- **TÍCH LŨY** - Accumulate
- **TRUNG LẬP** - Neutral

---

## Error Handling

All endpoints return errors in the following format:

```json
{
  "error": "Error message",
  "details": [
    {
      "code": "validation_code",
      "message": "Detailed error message",
      "path": ["field_name"]
    }
  ]
}
```

### Common Error Codes

- `400` - Bad Request (validation errors, invalid parameters)
- `401` - Unauthorized (missing or invalid authentication)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error (server-side errors)

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **Limit:** 100 requests per minute
- **Headers returned:**
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 99`
  - `X-RateLimit-Reset: 60`

---

## CORS

CORS is enabled for all endpoints with the following configuration:
- Allowed origins configured via environment variables
- Credentials supported
- All standard HTTP methods allowed

---

## Examples

### JavaScript/TypeScript

```javascript
// Fetch reports for VIC stock
async function getVICReports() {
  const response = await fetch('http://localhost:3000/api/analysis-reports/VIC?page=0&size=10');
  const data = await response.json();
  console.log(`Found ${data.total} reports`);
  return data.data;
}

// Download PDF
async function downloadPDF(pdfUrl) {
  const response = await fetch(pdfUrl);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'report.pdf';
  a.click();
}
```

### Python

```python
import requests

# Get reports with filtering
def get_filtered_reports(source="SSI", recommend="MUA"):
    url = "http://localhost:3000/api/analysis-reports"
    params = {
        "source": source,
        "recommend": recommend,
        "page": 0,
        "size": 20
    }
    response = requests.get(url, params=params)
    return response.json()

# Download PDF
def download_pdf(pdf_url, filename):
    response = requests.get(pdf_url)
    with open(filename, 'wb') as f:
        f.write(response.content)
```

### cURL

```bash
# Get VIC reports with pagination
curl "http://localhost:3000/api/analysis-reports/VIC?page=0&size=5" | jq

# Filter by source and recommendation
curl "http://localhost:3000/api/analysis-reports?source=SSI&recommend=MUA" | jq

# Get specific report
curl "http://localhost:3000/api/analysis-reports/report/1234" | jq

# Download PDF
curl -O "http://localhost:3000/api/analysis-reports/pdfs/1234_report.pdf"
```

---

## Notes

1. **Pagination:** All list endpoints use 0-based pagination
2. **PDF Storage:** PDFs are stored in `/public/analysis-reports/` directory
3. **Auto-sync:** Consider setting up a cron job for regular report syncing
4. **Cleanup:** Regularly clean old reports to manage storage space
5. **Caching:** Consider implementing caching for frequently accessed reports

---

## Changelog

### Version 2.0.0 (Current)
- Initial release of Analysis Reports API
- Support for fetching reports by symbol
- Pagination and filtering capabilities
- PDF document serving
- Admin sync and cleanup endpoints
- Integration with Simplize API

---

## Support

For issues or questions regarding the Analysis Reports API, please contact the development team or create an issue in the project repository.