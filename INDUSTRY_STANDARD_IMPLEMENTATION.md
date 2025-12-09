# Industry Standard Device Tracking Implementation

## Overview

This implementation uses **httpOnly cookies** for device tracking, which is the industry standard approach used by banks, Google, Microsoft, and other major services.

## Key Features

### ✅ httpOnly Cookies (Server-Side)
- Device tokens are stored in **httpOnly cookies** that cannot be accessed by JavaScript
- Cookies are automatically sent with every request
- Cannot be cleared by JavaScript (only by user clearing browser data)
- Persist across browser sessions until expiration

### ✅ Secure Token Generation
- Server-side token generation using `crypto.randomBytes(32)`
- Tokens are cryptographically secure and unique
- Stored in database for validation

### ✅ Automatic Detection
- No client-side code needed to check device status
- Backend automatically checks for device token cookie
- If cookie is missing → new device/browser → OTP required

## How It Works

### 1. First Login / New Device
```
User logs in → No device token cookie → OTP required → 
OTP verified → Server generates token → 
httpOnly cookie set → Device stored in database
```

### 2. Subsequent Logins (Same Browser)
```
User logs in → Device token cookie exists → 
Backend validates token in database → 
Token valid → No OTP required → Login successful
```

### 3. New Browser / Cleared Data
```
User logs in → No device token cookie (cleared) → 
OTP required → OTP verified → New token generated → 
New cookie set → New device stored
```

## Security Benefits

1. **Cannot be bypassed by JavaScript**: httpOnly cookies are not accessible to client-side code
2. **Survives localStorage clearing**: Cookies are separate from localStorage
3. **Automatic validation**: Backend validates token on every request
4. **CSRF protection**: Uses `sameSite: 'strict'` cookie attribute
5. **HTTPS in production**: `secure: true` ensures cookies only sent over HTTPS

## Cookie Configuration

```javascript
{
    httpOnly: true,        // Cannot be accessed by JavaScript
    secure: true,          // HTTPS only in production
    sameSite: 'strict',   // CSRF protection
    maxAge: 365 days,     // 1 year expiration
    path: '/'             // Available site-wide
}
```

## Database Schema

The `TrustedDevices` table stores:
- `DeviceIdentifier`: The device token (32-byte hex string)
- `UserID`: Foreign key to User table
- `IsTrusted`: Boolean flag
- `TrustedAt`: Timestamp when device was first trusted
- `LastUsedAt`: Timestamp of last login from this device

## Testing

### Test Case 1: Normal Login (Trusted Device)
1. Login with OTP → Device token cookie set
2. Logout
3. Login again → **No OTP required** ✅

### Test Case 2: Clear Browser Data
1. Login with OTP → Device token cookie set
2. Clear browser cache/cookies/history
3. Login again → **OTP required** ✅

### Test Case 3: Private/Incognito Window
1. Login in normal window with OTP
2. Open private/incognito window
3. Login → **OTP required** ✅

### Test Case 4: Different Browser
1. Login in Chrome with OTP
2. Login in Firefox → **OTP required** ✅

## Why This is Industry Standard

1. **Used by major services**: Banks, Google, Microsoft all use httpOnly cookies for device tracking
2. **Security**: Cannot be manipulated by client-side JavaScript
3. **Reliability**: Persists across sessions and page reloads
4. **Privacy**: Tokens are opaque and don't contain user information
5. **Performance**: Automatic cookie sending, no extra API calls needed

## Migration Notes

- Old implementation used localStorage-based `deviceId`
- New implementation uses server-generated tokens in httpOnly cookies
- Old trusted devices in database will need re-verification (by design)
- Frontend can still send device fingerprint for logging/reference, but it's not required

## API Changes

### `POST /auth/check-first-login`
- **Before**: Required `deviceId` in request body
- **Now**: Automatically reads device token from httpOnly cookie
- **Backward compatible**: Still accepts deviceId in body (for logging)

### `POST /auth/verify-otp`
- **Before**: Stored `deviceId` from request body
- **Now**: Generates server-side token and sets httpOnly cookie
- **Backward compatible**: Still accepts deviceId in body (for DeviceInfo field)


