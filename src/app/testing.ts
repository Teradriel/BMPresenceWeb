import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './interceptors/auth.interceptor';

/** Provider comuni ai test: HttpClient finto (con l'interceptor vero) e router vuoto. */
export const testProviders: (Provider | EnvironmentProviders)[] = [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])];

const b64 = (o: unknown): string => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

/** JWT di prova con scadenza fra `seconds` secondi (negativo = già scaduto). */
export const fakeJwt = (seconds: number): string => `${b64({ alg: 'HS256' })}.${b64({ sub: '1', exp: Math.floor(Date.now() / 1000) + seconds })}.sig`;

export const ME = { id: '1', username: 'luca.moretti', name: 'Luca', lastName: 'Moretti', email: 'luca.moretti@bluemobility.it', isAdmin: true, active: true };

/** Sessione salvata nel browser come dopo un login. Senza token resta solo l'utente (nessuna chiamata all'avvio). */
export function seedSession(token: string | null = null, user: object = ME): void {
  localStorage.clear();
  localStorage.setItem('bmpresence_user', JSON.stringify(user));
  if (token) localStorage.setItem('bmpresence_token', token);
}

export const clearSession = (): void => localStorage.clear();

/** Lascia girare le promesse e i timer pendenti (le chiamate partono dopo il primo await). */
export const tick = (): Promise<void> => new Promise((r) => setTimeout(r));
