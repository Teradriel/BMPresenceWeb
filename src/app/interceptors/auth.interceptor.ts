import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';

/**
 * Interceptor HTTP para agregar el token de autenticación a las peticiones.
 * 
 * PREVENCIÓN DE LOOPS INFINITOS:
 * - Excluye las peticiones de autenticación (/auth/*) para evitar loops
 * - Usa un contexto token para marcar peticiones que no deben ser interceptadas
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // **PROTECCIÓN 1**: Excluir peticiones de autenticación para evitar loops infinitos
  if (isAuthRequest(req)) {
    return next(req);
  }

  // **PROTECCIÓN 2**: Verificar si la petición tiene el contexto para skip del interceptor
  if (req.context.get(SKIP_AUTH_INTERCEPTOR)) {
    return next(req);
  }

  // Obtener el token del localStorage
  const token = localStorage.getItem('bmpresence_token');

  // Si no hay token, continuar sin modificar la petición
  if (!token) {
    return next(req);
  }

  // Clonar la petición y agregar el header de autorización
  const clonedReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(clonedReq);
};

/**
 * Verifica si una petición es una petición de autenticación
 * que no debe pasar por el interceptor para evitar loops infinitos
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
 * Context token para marcar peticiones que deben omitir el interceptor
 */
import { HttpContextToken } from '@angular/common/http';

export const SKIP_AUTH_INTERCEPTOR = new HttpContextToken<boolean>(() => false);
