# Role-Based Access Control (RBAC) Documentation

## 📋 Overview

This backend implements a comprehensive Role-Based Access Control system with three user roles: **user**, **author**, and **admin**. Each role has specific permissions and access levels following a hierarchical structure.

## 👥 User Roles

### Role Hierarchy
```
admin (highest privileges)
  ↑
author (moderate privileges)
  ↑
user (basic privileges)
```

### 1. User Role
- **Default role** for new registrations
- **Permissions:**
  - Access own profile
  - Update own profile
  - Use basic authenticated endpoints
  - Access public content

### 2. Author Role
- **Mid-level privileges**
- **Permissions:**
  - All User permissions
  - Create and manage content
  - Access author-specific features
  - View author analytics

### 3. Admin Role
- **Highest privileges**
- **Permissions:**
  - All Author permissions
  - Full user management (CRUD)
  - Change user roles
  - Access system statistics
  - Activate/deactivate accounts
  - Access all protected resources

## 🔐 Implementation Details

### JWT Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "username": "username",
  "role": "user|author|admin",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Authorization Middleware

#### 1. Basic Authentication
```typescript
preHandler: app.authenticate
```
Verifies JWT token and ensures user is authenticated.

#### 2. Role-Specific Check
```typescript
preHandler: [app.authenticate, hasRole('admin')]
```
Checks for specific role(s).

#### 3. Multiple Roles
```typescript
preHandler: [app.authenticate, hasRole(['author', 'admin'])]
```
Allows multiple roles.

#### 4. Minimum Role (Hierarchy)
```typescript
preHandler: [app.authenticate, hasMinimumRole('author')]
```
Allows specified role and any higher roles.

## 📡 API Endpoints by Role

### Public Endpoints (No Auth Required)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/login/phone`
- `GET /health`

### User Endpoints (Any Authenticated User)
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `PUT /api/auth/phone`
- `POST /api/auth/phone/verify/send`
- `POST /api/auth/phone/verify`
- `GET /api/protected/user-content`

### Author Endpoints
- `GET /api/protected/author-content`
- `GET /api/protected/author-admin-content`
- `GET /api/protected/premium-content`

### Admin Endpoints
- **User Management:**
  - `GET /api/admin/users` - List all users
  - `GET /api/admin/users/:userId` - Get user details
  - `POST /api/admin/users` - Create user
  - `PUT /api/admin/users/:userId` - Update user
  - `DELETE /api/admin/users/:userId` - Delete user
  - `PATCH /api/admin/users/:userId/role` - Change role
  - `PATCH /api/admin/users/:userId/toggle-active` - Toggle active status
  - `GET /api/admin/stats` - System statistics

- **Admin-Only Content:**
  - `GET /api/protected/admin-content`
  - All author endpoints

## 🛠️ Usage Examples

### 1. Register with Default Role (user)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "username": "newuser",
    "password": "password123"
  }'

# Response includes role: "user"
```

### 2. Admin Creating User with Specific Role
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "email": "author@example.com",
    "username": "author1",
    "password": "password123",
    "role": "author"
  }'
```

### 3. Change User Role (Admin Only)
```bash
curl -X PATCH http://localhost:3000/api/admin/users/USER_ID/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "role": "author"
  }'
```

### 4. Check Permission Dynamically
```bash
curl -X POST http://localhost:3000/api/protected/check-permission \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "requiredRole": "admin"
  }'

# Response:
{
  "hasPermission": false,
  "userRole": "user",
  "requiredRole": "admin"
}
```

### 5. Access Protected Content by Role

#### User Accessing User Content (✅ Allowed)
```bash
curl -X GET http://localhost:3000/api/protected/user-content \
  -H "Authorization: Bearer USER_TOKEN"
```

#### User Accessing Admin Content (❌ Forbidden)
```bash
curl -X GET http://localhost:3000/api/protected/admin-content \
  -H "Authorization: Bearer USER_TOKEN"

# Response: 403 Forbidden
{
  "error": "Forbidden",
  "message": "Access denied. Required role(s): admin"
}
```

## 🔄 Role Management Workflow

### Promoting User to Author
1. Admin authenticates
2. Admin calls `PATCH /api/admin/users/:userId/role`
3. User's role is updated to "author"
4. User must re-login or refresh token to get new role in JWT

### Deactivating User (Preserve Role)
1. Admin calls `PATCH /api/admin/users/:userId/toggle-active`
2. User's `isActive` becomes false
3. User cannot login but role is preserved
4. Reactivation restores access with same role

## 🛡️ Security Considerations

### Role Protection
- Roles are stored in database and JWT tokens
- Token role cannot be modified client-side
- Each request validates role from database
- Expired tokens are rejected

### Admin Safety
- Admins cannot delete themselves
- Admins cannot deactivate themselves
- Last admin protection (optional, implement if needed)

### Token Security
- Role changes require new token
- Blacklisted tokens are checked
- Role verification on each protected request

## 📊 Statistics API

Admin can get role distribution:
```bash
curl -X GET http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Response:
{
  "total": 150,
  "active": 140,
  "inactive": 10,
  "emailVerified": 120,
  "phoneVerified": 80,
  "byRole": {
    "user": 130,
    "author": 15,
    "admin": 5
  },
  "verificationRate": {
    "email": "80.00%",
    "phone": "53.33%"
  }
}
```

## 🎯 Best Practices

### 1. Default to Least Privilege
- New users get "user" role by default
- Elevation requires admin action

### 2. Role Validation
- Always validate role on server-side
- Never trust client-provided role claims

### 3. Audit Trail
- Log role changes (implement if needed)
- Track who changed roles and when

### 4. Regular Review
- Periodically review user roles
- Remove unnecessary elevated privileges

## 🔧 Extending the System

### Adding New Roles
1. Update `userRoleEnum` in `src/db/schema/users.ts`
2. Update `UserRole` type in `src/types/index.ts`
3. Update validation schemas
4. Update role hierarchy in middleware
5. Run database migration

### Adding Permissions
Instead of roles, you could implement granular permissions:
```typescript
// Example permission system
interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete';
}

// Role-permission mapping
const rolePermissions = {
  user: ['profile:read', 'profile:write'],
  author: ['content:read', 'content:write'],
  admin: ['*:*'], // All permissions
};
```

## 🚨 Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Access denied. Required role(s): admin",
  "statusCode": 403
}
```

## 📝 Notes

1. **Role Changes**: Require user to re-authenticate for new JWT
2. **Caching**: Consider caching role checks for performance
3. **Audit Logs**: Implement role change audit logs for compliance
4. **2FA for Admins**: Consider requiring 2FA for admin accounts
5. **Role Expiry**: Consider implementing temporary role elevation