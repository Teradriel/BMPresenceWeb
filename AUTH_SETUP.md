# Authentication System - BMPresence

## Overview

Authentication system implemented for the BMPresence Web application. It includes login, logout, route protection, and session persistence.

## Files Created

### 1. Authentication Service

**Location:** `src/app/services/auth.service.ts`

The service provides the following features:

- Login with username and password
- Logout
- Authentication state checks
- Persistent session storage (localStorage)
- Current user observable

#### Main methods:

```typescript
login(username: string, password: string): Promise<void>
logout(): void
isAuthenticated: boolean
currentUserValue: User | null
getAuthToken(): string | null
```

### 2. Route Guards

**Location:** `src/app/guards/auth.guard.ts`

Two guards were implemented:

- **authGuard**: Protects routes that require authentication
  - If the user is not authenticated, it redirects to `/login`
  - It stores the requested URL to redirect after login

- **loginGuard**: Prevents access to login if already authenticated
  - If the user is authenticated, it redirects to `/main`

### 3. Protected Routes

**Location:** `src/app/app.routes.ts`

Configured routes:

- `/login` - Only for non-authenticated users (loginGuard)
- `/main` - Requires authentication (authGuard)
- `/user` - Requires authentication (authGuard)
- `/about` - Requires authentication (authGuard)
- `/privacy-policy` - Requires authentication (authGuard)
- `/terms-of-service` - Requires authentication (authGuard)

## Usage

### Login

The login component is already configured to use the service:

```typescript
await this.authService.login(username, password);
```

### Logout

Logout button is available on the main page:

```typescript
this.authService.logout();
```

### Check Authentication

```typescript
if (this.authService.isAuthenticated) {
  // User authenticated
}
```

### Get Current User

```typescript
const user = this.authService.currentUserValue;
console.log(user.username);
```

### Subscribe to Auth Changes

```typescript
this.authService.currentUser.subscribe((user) => {
  if (user) {
    console.log("User logged in:");
  } else {
    console.log("User not logged in");
  }
});
```

## Real API Integration

The current service uses a mock. To integrate with a real API:

1. **Replace the login method:**

```typescript
async login(username: string, password: string): Promise<void> {
  const response = await fetch('YOUR_API_URL/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Invalid username or password');
  }

  const data = await response.json();
  this.setToken(data.token);
  this.setUser(data.user);
  this.currentUserSubject.next(data.user);
}
```

2. **Create an HTTP interceptor to add the token:**

```typescript
// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAuthToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req);
};
```

3. **Register the interceptor in app.config.ts:**

```typescript
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { authInterceptor } from "./interceptors/auth.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    // ... other providers
  ],
};
```

## Security

- Credentials are stored in localStorage
- Token is automatically included in HTTP requests (when interceptor is configured)
- Routes are protected by guards
- Session persists across page reloads

## Next Steps

1. Implement registration page
2. Add password recovery
3. Implement refresh token
4. Handle token expiration
5. Implement user roles and permissions
6. Add email verification
