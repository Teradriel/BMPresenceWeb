import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { UserPageComponent } from './user-page.component';
import { BmConfirm } from '../../shared/bm-ui';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { addDays, iso } from '../../shared/week';
import { ME, clearSession, seedSession, testProviders, tick } from '../../testing';

describe('UserPageComponent', () => {
  let http: HttpTestingController;

  const create = async () => {
    seedSession(null);
    await TestBed.configureTestingModule({ imports: [UserPageComponent], providers: testProviders }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UserPageComponent);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => clearSession());

  it('mostra i dati dell’utente e le iniziali', async () => {
    const fixture = await create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Luca Moretti');
    expect(text).toContain('luca.moretti');
    expect(text).toContain('Amministratore');
    expect(fixture.componentInstance.initials).toBe('LM');
  });

  it('il prossimo turno viene dalle presenze dei prossimi 21 giorni', async () => {
    const fixture = await create();
    const day = iso(addDays(new Date(), 2));
    http.expectOne((r) => r.url.endsWith('/resources/active')).flush([{ id: 1, name: 'Mobile' }]);
    const occ = http.expectOne((r) => r.url.endsWith('/appointments/occurrences'));
    expect(occ.request.params.get('start')).toBe(iso(new Date()));
    expect(occ.request.params.get('end')).toBe(iso(addDays(new Date(), 21)));
    occ.flush([{ appointmentId: 1, date: day, resourceId: 1, userId: 1, subject: 'Luca', recurring: false, recurrenceRule: null }, { appointmentId: 2, date: day, resourceId: 1, userId: 9, subject: 'Altro', recurring: false, recurrenceRule: null }]);
    await tick();
    expect(fixture.componentInstance.nextShiftSub).toBe('Mobile · 08:30');
    expect(fixture.componentInstance.nextShift).not.toBe('—');
  });

  it('senza turni lo dice', async () => {
    const fixture = await create();
    http.expectOne((r) => r.url.endsWith('/resources/active')).flush([]);
    http.expectOne((r) => r.url.endsWith('/appointments/occurrences')).flush([]);
    await tick();
    expect(fixture.componentInstance.nextShiftSub).toContain('Nessun turno');
  });

  it('il tema scelto qui si ricorda e si applica', async () => {
    await create();
    http.match(() => true);
    const theme = TestBed.inject(ThemeService);
    theme.set('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('bmp.theme')).toBe('dark');
    theme.set('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBeFalse();
  });

  it('esci chiede conferma e non esce se si annulla', async () => {
    const fixture = await create();
    http.match(() => true);
    const auth = TestBed.inject(AuthService);
    spyOn(auth, 'logout');
    const confirm = TestBed.inject(BmConfirm);
    spyOn(confirm, 'ask').and.resolveTo(false);
    await fixture.componentInstance.onLogout();
    expect(auth.logout).not.toHaveBeenCalled();
    (confirm.ask as jasmine.Spy).and.resolveTo(true);
    await fixture.componentInstance.onLogout();
    expect(auth.logout).toHaveBeenCalled();
    expect(ME.id).toBe('1');
  });
});
