import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { ME, clearSession, fakeJwt, seedSession, testProviders } from '../testing';

const DAY = 86400;

describe('AuthService', () => {
  let http: HttpTestingController;

  const create = (): AuthService => {
    TestBed.configureTestingModule({ providers: testProviders });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  };

  afterEach(() => clearSession());

  it('tokenExpiry legge exp dal JWT e ignora i token illeggibili', () => {
    const exp = AuthService.tokenExpiry(fakeJwt(3600));
    expect(exp).toBeGreaterThan(Date.now() + 3500 * 1000);
    expect(exp).toBeLessThan(Date.now() + 3700 * 1000);
    expect(AuthService.tokenExpiry('non-un-jwt')).toBeNull();
  });

  it('senza token non fa nessuna chiamata all’avvio', () => {
    seedSession(null);
    create();
    http.expectNone(() => true);
    http.verify();
  });

  it('all’avvio con token: checking resta true finché il server non risponde, poi ready si risolve', async () => {
    seedSession(fakeJwt(5 * DAY));
    const auth = create();
    await Promise.resolve();
    await Promise.resolve();
    expect(auth.checking()).toBeTrue();
    http.expectOne((r) => r.url.endsWith('/auth/restore-session')).flush({ success: true, user: ME });
    await auth.ready;
    expect(auth.checking()).toBeFalse();
  });

  it('token lontano dalla scadenza: ripristina la sessione senza rinnovare', async () => {
    seedSession(fakeJwt(5 * DAY));
    const auth = create();
    await Promise.resolve();
    await Promise.resolve();
    http.expectNone((r) => r.url.endsWith('/auth/renew-token'));
    const req = http.expectOne((r) => r.url.endsWith('/auth/restore-session'));
    expect(req.request.body.token).toBeTruthy();
    req.flush({ success: true, user: ME });
    await Promise.resolve();
    expect(auth.isAuthenticated).toBeTrue();
  });

  it('token nelle ultime 24 ore: rinnova (con il token nel body) e salva quello nuovo', async () => {
    const old = fakeJwt(3600);
    const fresh = fakeJwt(7 * DAY);
    seedSession(old);
    const auth = create();
    const renew = http.expectOne((r) => r.url.endsWith('/auth/renew-token'));
    expect(renew.request.body).toEqual({ token: old });
    renew.flush({ success: true, token: fresh });
    await new Promise((r) => setTimeout(r));
    expect(localStorage.getItem('bmpresence_token')).toBe(fresh);
    http.expectOne((r) => r.url.endsWith('/auth/restore-session')).flush({ success: true, user: ME });
    expect(auth.currentUserValue?.username).toBe('luca.moretti');
  });

  it('401 sul rinnovo: la sessione è finita e si azzera', async () => {
    seedSession(fakeJwt(3600));
    const auth = create();
    http.expectOne((r) => r.url.endsWith('/auth/renew-token')).flush({ success: false }, { status: 401, statusText: 'Unauthorized' });
    await new Promise((r) => setTimeout(r));
    expect(localStorage.getItem('bmpresence_token')).toBeNull();
    expect(auth.currentUserValue).toBeNull();
  });

  it('server irraggiungibile: il token resta e si riprova dopo', async () => {
    const token = fakeJwt(3600);
    seedSession(token);
    const auth = create();
    http.expectOne((r) => r.url.endsWith('/auth/renew-token')).error(new ProgressEvent('error'), { status: 0 });
    await new Promise((r) => setTimeout(r));
    expect(localStorage.getItem('bmpresence_token')).toBe(token);
    expect(auth.currentUserValue).not.toBeNull();
  });

  it('due controlli insieme fanno un solo rinnovo', async () => {
    seedSession(fakeJwt(3600));
    const auth = create();
    const a = auth.ensureFreshToken();
    const b = auth.ensureFreshToken();
    const reqs = http.match((r) => r.url.endsWith('/auth/renew-token'));
    expect(reqs.length).toBe(1);
    reqs[0].flush({ success: true, token: fakeJwt(7 * DAY) });
    expect(await a).toBeTrue();
    expect(await b).toBeTrue();
  });

  it('isAuthenticated: scaduto da meno di 7 giorni sì, da più no', () => {
    seedSession(fakeJwt(-2 * DAY));
    expect(create().isAuthenticated).toBeTrue();
    TestBed.resetTestingModule();
    seedSession(fakeJwt(-8 * DAY));
    expect(create().isAuthenticated).toBeFalse();
  });

  it('token scaduto da oltre 7 giorni: azzera la sessione senza chiamare il server', async () => {
    seedSession(fakeJwt(-8 * DAY));
    const auth = create();
    expect(await auth.ensureFreshToken()).toBeFalse();
    http.expectNone((r) => r.url.endsWith('/auth/renew-token'));
    expect(localStorage.getItem('bmpresence_token')).toBeNull();
  });
});
