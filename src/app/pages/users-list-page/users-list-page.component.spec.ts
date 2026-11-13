import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { UsersListPageComponent } from './users-list-page.component';
import { BmConfirm } from '../../shared/bm-ui';
import { UserDTO } from '../../services/user.service';
import { clearSession, seedSession, testProviders } from '../../testing';

const user = (id: number, over: Partial<UserDTO> = {}): UserDTO => ({
  id: String(id), username: `utente${id}`, name: `Nome${String(id).padStart(2, '0')}`, lastName: 'Rossi', email: `utente${id}@bluemobility.it`,
  isAdmin: false, active: true, createdAt: '2025-03-02T09:00:00', lastActiveAt: undefined, mustChangePassword: false, ...over,
});

describe('UsersListPageComponent', () => {
  let http: HttpTestingController;

  const create = async (users: UserDTO[]) => {
    seedSession(null);
    await TestBed.configureTestingModule({ imports: [UsersListPageComponent], providers: testProviders }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UsersListPageComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/users') && r.method === 'GET').flush(users);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance as any };
  };

  afterEach(() => clearSession());

  const sample = () => [
    user(1, { name: 'Luca', lastName: 'Moretti', isAdmin: true, lastActiveAt: '2026-11-13T08:21:00' }),
    user(2, { name: 'Giulia', lastName: 'Zanatta' }),
    user(3, { name: 'Davide', lastName: 'Pavan', active: false }),
    user(4, { name: 'Silvia', lastName: 'Cester', mustChangePassword: true }),
  ];

  it('conta le schede e mostra anche i disattivi', async () => {
    const { c } = await create(sample());
    expect(c.tabs().map((t: any) => `${t.value}:${t.n}`)).toEqual(['all:4', 'active:3', 'inactive:1', 'admin:1']);
    expect(c.rows().length).toBe(4);
  });

  it('le schede e la ricerca restringono l’elenco e riportano a pagina 1', async () => {
    const { c } = await create(sample());
    c.setTab('inactive');
    expect(c.rows().map((u: UserDTO) => u.username)).toEqual(['utente3']);
    c.setTab('all');
    c.setQuery('zanatta');
    expect(c.rows().length).toBe(1);
    c.setQuery('bluemobility');
    expect(c.rows().length).toBe(4);
  });

  it('ordinamento: primo clic crescente, secondo decrescente; gli accessi vuoti restano in fondo', async () => {
    const { c } = await create(sample());
    expect(c.rows()[0].name).toBe('Davide'); // nome crescente
    c.sort('name');
    expect(c.rows()[0].name).toBe('Silvia');
    c.sort('seen');
    expect(c.asc()).toBeTrue();
    expect(c.rows()[0].name).toBe('Luca'); // l'unico con un accesso
    c.sort('seen');
    expect(c.rows()[0].name).toBe('Luca'); // anche decrescente
  });

  it('pagine da 10', async () => {
    const many = Array.from({ length: 23 }, (_, i) => user(i + 1));
    const { c } = await create(many);
    expect(c.pages()).toBe(3);
    expect(c.rows().length).toBe(10);
    expect(c.range()).toBe('1–10 di 23');
    c.page.set(3);
    expect(c.rows().length).toBe(3);
    expect(c.range()).toBe('21–23 di 23');
  });

  it('stato: Attivo / Disattivo / Deve cambiare password', async () => {
    const { c } = await create(sample());
    const s = sample();
    expect([s[1], s[2], s[3]].map((u) => c.statusText(u))).toEqual(['Attivo', 'Disattivo', 'Deve cambiare password']);
  });

  it('il menu di sé stessi non offre disattiva né elimina', async () => {
    const { c } = await create(sample());
    const mine = c.menuItems(user(1)).map((i: any) => i.key); // l'utente di sessione è l'id 1
    expect(mine).toEqual(['edit', 'reset']);
    expect(c.menuItems(user(2)).map((i: any) => i.key)).toEqual(['edit', 'reset', 'toggle', 'delete']);
  });

  it('elimina: conferma rossa e DELETE /hard; se si annulla non parte nulla', async () => {
    const { c } = await create(sample());
    const ask = spyOn(TestBed.inject(BmConfirm), 'ask').and.resolveTo(false);
    await c.remove(user(2));
    http.expectNone((r) => r.url.includes('/hard'));
    ask.and.resolveTo(true);
    const done = c.remove(user(2));
    await Promise.resolve();
    expect(ask.calls.mostRecent().args[0].danger).toBeTrue();
    const req = http.expectOne((r) => r.url.endsWith('/users/2/hard'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await done;
    http.expectOne((r) => r.url.endsWith('/users') && r.method === 'GET').flush([]);
  });

  it('disattiva: PUT con active=false senza toccare il ruolo', async () => {
    const { c } = await create(sample());
    const done = c.setActive(user(2), false);
    const req = http.expectOne((r) => r.url.endsWith('/users/2'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.active).toBeFalse();
    expect(req.request.body.isAdmin).toBeFalse();
    req.flush({});
    await done;
    http.expectOne((r) => r.url.endsWith('/users') && r.method === 'GET').flush([]);
  });

  it('reset password: almeno 6 caratteri, poi POST admin-reset-password con cambio forzato', async () => {
    const { c, fixture } = await create(sample());
    c.openReset(user(2));
    fixture.detectChanges();
    expect(c.resetFor()).not.toBeNull();
    c.newPassword.set('temporanea');
    const done = c.doReset();
    const req = http.expectOne((r) => r.url.endsWith('/auth/admin-reset-password'));
    expect(req.request.body).toEqual({ userId: '2', newPassword: 'temporanea', forceChangeOnNextLogin: true });
    req.flush({ success: true });
    await done;
    expect(c.resetFor()).toBeNull();
    http.expectOne((r) => r.url.endsWith('/users') && r.method === 'GET').flush([]);
  });
});
