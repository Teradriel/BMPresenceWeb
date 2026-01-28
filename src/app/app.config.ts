import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Configurar HttpClient con el interceptor de autenticación
    provideHttpClient(withInterceptors([authInterceptor])),
    // TokenRenewalService ya no se inicializa automáticamente aquí
    // Se gestiona manualmente desde AuthService
  ]
};
