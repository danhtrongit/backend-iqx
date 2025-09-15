# Stock Favorites API

## Giới thiệu
API Favorites cho phép người dùng quản lý danh sách các cổ phiếu yêu thích của họ. Hệ thống đã được đơn giản hóa từ watchlists phức tạp thành một danh sách favorites duy nhất cho mỗi người dùng.

## Tính năng chính
- ✅ Thêm/xóa cổ phiếu yêu thích
- ✅ Thêm ghi chú cá nhân cho mỗi cổ phiếu
- ✅ Thao tác theo lô (batch operations) 
- ✅ Kiểm tra trạng thái yêu thích
- ✅ Tự động ngăn chặn trùng lặp
- ✅ Tích hợp thông tin cổ phiếu real-time

## Cấu trúc Database

### Bảng `user_favorites`
```sql
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    notes TEXT,
    added_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, symbol)
);
```

## Quick Start

### 1. Setup Backend
```bash
# Di chuyển đến thư mục backend
cd backend

# Cài đặt dependencies
npm install

# Chạy database migrations
npm run db:migrate

# Khởi động server
npm run dev
```

### 2. Test với cURL

#### Lấy danh sách favorites
```bash
curl -X GET http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Thêm một cổ phiếu vào favorites
```bash
curl -X POST http://localhost:3000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "VCB", "notes": "Ngân hàng tốt"}'
```

#### Thêm nhiều cổ phiếu cùng lúc
```bash
curl -X POST http://localhost:3000/api/favorites/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["VCB", "VHM", "VIC"]}'
```

#### Cập nhật ghi chú
```bash
curl -X PATCH http://localhost:3000/api/favorites/VCB \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Theo dõi báo cáo Q4"}'
```

#### Xóa khỏi favorites
```bash
curl -X DELETE http://localhost:3000/api/favorites/VCB \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Kiểm tra trạng thái favorite
```bash
curl -X GET http://localhost:3000/api/favorites/check/VCB \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Sử dụng với Frontend (React/TypeScript)

### Service Layer
```typescript
// services/favorites.service.ts
import { api } from '@/lib/api';

export interface Favorite {
  id: string;
  userId: string;
  symbol: string;
  notes?: string;
  addedAt: string;
  updatedAt: string;
  stock?: StockInfo;
}

export interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

export const favoritesService = {
  // Lấy tất cả favorites
  async getAll(): Promise<{ favorites: Favorite[] }> {
    return api.get('/api/favorites');
  },

  // Thêm một favorite
  async add(symbol: string, notes?: string): Promise<Favorite> {
    return api.post('/api/favorites', { symbol, notes });
  },

  // Thêm nhiều favorites
  async addBatch(symbols: string[]) {
    return api.post('/api/favorites/batch', { symbols });
  },

  // Cập nhật notes
  async updateNotes(symbol: string, notes: string): Promise<Favorite> {
    return api.patch(`/api/favorites/${symbol}`, { notes });
  },

  // Xóa một favorite
  async remove(symbol: string) {
    return api.delete(`/api/favorites/${symbol}`);
  },

  // Xóa nhiều favorites
  async removeBatch(symbols: string[]) {
    return api.delete('/api/favorites/batch', { symbols });
  },

  // Kiểm tra favorite status
  async checkStatus(symbol: string) {
    return api.get(`/api/favorites/check/${symbol}`);
  },

  // Xóa tất cả favorites
  async clearAll() {
    return api.delete('/api/favorites/all');
  }
};
```

### React Hook Example
```typescript
// hooks/useFavorites.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesService } from '@/services/favorites.service';

export function useFavorites() {
  const queryClient = useQueryClient();

  // Get all favorites
  const { data, isLoading, error } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesService.getAll
  });

  // Add favorite mutation
  const addFavorite = useMutation({
    mutationFn: ({ symbol, notes }: { symbol: string; notes?: string }) => 
      favoritesService.add(symbol, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    }
  });

  // Remove favorite mutation
  const removeFavorite = useMutation({
    mutationFn: (symbol: string) => favoritesService.remove(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    }
  });

  return {
    favorites: data?.favorites || [],
    isLoading,
    error,
    addFavorite,
    removeFavorite
  };
}
```

### Component Example
```tsx
// components/FavoriteButton.tsx
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';

export function FavoriteButton({ symbol }: { symbol: string }) {
  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const isFavorite = favorites.some(f => f.symbol === symbol);

  const handleToggle = () => {
    if (isFavorite) {
      removeFavorite.mutate(symbol);
    } else {
      addFavorite.mutate({ symbol });
    }
  };

  return (
    <Button
      variant={isFavorite ? "default" : "outline"}
      size="icon"
      onClick={handleToggle}
    >
      <Heart className={isFavorite ? "fill-current" : ""} />
    </Button>
  );
}
```

## File Structure
```
backend/
├── src/
│   ├── services/
│   │   └── favorites.service.ts    # Business logic
│   ├── routes/
│   │   └── favorites.routes.ts     # API endpoints
│   ├── db/
│   │   └── schema/
│   │       └── user-favorites.ts   # Database schema
│   └── index.ts                     # Server registration
├── drizzle/
│   └── migrations/                  # Database migrations
└── docs/
    ├── api-favorites.md             # Full API documentation
    ├── favorites-api.postman.json   # Postman collection
    └── README-favorites.md          # This file
```

## Error Handling

### Common Errors
```typescript
// Duplicate favorite
{
  "error": "Symbol already in favorites",
  "code": "DUPLICATE_FAVORITE"
}

// Not found
{
  "error": "Symbol not in favorites", 
  "code": "NOT_FOUND"
}

// Invalid symbol
{
  "error": "Invalid stock symbol",
  "code": "INVALID_SYMBOL"
}
```

### Frontend Error Handling
```typescript
try {
  await favoritesService.add('VCB');
} catch (error) {
  if (error.code === 'DUPLICATE_FAVORITE') {
    toast.error('Cổ phiếu đã có trong danh sách yêu thích');
  } else {
    toast.error('Có lỗi xảy ra, vui lòng thử lại');
  }
}
```

## Performance Tips

1. **Batch Operations**: Sử dụng batch endpoints khi cần thao tác nhiều items
```typescript
// Tốt ✅
await favoritesService.addBatch(['VCB', 'VHM', 'VIC']);

// Không tốt ❌
for (const symbol of symbols) {
  await favoritesService.add(symbol);
}
```

2. **Caching**: Sử dụng React Query để cache data
```typescript
const { data } = useQuery({
  queryKey: ['favorites'],
  queryFn: favoritesService.getAll,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

3. **Optimistic Updates**: Cập nhật UI ngay lập tức
```typescript
const addFavorite = useMutation({
  mutationFn: favoritesService.add,
  onMutate: async (newFavorite) => {
    await queryClient.cancelQueries(['favorites']);
    const previousFavorites = queryClient.getQueryData(['favorites']);
    
    // Optimistically update
    queryClient.setQueryData(['favorites'], old => ({
      ...old,
      favorites: [...old.favorites, newFavorite]
    }));
    
    return { previousFavorites };
  },
  onError: (err, newFavorite, context) => {
    // Rollback on error
    queryClient.setQueryData(['favorites'], context.previousFavorites);
  }
});
```

## Testing

### Unit Tests
```typescript
// favorites.service.test.ts
describe('FavoritesService', () => {
  it('should add favorite successfully', async () => {
    const result = await favoritesService.add('VCB', 'Test note');
    expect(result.symbol).toBe('VCB');
    expect(result.notes).toBe('Test note');
  });

  it('should prevent duplicate favorites', async () => {
    await favoritesService.add('VCB');
    await expect(favoritesService.add('VCB')).rejects.toThrow('DUPLICATE_FAVORITE');
  });
});
```

### Integration Tests with Postman
1. Import `favorites-api.postman_collection.json` vào Postman
2. Set biến môi trường `authToken` với token của bạn
3. Run collection tests

## Migration Guide (từ Watchlists cũ)

### Thay đổi chính
1. **Single List**: Không còn nhiều watchlists, chỉ một favorites list
2. **Symbol-based**: Thao tác trực tiếp với symbol, không cần item ID
3. **Simplified API**: Endpoints đơn giản và trực quan hơn

### Mapping
| Old Endpoint | New Endpoint |
|-------------|--------------|
| `GET /api/watchlists` | `GET /api/favorites` |
| `POST /api/watchlists/:id/items` | `POST /api/favorites` |
| `DELETE /api/watchlists/:id/items/:itemId` | `DELETE /api/favorites/:symbol` |

## Support

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs: `npm run dev`
2. Verify database: `npm run db:studio`
3. Check API docs: `/docs/api-favorites.md`

## License
MIT