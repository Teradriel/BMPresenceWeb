import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  await authService.ready;

  if (authService.isAuthenticated) {
    return true;
  }

  // Redirect to login if not authenticated
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const adminGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  await authService.ready;

  if (!authService.isAuthenticated) {
    // Redirect to login if not authenticated
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const currentUser = authService.currentUserValue;
  if (currentUser?.isAdmin) {
    return true;
  }

  // Redirect to main page if not admin
  router.navigate(['/main']);
  return false;
};

export const loginGuard: CanActivateFn = async (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  await authService.ready;

  if (!authService.isAuthenticated) {
    return true;
  }

  // If already authenticated, redirect to main
  router.navigate(['/main']);
  return false;
};
