# Authentication Integration Plan - Mobile App with Backend

## Overview
Connect the Ionic/Angular mobile app (`magic`) authentication (login/register) with the backend API, and implement block/unblock user functionality that can be controlled from the admin side.

## Current State Analysis

### Frontend (magic app)
- **Login Page**: Uses email/password form (needs to change to mobile)
- **Register Page**: Uses email/password form (needs to change to mobile)
- **Current Implementation**: Mock authentication with setTimeout
- **No Auth Service**: Missing authentication service
- **No Token Storage**: No mechanism to store JWT tokens
- **No HTTP Interceptor**: No automatic token injection
- **No Route Guards**: All routes are publicly accessible
- **Blocked Page**: Exists but not integrated with actual blocked status

### Backend (Magic-Formula-Backend)
- **Auth Endpoint**: `POST /api/auth/login` - Uses mobile number (not email/password)
- **Login Logic**: Handles both login and registration (creates user if doesn't exist)
- **Response**: Returns JWT `accessToken` and user data
- **Block Check**: Returns 403 if user is blocked
- **Auth Middleware**: Checks token validity and blocked status on protected routes
- **Admin Endpoints**: 
  - `PATCH /api/admin/block/:id` - Block user
  - `PATCH /api/admin/unblock/:id` - Unblock user

## Key Mismatch
**Frontend uses email/password, but backend uses mobile number for authentication.**

## Implementation Plan

### Phase 1: Create Authentication Service
**File**: `magic/src/app/services/auth.service.ts`

Create a comprehensive auth service with:
- `login(mobile, fullName?, email?, whatsapp?, firebaseToken?)` - Call backend login endpoint
- `logout()` - Clear token and user data
- `getToken()` - Retrieve stored token
- `getCurrentUser()` - Get current user data
- `isAuthenticated()` - Check if user is logged in
- `isBlocked()` - Check if current user is blocked
- Token storage methods (using Ionic Storage or localStorage)

**Response Handling**:
- Store `accessToken` securely
- Store user data
- Handle `isBlocked: true` response (redirect to blocked page)
- Handle `isRegistered: false` (new user registration flow)

### Phase 2: Create Token Storage Service
**File**: `magic/src/app/services/storage.service.ts` (if using Ionic Storage)

Or use localStorage directly in auth service:
- Store token: `localStorage.setItem('auth_token', token)`
- Store user: `localStorage.setItem('user_data', JSON.stringify(user))`
- Retrieve and clear methods

**Considerations**:
- Use Ionic Storage for better security on mobile devices
- Or use Capacitor Preferences for native storage
- Handle token expiration

### Phase 3: Create HTTP Interceptor
**File**: `magic/src/app/interceptors/auth.interceptor.ts`

Intercept HTTP requests to:
- Add `Authorization: Bearer {token}` header to all requests
- Handle 401 responses (token expired/invalid) - redirect to login
- Handle 403 responses (blocked user) - redirect to blocked page
- Skip interceptor for login/register endpoints

**Register in app.module.ts**:
```typescript
providers: [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true
  }
]
```

### Phase 4: Create Auth Guard
**File**: `magic/src/app/guards/auth.guard.ts`

Protect routes that require authentication:
- Check if user is authenticated
- Check if user is blocked
- Redirect to login if not authenticated
- Redirect to blocked page if blocked
- Allow access if authenticated and not blocked

**Apply to routes**:
- `/folder/*` - Protected
- `/profile` - Protected
- `/subscriptions` - Protected
- `/notifications` - Protected
- `/login` - Redirect to home if already logged in
- `/register` - Redirect to home if already logged in

### Phase 5: Update Login Page
**File**: `magic/src/app/login/login.page.ts`

Changes needed:
1. **Change form fields**: Replace email/password with mobile number
2. **Optional fields**: Add fullName, email, whatsapp (for registration)
3. **Call auth service**: Replace mock setTimeout with real API call
4. **Handle responses**:
   - Success: Store token, navigate to home
   - Blocked: Navigate to blocked page
   - Error: Show error message
5. **Loading states**: Show spinner during API call
6. **Error handling**: Display user-friendly error messages

**Form Structure**:
```typescript
loginForm = this.formBuilder.group({
  mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
  fullName: [''], // Optional
  email: [''], // Optional
  whatsapp: [''], // Optional
});
```

### Phase 6: Update Register Page
**File**: `magic/src/app/register/register.page.ts`

Changes needed:
1. **Change form fields**: Use mobile number as primary identifier
2. **Keep password field**: For future use (if backend adds password auth)
3. **Call auth service**: Use same login endpoint (backend handles registration)
4. **Handle new user flow**: Show welcome message for first-time users
5. **Error handling**: Handle duplicate mobile numbers, validation errors

**Note**: Backend login endpoint handles both login and registration based on whether user exists.

### Phase 7: Update Blocked Page
**File**: `magic/src/app/blocked/blocked.page.ts`

Changes needed:
1. **Check blocked status**: On page load, verify user is actually blocked
2. **Auto-redirect**: If not blocked, redirect to home
3. **Contact admin**: Add button/link to contact admin
4. **Logout option**: Allow user to logout
5. **Periodic check**: Optionally check if user is unblocked (polling or websocket)

### Phase 8: App Initialization Check
**File**: `magic/src/app/app.component.ts` or create `app-init.service.ts`

On app startup:
1. Check if token exists in storage
2. Validate token with backend (optional - or validate on first API call)
3. Check if user is blocked
4. Redirect accordingly:
   - No token → Login page
   - Token + Blocked → Blocked page
   - Token + Not blocked → Home page

### Phase 9: Update Environment Configuration
**File**: `magic/src/environments/environment.ts`

Ensure API URL is correctly configured:
```typescript
export const environment = {
  production: false,
  API_URL: 'http://localhost:5000' // Update for production
};
```

### Phase 10: Error Handling & User Feedback
- **Toast Messages**: Use Ionic ToastController for success/error messages
- **Loading Indicators**: Show spinners during API calls
- **Network Error Handling**: Handle offline scenarios
- **Token Expiration**: Handle expired tokens gracefully
- **Blocked User Messages**: Clear messaging about account status

## Data Flow

### Login Flow
```
User enters mobile → Login Page → Auth Service → Backend API
                                                      ↓
                                    Success → Store Token → Navigate Home
                                    Blocked → Navigate Blocked Page
                                    Error → Show Error Message
```

### Request Flow (with Interceptor)
```
Component → HTTP Request → Auth Interceptor → Add Bearer Token → Backend
                                                      ↓
                                    Response → Check Status
                                            401 → Redirect Login
                                            403 → Redirect Blocked
                                            200 → Return Data
```

### Blocked User Flow
```
Admin blocks user → Backend sets isBlocked: true
                              ↓
User makes request → Auth Middleware checks isBlocked
                              ↓
                    Returns 403 → Interceptor catches → Redirect to Blocked Page
```

## Backend Endpoints Reference

### Authentication
- **POST** `/api/auth/login`
  - Body: `{ mobile, fullName?, email?, whatsapp?, profilePic?, firebaseToken?, activePlan?, planExpiry? }`
  - Response: `{ message, isRegistered, isBlocked, accessToken, user }`
  - Status: 200 (success), 403 (blocked), 400 (validation error), 500 (server error)

### Admin (for reference)
- **PATCH** `/api/admin/block/:id` - Block user (requires admin auth)
- **PATCH** `/api/admin/unblock/:id` - Unblock user (requires admin auth)

## Files to Create/Modify

### New Files
1. `magic/src/app/services/auth.service.ts`
2. `magic/src/app/services/storage.service.ts` (optional, if using Ionic Storage)
3. `magic/src/app/interceptors/auth.interceptor.ts`
4. `magic/src/app/guards/auth.guard.ts`

### Modified Files
1. `magic/src/app/login/login.page.ts`
2. `magic/src/app/login/login.page.html`
3. `magic/src/app/register/register.page.ts`
4. `magic/src/app/register/register.page.html`
5. `magic/src/app/blocked/blocked.page.ts`
6. `magic/src/app/app-routing.module.ts` (add guards)
7. `magic/src/app/app.module.ts` (register interceptor)
8. `magic/src/app/app.component.ts` (initialization check)
9. `magic/src/environments/environment.ts` (verify API URL)

## Dependencies to Install

### Ionic Storage (Recommended for mobile)
```bash
npm install @ionic/storage-angular
```

### Or use Capacitor Preferences (Alternative)
```bash
npm install @capacitor/preferences
```

## Testing Checklist

- [ ] Login with existing user (mobile number)
- [ ] Register new user (mobile number)
- [ ] Login with blocked user (should redirect to blocked page)
- [ ] Token is stored correctly
- [ ] Token is added to API requests automatically
- [ ] Protected routes require authentication
- [ ] Unauthenticated users redirected to login
- [ ] Blocked users redirected to blocked page
- [ ] Logout clears token and redirects to login
- [ ] App initialization checks authentication status
- [ ] Error messages display correctly
- [ ] Network errors handled gracefully
- [ ] Token expiration handled (401 response)

## Security Considerations

1. **Token Storage**: Use secure storage (Ionic Storage or Capacitor Preferences)
2. **Token Expiration**: Handle expired tokens (backend should set expiration)
3. **HTTPS**: Use HTTPS in production for API calls
4. **Input Validation**: Validate mobile number format
5. **Error Messages**: Don't expose sensitive information in error messages
6. **Blocked Status**: Always check blocked status on app initialization

## Future Enhancements

1. **Token Refresh**: Implement refresh token mechanism if backend supports it
2. **Biometric Auth**: Add fingerprint/face ID authentication
3. **Remember Me**: Option to stay logged in
4. **Auto-logout**: Logout after inactivity period
5. **Push Notifications**: Notify user when account is blocked/unblocked
6. **Password Auth**: If backend adds password authentication later

## Notes

- Backend uses mobile number as primary identifier (not email/password)
- Backend login endpoint handles both login and registration
- Blocked status is checked on every authenticated request
- Admin can block/unblock users from admin panel
- Blocked users receive 403 response on all protected routes
- Frontend needs to handle blocked status gracefully

