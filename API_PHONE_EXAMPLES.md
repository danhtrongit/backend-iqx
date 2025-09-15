# Phone Authentication API Examples

## Register with Phone Number

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "password123",
    "phoneNumber": "0901234567",
    "phoneCountryCode": "+84",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

Response:
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "username": "testuser",
  "phoneNumber": "0901234567",
  "phoneCountryCode": "+84",
  "isPhoneVerified": false,
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "isEmailVerified": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Login with Phone Number

```bash
curl -X POST http://localhost:3000/api/auth/login/phone \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "0901234567",
    "password": "password123"
  }'
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "username": "testuser",
    "phoneNumber": "0901234567",
    "phoneCountryCode": "+84",
    "isPhoneVerified": false,
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "isEmailVerified": false
  }
}
```

## Send Phone Verification Code

```bash
curl -X POST http://localhost:3000/api/auth/phone/verify/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response (Development Mode):
```json
{
  "message": "Verification code sent to your phone",
  "success": true,
  "code": "123456"  // Only shown in development mode for testing
}
```

Response (Production Mode):
```json
{
  "message": "Verification code sent to your phone",
  "success": true
}
```

## Verify Phone Number

```bash
curl -X POST http://localhost:3000/api/auth/phone/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "code": "123456"
  }'
```

Response:
```json
{
  "message": "Phone number verified successfully",
  "success": true
}
```

## Update Phone Number

```bash
curl -X PUT http://localhost:3000/api/auth/phone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "phoneNumber": "0987654321",
    "phoneCountryCode": "+84"
  }'
```

Response:
```json
{
  "message": "Phone number updated successfully. Please verify your new phone number.",
  "success": true
}
```

## Get Current User (with Phone Info)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "username": "testuser",
  "phoneNumber": "0901234567",
  "phoneCountryCode": "+84",
  "isPhoneVerified": true,
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "isEmailVerified": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Phone Number Formats Supported

The API accepts phone numbers in various formats:
- Local format: `0901234567`
- International format: `+84901234567`
- With spaces: `090 123 4567`
- With dashes: `090-123-4567`
- With parentheses: `(090) 123-4567`

## Error Responses

### Phone Number Already Registered
```json
{
  "error": "Conflict",
  "message": "Phone number already registered"
}
```

### Invalid Phone Number Format
```json
{
  "error": "Validation Error",
  "message": "Invalid request data",
  "details": [
    {
      "code": "invalid_string",
      "message": "Invalid phone number format",
      "path": ["phoneNumber"]
    }
  ]
}
```

### Invalid Verification Code
```json
{
  "error": "Verification Failed",
  "message": "Invalid verification code"
}
```

### Verification Code Expired
```json
{
  "error": "Verification Failed",
  "message": "Verification code expired"
}
```

## Notes

1. **Phone Verification**: In production, the verification code would be sent via SMS. In development mode, the code is returned in the API response for testing purposes.

2. **Phone Number Uniqueness**: Each phone number can only be associated with one account.

3. **Verification Code Expiry**: Verification codes expire after 10 minutes.

4. **Phone Country Code**: The country code is optional but recommended for international number support.

5. **Security**: Phone numbers are indexed in the database for fast lookups during login.

6. **Phone Login**: Users can log in with either email/password or phone/password combinations.