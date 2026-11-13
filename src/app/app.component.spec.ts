import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppComponent } from './app.component';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ME, clearSession, seedSession, testProviders } from './testing';

@Component({ template: '' })
class Stub {}

const routes = [{ path: 'main', component: Stub }, { path: 'login', component: Stub }];
const providers = [...testProviders, provideRouter(routes)];

describe('AppComponent', () => {
  afterEach(() => clearSession());

  const create = async (url: string, user = true) => {
    seedSession(null, user ? ME : {});
    if (!user) localStorage.removeItem('bmpresence_user');
    await TestBed.configureTestingModule({ imports: [AppComponent], providers }).compileComponents();
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url).catch(() => undefined);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('con la sessione mostra menu, barra in alto e titolo della pagina', async () => {
    const el = await create('/main');
    expect(el.querySelector('header h1')?.textContent).toContain('Presenze');
    expect(el.querySelector('bm-sidebar')).not.toBeNull();
    expect(el.querySelector('header')?.textContent).toContain('Luca Moretti');
    expect(el.querySelector('header')?.textContent).toContain('Amministratore');
  });

  it('il menu mostra Utenti solo agli amministratori', async () => {
    const admin = await create('/main');
    expect(admin.querySelector('nav.fixed')?.textContent).toContain('Utenti');
    TestBed.resetTestingModule();
    clearSession();
    seedSession(null, { ...ME, isAdmin: false });
    await TestBed.configureTestingModule({ imports: [AppComponent], providers }).compileComponents();
    await TestBed.inject(Router).navigateByUrl('/main').catch(() => undefined);
    const f = TestBed.createComponent(AppComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('nav.fixed')?.textContent).not.toContain('Utenti');
  });

  it('su login e registrazione non c’è né menu né barra', async () => {
    const el = await create('/login', false);
    expect(el.querySelector('header')).toBeNull();
    expect(el.querySelector('bm-sidebar')).toBeNull();
  });
});
