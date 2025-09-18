# Favorites API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Get All Favorites](#get-all-favorites)
  - [Get Favorite Symbols Only](#get-favorite-symbols-only)
  - [Add Single Favorite](#add-single-favorite)
  - [Add Multiple Favorites](#add-multiple-favorites-batch)
  - [Update Favorite Notes](#update-favorite-notes)
  - [Remove Single Favorite](#remove-single-favorite)
  - [Remove Multiple Favorites](#remove-multiple-favorites-batch)
  - [Check Favorite Status](#check-favorite-status)
  - [Check Multiple Favorites](#check-multiple-favorites)
  - [Clear All Favorites](#clear-all-favorites)
- [Data Models](#data-models)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

## Overview

The Favorites API provides a comprehensive system for users to manage their favorite stocks. This API replaces the complex watchlist system with a simplified, user-friendly favorites list that allows users to:

- Track stocks of interest with personal notes
- Perform batch operations for efficiency
- Get enriched stock information with favorites
- Prevent duplicate entries automatically

### Key Features
- 🚀 **High Performance**: Optimized batch operations
- 🔒 **Secure**: User-authenticated with data isolation
- 📝 **Flexible**: Add personal notes to each favorite
- 🎯 **Simple**: Direct symbol-based operations
- 🔄 **Real-time**: Integrated with live stock data
- ⚡ **Efficient**: Built-in duplicate prevention

## Authentication

All endpoints require user authentication via Bearer token in the Authorization header.

```http
Authorization: Bearer YOUR_AUTH_TOKEN
```

### Security Considerations
- Tokens should be transmitted over HTTPS only
- Tokens expire after 24 hours (configurable)
- Each user can only access their own favorites
- Rate limiting prevents abuse

## Base URL

### Development
```
http://localhost:3000/api/favorites
```

### Production
```
https://api.yourapp.com/api/favorites
```

## Response Format

### Success Response
All successful responses follow this general structure:

```json
{
  "data": { /* Response data */ },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response
All error responses follow this structure:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* Additional error details */ },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling

### HTTP Status Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success - Request completed successfully |
| 201 | Created - Resource created successfully |
| 204 | No Content - Request successful, no content to return |
| 400 | Bad Request - Invalid request format or parameters |
| 401 | Unauthorized - Authentication required or failed |
| 403 | Forbidden - Access denied to resource |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error occurred |

### Error Codes

| Error Code | Description | Resolution |
|-----------|-------------|------------|
| `UNAUTHORIZED` | User not authenticated | Provide valid auth token |
| `INVALID_SYMBOL` | Stock symbol invalid or not found | Check symbol format |
| `DUPLICATE_FAVORITE` | Stock already in favorites | Use update endpoint instead |
| `NOT_FOUND` | Resource not found | Verify resource exists |
| `VALIDATION_ERROR` | Request validation failed | Check request format |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait before retrying |
| `INTERNAL_ERROR` | Server error | Contact support |

## Rate Limiting

- **Default Limit**: 100 requests per minute per user
- **Batch Operations**: Count as single request
- **Headers Returned**:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## API Endpoints

### Get All Favorites

Retrieve all favorite stocks with detailed stock information.

#### Endpoint
```http
GET /api/favorites
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |
| Accept | No | application/json |

#### Query Parameters
None

#### Response Body
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "symbol": "VCB",
    "notes": "Leading bank stock, good for long-term",
    "addedAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "stock": {
      "id": 1234,
      "symbol": "VCB",
      "type": "STOCK",
      "board": "HOSE",
      "organName": "Ngân hàng TMCP Ngoại thương Việt Nam",
      "organShortName": "Vietcombank",
      "enOrganName": "Joint Stock Commercial Bank for Foreign Trade of Vietnam",
      "enOrganShortName": "Vietcombank"
    }
  }
]
```

#### Example Request
```bash
curl -X GET https://api.yourapp.com/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

---

### Get Favorite Symbols Only

Retrieve a simple list of favorite stock symbols without additional details.

#### Endpoint
```http
GET /api/favorites/symbols
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |

#### Response Body
```json
["VCB", "VHM", "VIC", "MSN", "HPG"]
```

#### Example Request
```bash
curl -X GET https://api.yourapp.com/api/favorites/symbols \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Add Single Favorite

Add a single stock to the favorites list with optional notes.

#### Endpoint
```http
POST /api/favorites
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |
| Content-Type | Yes | application/json |

#### Request Body
```json
{
  "symbol": "VCB",
  "notes": "Leading bank stock, watch Q4 earnings"
}
```

#### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| symbol | string | Yes | Stock symbol (1-10 chars) |
| notes | string | No | Personal notes about the stock |

#### Response Body (201 Created)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "symbol": "VCB",
  "notes": "Leading bank stock, watch Q4 earnings",
  "addedAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### Error Responses
- **409 Conflict**: Symbol already in favorites
- **400 Bad Request**: Invalid symbol format
- **404 Not Found**: Stock symbol doesn't exist

#### Example Request
```bash
curl -X POST https://api.yourapp.com/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "VCB", "notes": "Bank stock to watch"}'
```

---

### Add Multiple Favorites (Batch)

Add multiple stocks to favorites in a single request.

#### Endpoint
```http
POST /api/favorites/batch
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |
| Content-Type | Yes | application/json |

#### Request Body
```json
{
  "symbols": ["VCB", "VHM", "VIC", "MSN", "HPG"]
}
```

#### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| symbols | array | Yes | Array of stock symbols (1-100 items) |

#### Response Body
```json
{
  "added": 3,
  "skipped": 2
}
```

#### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| added | integer | Number of successfully added stocks |
| skipped | integer | Number of stocks already in favorites |

#### Example Request
```bash
curl -X POST https://api.yourapp.com/api/favorites/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VCB", "VHM", "VIC"]}'
```

---

### Update Favorite Notes

Update the personal notes for a favorite stock.

#### Endpoint
```http
PUT /api/favorites/{symbol}/notes
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |
| Content-Type | Yes | application/json |

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | string | Yes | Stock symbol to update |

#### Request Body
```json
{
  "notes": "Updated analysis - strong Q4 performance expected"
}
```

#### Response Body
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "symbol": "VCB",
  "notes": "Updated analysis - strong Q4 performance expected",
  "addedAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-16T14:20:00Z"
}
```

#### Example Request
```bash
curl -X PUT https://api.yourapp.com/api/favorites/VCB/notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "New analysis notes"}'
```

---

### Remove Single Favorite

Remove a single stock from favorites.

#### Endpoint
```http
DELETE /api/favorites/{symbol}
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | string | Yes | Stock symbol to remove |

#### Response
- **204 No Content**: Successfully removed
- **404 Not Found**: Symbol not in favorites

#### Example Request
```bash
curl -X DELETE https://api.yourapp.com/api/favorites/VCB \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Remove Multiple Favorites (Batch)

Remove multiple stocks from favorites in a single request.

#### Endpoint
```http
DELETE /api/favorites/batch
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |
| Content-Type | Yes | application/json |

#### Request Body
```json
{
  "symbols": ["VCB", "VHM", "VIC"]
}
```

#### Response Body
```json
{
  "removed": 3
}
```

#### Example Request
```bash
curl -X DELETE https://api.yourapp.com/api/favorites/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VCB", "VHM", "VIC"]}'
```

---

### Check Favorite Status

Check if a specific stock is in the user's favorites.

#### Endpoint
```http
GET /api/favorites/check/{symbol}
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | string | Yes | Stock symbol to check |

#### Response Body
```json
{
  "symbol": "VCB",
  "isFavorite": true
}
```

#### Example Request
```bash
curl -X GET https://api.yourapp.com/api/favorites/check/VCB \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Check Multiple Favorites

Check multiple stocks' favorite status in a single request.

#### Endpoint
```http
POST /api/favorites/check
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |
| Content-Type | Yes | application/json |

#### Request Body
```json
{
  "symbols": ["VCB", "VHM", "VIC", "MSN", "HPG"]
}
```

#### Response Body
```json
{
  "VCB": true,
  "VHM": true,
  "VIC": false,
  "MSN": false,
  "HPG": true
}
```

#### Example Request
```bash
curl -X POST https://api.yourapp.com/api/favorites/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VCB", "VHM", "VIC"]}'
```

---

### Clear All Favorites

Remove all stocks from the user's favorites list.

#### Endpoint
```http
DELETE /api/favorites
```

#### Headers
| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | Bearer token |

#### Response Body
```json
{
  "cleared": 5
}
```

#### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| cleared | integer | Number of favorites removed |

#### Example Request
```bash
curl -X DELETE https://api.yourapp.com/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Data Models

### UserFavorite Schema

```typescript
interface UserFavorite {
  id: string;              // UUID - Unique identifier
  userId: string;          // UUID - User who owns this favorite
  symbol: string;          // Stock symbol (uppercase, max 10 chars)
  notes?: string | null;   // Optional personal notes
  addedAt: Date;           // Timestamp when added to favorites
  updatedAt: Date;         // Timestamp of last update
}
```

### UserFavoriteWithStock Schema

```typescript
interface UserFavoriteWithStock extends UserFavorite {
  stock?: {
    id: number;                      // Stock ID in database
    symbol: string;                  // Stock symbol
    type: string;                    // Stock type (STOCK, FUND, etc.)
    board: string;                   // Trading board (HOSE, HNX, UPCOM)
    organName: string | null;        // Full company name in Vietnamese
    organShortName: string | null;   // Short company name in Vietnamese
    enOrganName: string | null;      // Full company name in English
    enOrganShortName: string | null; // Short company name in English
  };
}
```

### Database Schema

```sql
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    notes TEXT,
    added_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT user_favorites_unique_idx UNIQUE(user_id, symbol)
);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_symbol ON user_favorites(symbol);
CREATE INDEX idx_user_favorites_added_at ON user_favorites(added_at DESC);
```

## Code Examples

### TypeScript/JavaScript

#### Service Class Implementation
```typescript
// services/favorites.service.ts
import axios, { AxiosInstance } from 'axios';

interface FavoriteOptions {
  baseURL?: string;
  token?: string;
}

export class FavoritesService {
  private api: AxiosInstance;

  constructor(options: FavoriteOptions = {}) {
    this.api = axios.create({
      baseURL: options.baseURL || 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token && { 'Authorization': `Bearer ${options.token}` })
      }
    });
  }

  // Get all favorites
  async getAllFavorites(): Promise<UserFavoriteWithStock[]> {
    const response = await this.api.get('/favorites');
    return response.data;
  }

  // Get symbols only
  async getFavoriteSymbols(): Promise<string[]> {
    const response = await this.api.get('/favorites/symbols');
    return response.data;
  }

  // Add single favorite
  async addFavorite(symbol: string, notes?: string): Promise<UserFavorite> {
    const response = await this.api.post('/favorites', { symbol, notes });
    return response.data;
  }

  // Add multiple favorites
  async addMultipleFavorites(symbols: string[]): Promise<{ added: number; skipped: number }> {
    const response = await this.api.post('/favorites/batch', { symbols });
    return response.data;
  }

  // Update notes
  async updateNotes(symbol: string, notes: string): Promise<UserFavorite> {
    const response = await this.api.put(`/favorites/${symbol}/notes`, { notes });
    return response.data;
  }

  // Remove single favorite
  async removeFavorite(symbol: string): Promise<void> {
    await this.api.delete(`/favorites/${symbol}`);
  }

  // Remove multiple favorites
  async removeMultipleFavorites(symbols: string[]): Promise<{ removed: number }> {
    const response = await this.api.delete('/favorites/batch', { data: { symbols } });
    return response.data;
  }

  // Check favorite status
  async checkFavorite(symbol: string): Promise<{ symbol: string; isFavorite: boolean }> {
    const response = await this.api.get(`/favorites/check/${symbol}`);
    return response.data;
  }

  // Check multiple favorites
  async checkMultipleFavorites(symbols: string[]): Promise<Record<string, boolean>> {
    const response = await this.api.post('/favorites/check', { symbols });
    return response.data;
  }

  // Clear all favorites
  async clearAllFavorites(): Promise<{ cleared: number }> {
    const response = await this.api.delete('/favorites');
    return response.data;
  }
}
```

#### React Hook Example
```typescript
// hooks/useFavorites.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FavoritesService } from '@/services/favorites.service';
import { toast } from 'sonner';

const favoritesService = new FavoritesService({
  token: localStorage.getItem('authToken')
});

export function useFavorites() {
  const queryClient = useQueryClient();

  // Query all favorites
  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesService.getAllFavorites(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Add favorite mutation with optimistic update
  const addFavoriteMutation = useMutation({
    mutationFn: ({ symbol, notes }: { symbol: string; notes?: string }) =>
      favoritesService.addFavorite(symbol, notes),
    onMutate: async (newFavorite) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previousFavorites = queryClient.getQueryData(['favorites']);
      
      queryClient.setQueryData(['favorites'], (old: any) => [
        ...old,
        { ...newFavorite, id: 'temp-id', addedAt: new Date(), updatedAt: new Date() }
      ]);
      
      return { previousFavorites };
    },
    onError: (err, newFavorite, context) => {
      queryClient.setQueryData(['favorites'], context?.previousFavorites);
      toast.error('Failed to add favorite');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Added to favorites');
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (symbol: string) => favoritesService.removeFavorite(symbol),
    onMutate: async (symbol) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previousFavorites = queryClient.getQueryData(['favorites']);
      
      queryClient.setQueryData(['favorites'], (old: any) =>
        old.filter((f: any) => f.symbol !== symbol)
      );
      
      return { previousFavorites };
    },
    onError: (err, symbol, context) => {
      queryClient.setQueryData(['favorites'], context?.previousFavorites);
      toast.error('Failed to remove favorite');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Removed from favorites');
    },
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: ({ symbol, notes }: { symbol: string; notes: string }) =>
      favoritesService.updateNotes(symbol, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Notes updated');
    },
    onError: () => {
      toast.error('Failed to update notes');
    },
  });

  return {
    // Data
    favorites: favoritesQuery.data || [],
    isLoading: favoritesQuery.isLoading,
    error: favoritesQuery.error,
    
    // Actions
    addFavorite: addFavoriteMutation.mutate,
    removeFavorite: removeFavoriteMutation.mutate,
    updateNotes: updateNotesMutation.mutate,
    
    // States
    isAddingFavorite: addFavoriteMutation.isLoading,
    isRemovingFavorite: removeFavoriteMutation.isLoading,
    isUpdatingNotes: updateNotesMutation.isLoading,
    
    // Utilities
    isFavorite: (symbol: string) => 
      favoritesQuery.data?.some(f => f.symbol === symbol) || false,
  };
}
```

#### React Component Example
```tsx
// components/FavoriteButton.tsx
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  symbol: string;
  showLabel?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
}

export function FavoriteButton({
  symbol,
  showLabel = false,
  variant = 'ghost',
  size = 'icon',
  className
}: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite, isAddingFavorite, isRemovingFavorite } = useFavorites();
  const isFav = isFavorite(symbol);
  const isLoading = isAddingFavorite || isRemovingFavorite;

  const handleToggle = () => {
    if (isFav) {
      removeFavorite(symbol);
    } else {
      addFavorite({ symbol });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'transition-colors',
        isFav && 'text-red-500 hover:text-red-600',
        className
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4',
          isFav && 'fill-current',
          showLabel && 'mr-2'
        )}
      />
      {showLabel && (isFav ? 'Remove from Favorites' : 'Add to Favorites')}
    </Button>
  );
}
```

#### Favorites List Component
```tsx
// components/FavoritesList.tsx
import { useFavorites } from '@/hooks/useFavorites';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FavoriteButton } from './FavoriteButton';
import { EditNotesDialog } from './EditNotesDialog';

export function FavoritesList() {
  const { favorites, isLoading, error } = useFavorites();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-red-500">Failed to load favorites</p>
      </Card>
    );
  }

  if (favorites.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
        <p className="text-gray-600">Start adding stocks to your favorites to track them easily</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {favorites.map((favorite) => (
        <Card key={favorite.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{favorite.symbol}</h4>
                {favorite.stock && (
                  <span className="text-sm text-gray-600">
                    {favorite.stock.organShortName}
                  </span>
                )}
              </div>
              {favorite.notes && (
                <p className="text-sm text-gray-600 mt-1">{favorite.notes}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Added {new Date(favorite.addedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <EditNotesDialog
                symbol={favorite.symbol}
                currentNotes={favorite.notes}
              />
              <FavoriteButton
                symbol={favorite.symbol}
                variant="ghost"
                size="icon"
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### Python Example

```python
# favorites_client.py
import requests
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class UserFavorite:
    id: str
    user_id: str
    symbol: str
    notes: Optional[str]
    added_at: datetime
    updated_at: datetime

@dataclass
class StockInfo:
    id: int
    symbol: str
    type: str
    board: str
    organ_name: Optional[str]
    organ_short_name: Optional[str]
    en_organ_name: Optional[str]
    en_organ_short_name: Optional[str]

class FavoritesClient:
    def __init__(self, base_url: str = "http://localhost:3000/api", token: str = None):
        self.base_url = base_url
        self.session = requests.Session()
        if token:
            self.session.headers.update({
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            })
    
    def get_all_favorites(self) -> List[Dict[str, Any]]:
        """Get all favorites with stock details"""
        response = self.session.get(f"{self.base_url}/favorites")
        response.raise_for_status()
        return response.json()
    
    def get_favorite_symbols(self) -> List[str]:
        """Get list of favorite symbols only"""
        response = self.session.get(f"{self.base_url}/favorites/symbols")
        response.raise_for_status()
        return response.json()
    
    def add_favorite(self, symbol: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """Add a stock to favorites"""
        data = {"symbol": symbol}
        if notes:
            data["notes"] = notes
        
        response = self.session.post(f"{self.base_url}/favorites", json=data)
        response.raise_for_status()
        return response.json()
    
    def add_multiple_favorites(self, symbols: List[str]) -> Dict[str, int]:
        """Add multiple stocks to favorites"""
        response = self.session.post(
            f"{self.base_url}/favorites/batch",
            json={"symbols": symbols}
        )
        response.raise_for_status()
        return response.json()
    
    def update_notes(self, symbol: str, notes: str) -> Dict[str, Any]:
        """Update notes for a favorite"""
        response = self.session.put(
            f"{self.base_url}/favorites/{symbol}/notes",
            json={"notes": notes}
        )
        response.raise_for_status()
        return response.json()
    
    def remove_favorite(self, symbol: str) -> None:
        """Remove a stock from favorites"""
        response = self.session.delete(f"{self.base_url}/favorites/{symbol}")
        response.raise_for_status()
    
    def remove_multiple_favorites(self, symbols: List[str]) -> Dict[str, int]:
        """Remove multiple stocks from favorites"""
        response = self.session.delete(
            f"{self.base_url}/favorites/batch",
            json={"symbols": symbols}
        )
        response.raise_for_status()
        return response.json()
    
    def check_favorite(self, symbol: str) -> bool:
        """Check if a stock is in favorites"""
        response = self.session.get(f"{self.base_url}/favorites/check/{symbol}")
        response.raise_for_status()
        return response.json()["isFavorite"]
    
    def check_multiple_favorites(self, symbols: List[str]) -> Dict[str, bool]:
        """Check multiple stocks favorite status"""
        response = self.session.post(
            f"{self.base_url}/favorites/check",
            json={"symbols": symbols}
        )
        response.raise_for_status()
        return response.json()
    
    def clear_all_favorites(self) -> int:
        """Clear all favorites"""
        response = self.session.delete(f"{self.base_url}/favorites")
        response.raise_for_status()
        return response.json()["cleared"]

# Usage example
if __name__ == "__main__":
    # Initialize client
    client = FavoritesClient(token="YOUR_AUTH_TOKEN")
    
    try:
        # Add a favorite
        result = client.add_favorite("VCB", "Leading bank stock")
        print(f"Added favorite: {result}")
        
        # Get all favorites
        favorites = client.get_all_favorites()
        print(f"Total favorites: {len(favorites)}")
        
        # Check if stock is favorite
        is_favorite = client.check_favorite("VCB")
        print(f"VCB is favorite: {is_favorite}")
        
        # Update notes
        updated = client.update_notes("VCB", "Updated analysis - buy signal")
        print(f"Updated notes: {updated}")
        
        # Batch operations
        batch_result = client.add_multiple_favorites(["VHM", "VIC", "MSN"])
        print(f"Batch add result: {batch_result}")
        
        # Check multiple
        status = client.check_multiple_favorites(["VCB", "VHM", "HPG"])
        print(f"Favorites status: {status}")
        
    except requests.exceptions.HTTPError as e:
        print(f"API Error: {e.response.status_code} - {e.response.text}")
    except Exception as e:
        print(f"Error: {str(e)}")
```

### cURL Examples

```bash
# Get all favorites
curl -X GET http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get symbols only
curl -X GET http://localhost:3000/api/favorites/symbols \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add a favorite with notes
curl -X POST http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "VCB", "notes": "Banking sector leader"}'

# Add multiple favorites
curl -X POST http://localhost:3000/api/favorites/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VCB", "VHM", "VIC", "MSN", "HPG"]}'

# Update notes for a favorite
curl -X PUT http://localhost:3000/api/favorites/VCB/notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Q4 earnings expected to be strong"}'

# Remove a favorite
curl -X DELETE http://localhost:3000/api/favorites/VCB \
  -H "Authorization: Bearer YOUR_TOKEN"

# Remove multiple favorites
curl -X DELETE http://localhost:3000/api/favorites/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VCB", "VHM", "VIC"]}'

# Check if stock is favorite
curl -X GET http://localhost:3000/api/favorites/check/VCB \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check multiple stocks
curl -X POST http://localhost:3000/api/favorites/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VCB", "VHM", "VIC", "MSN", "HPG"]}'

# Clear all favorites
curl -X DELETE http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

### 1. Performance Optimization

#### Use Batch Operations
```typescript
// Good ✅ - Single batch request
await favoritesService.addMultipleFavorites(['VCB', 'VHM', 'VIC']);

// Bad ❌ - Multiple individual requests
for (const symbol of ['VCB', 'VHM', 'VIC']) {
  await favoritesService.addFavorite(symbol);
}
```

#### Implement Caching
```typescript
// React Query with stale-while-revalidate strategy
const { data } = useQuery({
  queryKey: ['favorites'],
  queryFn: favoritesService.getAllFavorites,
  staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  refetchOnWindowFocus: false, // Don't refetch on window focus
});
```

#### Optimistic Updates
```typescript
// Update UI immediately, revert on error
const mutation = useMutation({
  mutationFn: favoritesService.addFavorite,
  onMutate: async (newFavorite) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries(['favorites']);
    
    // Snapshot current value
    const previous = queryClient.getQueryData(['favorites']);
    
    // Optimistically update
    queryClient.setQueryData(['favorites'], old => [...old, newFavorite]);
    
    // Return context for rollback
    return { previous };
  },
  onError: (err, newFavorite, context) => {
    // Rollback on error
    queryClient.setQueryData(['favorites'], context.previous);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries(['favorites']);
  }
});
```

### 2. Error Handling

#### Comprehensive Error Handling
```typescript
class FavoritesManager {
  async addFavorite(symbol: string, notes?: string) {
    try {
      const result = await favoritesService.addFavorite(symbol, notes);
      return { success: true, data: result };
    } catch (error) {
      if (error.response?.status === 409) {
        return { 
          success: false, 
          error: 'Stock already in favorites',
          code: 'DUPLICATE_FAVORITE'
        };
      }
      if (error.response?.status === 404) {
        return { 
          success: false, 
          error: 'Stock symbol not found',
          code: 'INVALID_SYMBOL'
        };
      }
      if (error.response?.status === 401) {
        // Redirect to login
        window.location.href = '/login';
        return { success: false, error: 'Authentication required' };
      }
      // Generic error
      return { 
        success: false, 
        error: 'Failed to add favorite. Please try again.',
        code: 'UNKNOWN_ERROR'
      };
    }
  }
}
```

### 3. Security

#### Token Management
```typescript
class SecureTokenManager {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async getToken(): Promise<string> {
    // Check if token exists and is valid
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    // Refresh token if needed
    if (this.refreshToken) {
      await this.refreshAccessToken();
      return this.token!;
    }

    throw new Error('No valid authentication token');
  }

  private async refreshAccessToken() {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    this.token = data.accessToken;
    this.tokenExpiry = new Date(data.expiresAt);
  }
}
```

### 4. Data Validation

#### Input Validation
```typescript
class FavoriteValidator {
  static validateSymbol(symbol: string): { valid: boolean; error?: string } {
    if (!symbol) {
      return { valid: false, error: 'Symbol is required' };
    }
    if (symbol.length < 1 || symbol.length > 10) {
      return { valid: false, error: 'Symbol must be 1-10 characters' };
    }
    if (!/^[A-Z0-9]+$/.test(symbol.toUpperCase())) {
      return { valid: false, error: 'Symbol must contain only letters and numbers' };
    }
    return { valid: true };
  }

  static validateNotes(notes?: string): { valid: boolean; error?: string } {
    if (!notes) {
      return { valid: true }; // Notes are optional
    }
    if (notes.length > 1000) {
      return { valid: false, error: 'Notes must be less than 1000 characters' };
    }
    return { valid: true };
  }

  static validateBatchSymbols(symbols: string[]): { valid: boolean; error?: string } {
    if (!Array.isArray(symbols)) {
      return { valid: false, error: 'Symbols must be an array' };
    }
    if (symbols.length === 0) {
      return { valid: false, error: 'At least one symbol is required' };
    }
    if (symbols.length > 100) {
      return { valid: false, error: 'Maximum 100 symbols allowed per batch' };
    }
    
    for (const symbol of symbols) {
      const validation = this.validateSymbol(symbol);
      if (!validation.valid) {
        return validation;
      }
    }
    
    return { valid: true };
  }
}

// Usage
const handleAddFavorite = async (symbol: string, notes?: string) => {
  const symbolValidation = FavoriteValidator.validateSymbol(symbol);
  if (!symbolValidation.valid) {
    toast.error(symbolValidation.error);
    return;
  }

  const notesValidation = FavoriteValidator.validateNotes(notes);
  if (!notesValidation.valid) {
    toast.error(notesValidation.error);
    return;
  }

  await addFavorite(symbol.toUpperCase(), notes);
};
```

### 5. Monitoring and Logging

#### Request Logging
```typescript
class FavoritesLogger {
  private logs: any[] = [];

  logRequest(method: string, endpoint: string, data?: any) {
    const log = {
      timestamp: new Date(),
      method,
      endpoint,
      data,
      userId: this.getCurrentUserId()
    };
    
    this.logs.push(log);
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(log);
    }
  }

  logError(error: Error, context: any) {
    const errorLog = {
      timestamp: new Date(),
      error: error.message,
      stack: error.stack,
      context,
      userId: this.getCurrentUserId()
    };
    
    console.error('Favorites API Error:', errorLog);
    
    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorTracking(errorLog);
    }
  }

  private getCurrentUserId(): string | null {
    // Implementation to get current user ID
    return localStorage.getItem('userId');
  }

  private sendToMonitoring(log: any) {
    // Send to service like DataDog, New Relic, etc.
  }

  private sendToErrorTracking(errorLog: any) {
    // Send to service like Sentry, Rollbar, etc.
  }
}
```

## Migration Guide

### From Watchlists to Favorites

If you're migrating from the old watchlist system to the new favorites system, follow this guide:

#### Database Migration
```sql
-- Step 1: Create new favorites table
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    notes TEXT,
    added_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT user_favorites_unique_idx UNIQUE(user_id, symbol)
);

-- Step 2: Migrate data from watchlists
INSERT INTO user_favorites (user_id, symbol, notes, added_at, updated_at)
SELECT DISTINCT 
    w.user_id,
    wi.symbol,
    wi.notes,
    wi.created_at,
    wi.updated_at
FROM watchlists w
JOIN watchlist_items wi ON w.id = wi.watchlist_id
WHERE w.is_default = true  -- Or your logic to select primary watchlist
ON CONFLICT (user_id, symbol) DO NOTHING;

-- Step 3: Create indexes
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_symbol ON user_favorites(symbol);
CREATE INDEX idx_user_favorites_added_at ON user_favorites(added_at DESC);
```

#### API Endpoint Mapping

| Old Endpoint | New Endpoint | Notes |
|-------------|--------------|-------|
| `GET /api/watchlists` | `GET /api/favorites` | Returns flat list instead of nested structure |
| `GET /api/watchlists/:id` | `GET /api/favorites` | Single favorites list per user |
| `POST /api/watchlists` | N/A | No need to create lists |
| `POST /api/watchlists/:id/items` | `POST /api/favorites` | Direct add to favorites |
| `DELETE /api/watchlists/:id/items/:itemId` | `DELETE /api/favorites/:symbol` | Symbol-based deletion |
| `PUT /api/watchlists/:id/items/:itemId` | `PUT /api/favorites/:symbol/notes` | Update notes only |
| `DELETE /api/watchlists/:id` | `DELETE /api/favorites` | Clear all favorites |

#### Code Migration Examples

##### Old Watchlist Code
```typescript
// Old approach with watchlists
const watchlists = await getWatchlists();
const defaultWatchlist = watchlists.find(w => w.isDefault);
const items = await getWatchlistItems(defaultWatchlist.id);

await addToWatchlist(defaultWatchlist.id, { symbol: 'VCB', notes: 'Banking stock' });
await removeFromWatchlist(defaultWatchlist.id, itemId);
```

##### New Favorites Code
```typescript
// New simplified approach
const favorites = await getFavorites();

await addFavorite('VCB', 'Banking stock');
await removeFavorite('VCB');
```

#### Frontend Component Migration

##### Old Watchlist Component
```tsx
// Old: Multiple watchlists with complex state
function WatchlistManager() {
  const [watchlists, setWatchlists] = useState([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState(null);
  const [items, setItems] = useState([]);

  // Complex logic to manage multiple lists
  // ...
}
```

##### New Favorites Component
```tsx
// New: Simple single favorites list
function FavoritesManager() {
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  
  // Simplified logic with single list
  // ...
}
```

### Breaking Changes

1. **No Multiple Lists**: Users now have a single favorites list instead of multiple watchlists
2. **Symbol-Based Operations**: All operations use stock symbols directly instead of item IDs
3. **Simplified Response Structure**: Responses are flatter without nested watchlist structure
4. **No List Metadata**: No watchlist names, descriptions, or settings
5. **Direct Operations**: No need to specify watchlist ID for operations

### Deprecation Timeline

- **Phase 1** (Current): Both APIs available, new features only in Favorites API
- **Phase 2** (3 months): Watchlist API marked as deprecated, migration warnings added
- **Phase 3** (6 months): Watchlist API read-only mode
- **Phase 4** (9 months): Watchlist API removed completely

## Appendix

### Stock Symbol Format

Stock symbols in the Vietnamese market typically follow these patterns:

- **3-4 Letter Codes**: Most common (VCB, VHM, VIC, MSN)
- **Uppercase Only**: Always stored and compared in uppercase
- **Alphanumeric**: Can contain letters and numbers (VN30F2401)
- **Exchange Suffixes**: May include exchange identifiers

### Trading Boards

| Board | Description | Examples |
|-------|------------|----------|
| HOSE | Ho Chi Minh Stock Exchange | VCB, VHM, VIC |
| HNX | Hanoi Stock Exchange | SHS, PVS, CEO |
| UPCOM | Unlisted Public Company Market | Various smaller stocks |

### Common Status Codes

| Code | Description | User Action |
|------|-------------|------------|
| 200 | Success | None required |
| 201 | Created | Resource created successfully |
| 204 | No Content | Operation successful, no data returned |
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Login required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Verify resource exists |
| 409 | Conflict | Resource already exists |
| 429 | Rate Limited | Wait before retrying |
| 500 | Server Error | Contact support if persists |
| 503 | Service Unavailable | Service temporarily down |

### Glossary

| Term | Definition |
|------|------------|
| **Favorite** | A stock saved by user for quick access |
| **Symbol** | Stock ticker symbol (e.g., VCB) |
| **Notes** | Personal annotations about a stock |
| **Batch Operation** | Operating on multiple items in single request |
| **Optimistic Update** | Updating UI before server confirms |
| **Stale Time** | Duration data is considered fresh |
| **Cache Time** | Duration data is kept in cache |

---

## Support

For additional support or questions about the Favorites API:

- **Documentation**: This document
- **API Status**: https://status.yourapp.com
- **Support Email**: api-support@yourapp.com
- **Developer Forum**: https://forum.yourapp.com/api
- **GitHub Issues**: https://github.com/yourapp/api/issues

---

*Last Updated: January 2024*  
*Version: 1.0.0*  
*API Version: v1*