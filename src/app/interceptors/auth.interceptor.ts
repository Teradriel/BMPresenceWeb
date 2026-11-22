import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

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

  const injector = inject(Injector);
  const withToken = (t: string) => req.clone({ setHeaders: { Authorization: `Bearer ${t}` } });

  return next(withToken(token)).pipe(
    catchError((error) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      // 401 a metà sessione: un solo tentativo di rinnovo, poi si ripete la richiesta; se fallisce, login
      const auth = injector.get(AuthService);
      return from(auth.renewToken()).pipe(
        switchMap((ok) => {
          const fresh = localStorage.getItem('bmpresence_token');
          if (ok && fresh && fresh !== token) return next(withToken(fresh));
          auth.clearSession();
          void injector.get(Router).navigate(['/login'], { queryParams: { expired: '1' } });
          return throwError(() => error);
        })
      );
    })
  );
};

/**
 * Checks if a request is an authentication request
 * that should not go through the interceptor to avoid infinite loops
 */
function isAuthRequest(req: HttpRequest<any>): boolean {
  const authEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/restore-session',
    '/auth/renew-token',
    '/auth/validate-token'
  ];

  return authEndpoints.some(endpoint => req.url.includes(endpoint));
}

/**
 * Context token to mark requests that should skip the interceptor
 */
import { HttpContextToken } from '@angular/common/http';

export const SKIP_AUTH_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
