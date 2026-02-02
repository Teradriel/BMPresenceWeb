import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';

/**
 * HTTP Interceptor to add authentication token to requests.
 * 
 * INFINITE LOOP PREVENTION:
 * - Excludes authentication requests (/auth/*) to avoid loops
 * - Uses a context token to mark requests that should not be intercepted
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // **PROTECTION 1**: Exclude authentication requests to avoid infinite loops
  if (isAuthRequest(req)) {
    return next(req);
  }

  // **PROTECTION 2**: Check if the request has context to skip the interceptor
  if (req.context.get(SKIP_AUTH_INTERCEPTOR)) {
    return next(req);
  }

  // Get token from localStorage
  const token = localStorage.getItem('bmpresence_token');

  // If no token, continue without modifying the request
  if (!token) {
    return next(req);
  }

  // Clone the request and add authorization header
  const clonedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(clonedReq);
};

/**
 * Checks if a request is an authentication request
 * that should not go through the interceptor to avoid infinite loops
 */
function isAuthRequest(req: HttpRequest<any>): boolean {
  const authEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/restore-session',
    '/auth/renew-token',
    '/auth/change-password'
  ];

  return authEndpoints.some(endpoint => req.url.includes(endpoint));
}

/**
 * Context token to mark requests that should skip the interceptor
 */
import { HttpContextToken } from '@angular/common/http';

export const SKIP_AUTH_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
