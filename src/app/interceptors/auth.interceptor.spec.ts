import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { clearSession, fakeJwt, seedSession, testProviders, tick } from '../testing';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let router: Router;

  const setup = async (token: string | null) => {
    seedSession(token);
    TestBed.configureTestingModule({ providers: testProviders });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    TestBed.inject(AuthService);
    await tick(); // l'avvio di AuthService fa la sua chiamata dopo il primo await
  };

  afterEach(() => clearSession());

  it('aggiunge il Bearer alle chiamate normali', async () => {
    const token = fakeJwt(5 * 86400);
    await setup(token);
    http.expectOne((r) => r.url.endsWith('/auth/restore-session')).flush({ success: true, user: {} });
    client.get('/api/resources/active').subscribe();
    expect(http.expectOne('/api/resources/active').request.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('non aggiunge il Bearer a login e registrazione', async () => {
    await setup(fakeJwt(5 * 86400));
    http.expectOne((r) => r.url.endsWith('/auth/restore-session')).flush({ success: true, user: {} });
    client.post('/api/auth/login', {}).subscribe();
    expect(http.expectOne('/api/auth/login').request.headers.has('Authorization')).toBeFalse();
  });

  it('aggiunge il Bearer anche a logout e cambio password (il server li vuole autenticati)', async () => {
    await setup(fakeJwt(5 * 86400));
    http.expectOne((r) => r.url.endsWith('/auth/restore-session')).flush({ success: true, user: {} });
    client.post('/api/auth/change-password', {}).subscribe();
    expect(http.expectOne('/api/auth/change-password').request.headers.has('Authorization')).toBeTrue();
  });

  it('401 a metà sessione: un rinnovo e la richiesta si ripete col token nuovo', async () => {
    const old = fakeJwt(5 * 86400);
    await setup(old);
    http.expectOne((r) => r.url.endsWith('/auth/restore-session')).flush({ success: true, user: {} });
    let result: unknown;
    client.get('/api/appointments/occurrences').subscribe((r) => (result = r));
    http.expectOne('/api/appointments/occurrences').flush({}, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();
    const fresh = fakeJwt(7 * 86400);
    http.expectOne((r) => r.url.endsWith('/auth/renew-token')).flush({ success: true, token: fresh });
    await new Promise((r) => setTimeout(r));
    const retry = http.expectOne('/api/appointments/occurrences');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${fresh}`);
    retry.flush([{ ok: true }]);
    expect(result).toEqual([{ ok: true }]);
  });

  it('401 e rinnovo rifiutato: sessione azzerata e ritorno al login', async () => {
    await setup(fakeJwt(5 * 86400));
    http.expectOne((r) => r.url.endsWith('/auth/restore-session')).flush({ success: true, user: {} });
    let failed = false;
    client.get('/api/users/colleagues').subscribe({ error: () => (failed = true) });
    http.expectOne('/api/users/colleagues').flush({}, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();
    http.expectOne((r) => r.url.endsWith('/auth/renew-token')).flush({}, { status: 401, statusText: 'Unauthorized' });
    await new Promise((r) => setTimeout(r));
    expect(failed).toBeTrue();
    expect(localStorage.getItem('bmpresence_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expired: '1' } });
  });

  it('un errore diverso da 401 passa senza rinnovi', async () => {
    await setup(fakeJwt(5 * 86400));
    http.expectOne((r) => r.url.endsWith('/auth/restore-session')).flush({ success: true, user: {} });
    let status = 0;
    client.get('/api/users').subscribe({ error: (e) => (status = e.status) });
    http.expectOne('/api/users').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
    http.expectNone((r) => r.url.endsWith('/auth/renew-token'));
  });
});
