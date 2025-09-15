# Authentication System Documentation

## 📚 Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Authentication Flow](#authentication-flow)
- [Security Features](#security-features)
- [API Endpoints](#api-endpoints)
- [Implementation Details](#implementation-details)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## 🔐 Overview

This backend implements a robust JWT-based authentication system with the following features:

- **Dual Token System**: Access tokens for API requests and refresh tokens for session management
- **Multi-Factor Authentication Support**: Email and phone number authentication
- **Token Blacklisting**: Revoke compromised tokens
- **Session Management**: Track user sessions with IP and user agent
- **Role-Based Access Control (RBAC)**: Three-tier role system (user, author, admin)
- **Phone Verification**: SMS-based phone number verification
- **Security Best Practices**: Bcrypt password hashing, rate limiting, CORS protection

## 🏗️ Architecture

### Token Types

#### 1. Access Token
- **Purpose**: Authenticate API requests
- **Lifetime**: 15 minutes (configurable via `JWT_ACCESS_EXPIRY`)
- **Storage**: Client-side (localStorage/memory)
- **Algorithm**: HS256
- **Secret**: `JWT_SECRET` environment variable

#### 2. Refresh Token
- **Purpose**: Generate new access tokens
- **Lifetime**: 7 days (configurable via `JWT_REFRESH_EXPIRY`)
- **Storage**: HttpOnly cookie + database
- **Algorithm**: HS256
- **Secret**: `JWT_REFRESH_SECRET` environment variable

### Database Schema

#### Users Table
```sql
- id: UUID (Primary Key)
- email: String (Unique, Required)
- username: String (Unique, Required)
- password: String (Bcrypt Hashed)
- role: Enum ['user', 'author', 'admin'] (Default: 'user')
- phoneNumber: String (Unique, Optional)
- phoneCountryCode: String (Optional)
- isPhoneVerified: Boolean (Default: false)
- phoneVerificationCode: String (6 digits)
- phoneVerificationExpires: Timestamp
- firstName: String (Optional)
- lastName: String (Optional)
- isActive: Boolean (Default: true)
- isEmailVerified: Boolean (Default: false)
- lastLogin: Timestamp
- createdAt: Timestamp
- updatedAt: Timestamp
```

#### Refresh Tokens Table
```sql
- id: UUID (Primary Key)
- token: String (JWT Token)
- userId: UUID (Foreign Key -> Users)
- userAgent: String (Optional)
- ipAddress: String (Optional)
- expiresAt: Timestamp
- createdAt: Timestamp
```

#### Blacklisted Tokens Table
```sql
- id: UUID (Primary Key)
- token: String (JWT Token)
- tokenType: Enum ['access', 'refresh']
- reason: String
- expiresAt: Timestamp
- blacklistedAt: Timestamp
```

## 🔄 Authentication Flow

### Registration Flow
```mermaid
1. User submits registration form
2. Validate input data (Zod schema)
3. Check for existing email/username/phone
4. Hash password with bcrypt
5. Create user record in database
6. Return user data (without password)
```

### Login Flow
```mermaid
1. User submits credentials (email/phone + password)
2. Validate credentials
3. Verify password with bcrypt
4. Check if account is active
5. Generate access token (15 min)
6. Create refresh token record in DB
7. Generate refresh token (7 days)
8. Set refresh token as HttpOnly cookie
9. Update last login timestamp
10. Return access token + user data
```

### Token Refresh Flow
```mermaid
1. Client sends refresh token
2. Check if token is blacklisted
3. Validate refresh token in database
4. Check token expiration
5. Verify user is still active
6. Generate new access token
7. Rotate refresh token (optional)
8. Return new tokens
```

### Logout Flow
```mermaid
1. Client sends access/refresh token
2. Add token to blacklist
3. Delete refresh token from database
4. Clear refresh token cookie
5. Return success response
```

## 🛡️ Security Features

### Password Security
- **Hashing**: Bcrypt with 10 salt rounds
- **Minimum Length**: 8 characters
- **Validation**: Zod schema enforcement

### Token Security
- **Signed JWTs**: HS256 algorithm
- **Short-lived Access Tokens**: 15 minutes default
- **Token Rotation**: Optional refresh token rotation on use
- **Blacklisting**: Revoke compromised tokens
- **Secure Cookies**: HttpOnly, Secure, SameSite attributes

### Request Security
- **Rate Limiting**: 100 requests per minute (configurable)
- **CORS Protection**: Configurable allowed origins
- **Helmet Headers**: Security headers via @fastify/helmet
- **Body Size Limit**: 10MB max request size
- **SQL Injection Protection**: Parameterized queries via Drizzle ORM

### Session Tracking
- **IP Address**: Track request origin
- **User Agent**: Track client device/browser
- **Automatic Cleanup**: Expired tokens cleaned hourly

## 📡 API Endpoints

### Public Authentication Endpoints

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "phoneNumber": "+1234567890",    // Optional
  "phoneCountryCode": "+1",        // Optional
  "firstName": "John",              // Optional
  "lastName": "Doe"                 // Optional
}

Response: 201 Created
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "role": "user",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "isEmailVerified": false,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Login with Email
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "user",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "isEmailVerified": false
  }
}

Set-Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/api/auth/refresh
```

#### Login with Phone Number
```http
POST /api/auth/login/phone
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "password": "SecurePass123!"
}

Response: 200 OK
// Same as email login response
```

#### Refresh Access Token
```http
POST /api/auth/refresh
Content-Type: application/json
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Optional if not using cookie
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Authentication Endpoints

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response: 200 OK
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "role": "user",
  "phoneNumber": "+1234567890",
  "phoneCountryCode": "+1",
  "isPhoneVerified": true,
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "isEmailVerified": false,
  "lastLogin": "2024-01-01T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "access"  // or "refresh"
}

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

#### Update Phone Number
```http
PUT /api/auth/phone
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "phoneNumber": "+9876543210",
  "phoneCountryCode": "+91"
}

Response: 200 OK
{
  "message": "Phone number updated. Verification code sent.",
  "phoneNumber": "+9876543210",
  "phoneCountryCode": "+91"
}
```

#### Send Phone Verification Code
```http
POST /api/auth/phone/verify/send
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response: 200 OK
{
  "message": "Verification code sent to +9876543210"
}
```

#### Verify Phone Number
```http
POST /api/auth/phone/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "code": "123456"
}

Response: 200 OK
{
  "message": "Phone number verified successfully",
  "isPhoneVerified": true
}
```

## 🔧 Implementation Details

### JWT Payload Structure
```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  username: string;   // Username
  role: 'user' | 'author' | 'admin';  // User role
  iat: number;        // Issued at timestamp
  exp: number;        // Expiration timestamp
  jti?: string;       // JWT ID (for refresh tokens)
}
```

### Authentication Middleware
```typescript
// Basic authentication
app.get('/protected', {
  preHandler: app.authenticate
}, handler);

// Role-based authentication
app.get('/admin', {
  preHandler: [app.authenticate, hasRole('admin')]
}, handler);

// Optional authentication
app.get('/public', {
  preHandler: app.optionalAuthenticate
}, handler);
```

### Password Hashing
```typescript
// Hash password
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### Token Generation
```typescript
// Access token
const accessToken = app.jwt.sign({
  sub: user.id,
  email: user.email,
  username: user.username,
  role: user.role
}, {
  expiresIn: '15m'
});

// Refresh token
const refreshToken = app.jwt.sign({
  sub: user.id,
  jti: tokenId
}, {
  expiresIn: '7d',
  key: refreshSecret
});
```

## 💻 Usage Examples

### Frontend Integration

#### Login Implementation
```javascript
async function login(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',  // Important for cookies
    body: JSON.stringify({ email, password })
  });

  if (response.ok) {
    const data = await response.json();
    // Store access token in memory or localStorage
    localStorage.setItem('accessToken', data.accessToken);
    // Refresh token is automatically stored as HttpOnly cookie
    return data.user;
  }
  
  throw new Error('Login failed');
}
```

#### Making Authenticated Requests
```javascript
async function fetchProtectedData() {
  const accessToken = localStorage.getItem('accessToken');
  
  const response = await fetch('http://localhost:3000/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    // Token expired, try to refresh
    await refreshAccessToken();
    // Retry request
    return fetchProtectedData();
  }

  return response.json();
}
```

#### Token Refresh Implementation
```javascript
async function refreshAccessToken() {
  const response = await fetch('http://localhost:3000/api/auth/refresh', {
    method: 'POST',
    credentials: 'include'  // Send cookies
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  }

  // Refresh failed, redirect to login
  window.location.href = '/login';
}
```

#### Auto-refresh with Axios Interceptor
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true
});

// Request interceptor
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const response = await api.post('/auth/refresh');
        localStorage.setItem('accessToken', response.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Testing with cURL

#### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

#### Access Protected Route
```bash
# Using the access token from login response
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

## ⚠️ Error Handling

### Authentication Errors

| Status Code | Error Type | Description |
|------------|------------|-------------|
| 400 | Validation Error | Invalid request data |
| 401 | Authentication Failed | Invalid credentials |
| 401 | Token Expired | Access token has expired |
| 401 | Token Revoked | Token has been blacklisted |
| 401 | Account Deactivated | User account is not active |
| 403 | Forbidden | Insufficient permissions |
| 409 | Conflict | Email/username already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format
```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "statusCode": 401,
  "details": []  // Optional validation errors
}
```

## 🎯 Best Practices

### Security Best Practices

1. **Environment Variables**
   - Use strong, unique secrets for JWT_SECRET and JWT_REFRESH_SECRET
   - Minimum 32 characters recommended
   - Never commit secrets to version control

2. **Token Storage**
   - Store access tokens in memory when possible
   - If using localStorage, implement XSS protection
   - Never store refresh tokens in localStorage
   - Use HttpOnly cookies for refresh tokens

3. **Token Lifecycle**
   - Keep access tokens short-lived (15-30 minutes)
   - Implement token refresh before expiration
   - Revoke tokens on logout
   - Clean up expired tokens regularly

4. **Password Policy**
   - Enforce minimum password length (8+ characters)
   - Consider implementing password complexity rules
   - Use bcrypt with appropriate salt rounds (10+)
   - Never store plain text passwords

5. **Rate Limiting**
   - Implement rate limiting on authentication endpoints
   - Use stricter limits for sensitive operations
   - Consider implementing account lockout after failed attempts

6. **HTTPS**
   - Always use HTTPS in production
   - Set Secure flag on cookies in production
   - Implement HSTS headers

### Development Best Practices

1. **Error Handling**
   - Don't leak sensitive information in error messages
   - Log security events for monitoring
   - Implement proper error boundaries

2. **Testing**
   - Test authentication flows thoroughly
   - Include edge cases (expired tokens, revoked tokens)
   - Test rate limiting behavior
   - Verify CORS configuration

3. **Monitoring**
   - Monitor failed authentication attempts
   - Track token refresh patterns
   - Alert on suspicious activities
   - Monitor rate limit violations

4. **Documentation**
   - Keep API documentation up-to-date
   - Document security considerations
   - Provide clear integration examples
   - Document error responses

## 🔄 Token Refresh Strategy

### Proactive Refresh
Refresh tokens before they expire to ensure seamless user experience:

```javascript
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

function shouldRefreshToken(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  return expiresAt - now < TOKEN_REFRESH_THRESHOLD;
}

// Check periodically
setInterval(async () => {
  const token = localStorage.getItem('accessToken');
  if (token && shouldRefreshToken(token)) {
    await refreshAccessToken();
  }
}, 60000); // Check every minute
```

### Reactive Refresh
Refresh only when receiving 401 response (shown in axios interceptor example above).

## 📊 Monitoring & Analytics

### Key Metrics to Track

1. **Authentication Metrics**
   - Login success/failure rate
   - Registration rate
   - Average session duration
   - Token refresh frequency

2. **Security Metrics**
   - Failed login attempts per user
   - Blacklisted tokens count
   - Rate limit violations
   - Suspicious IP activities

3. **Performance Metrics**
   - Authentication endpoint response time
   - Database query performance
   - Token generation time
   - Bcrypt hashing time

## 🚀 Performance Optimization

1. **Caching**
   - Cache user data in Redis for faster lookups
   - Cache blacklisted tokens for quick validation
   - Use connection pooling for database

2. **Database Indexes**
   - Index on email, username, phoneNumber
   - Index on refresh token
   - Index on user ID for foreign keys

3. **Async Operations**
   - Use async password hashing
   - Implement background token cleanup
   - Queue email/SMS notifications

## 📝 Changelog

### Version 2.0.0
- Added phone number authentication
- Implemented phone verification system
- Added token blacklisting
- Enhanced session tracking
- Improved error responses
- Added comprehensive RBAC system

## 📚 Additional Resources

- [JWT.io](https://jwt.io/) - JWT debugger and documentation
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Fastify JWT Plugin](https://github.com/fastify/fastify-jwt)
- [Bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)

## 📮 Support

For issues, questions, or improvements, please refer to the project's issue tracker or contact the development team.

---

*Last updated: January 2024*
*Version: 2.0.0*