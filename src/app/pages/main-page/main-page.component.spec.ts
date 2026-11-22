import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MainPageComponent } from './main-page.component';
import { BmConfirm } from '../../shared/bm-ui';
import { ConnectionService } from '../../services/connection.service';
import { Occurrence } from '../../services/calendar.service';
import { addDays, iso, monday } from '../../shared/week';
import { clearSession, seedSession, testProviders, tick } from '../../testing';

const occ = (over: Partial<Occurrence>): Occurrence => ({ appointmentId: 1, date: iso(monday(new Date())), resourceId: 1, userId: 1, subject: 'Luca Moretti', recurring: false, recurrenceRule: null, ...over });

describe('MainPageComponent', () => {
  let http: HttpTestingController;

  const create = async (occurrences: Occurrence[] = []) => {
    seedSession(null);
    await TestBed.configureTestingModule({ imports: [MainPageComponent], providers: testProviders }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MainPageComponent);
    (fixture.componentInstance as any).narrow.set(false); // la griglia, qualunque sia la finestra di Karma
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/resources/active')).flush([{ id: 2, name: 'OnLog' }, { id: 1, name: 'Mobile' }]);
    http.expectOne((r) => r.url.endsWith('/users/colleagues')).flush([
      { id: 1, name: 'Luca', lastName: 'Moretti', isOnline: true },
      { id: 4, name: 'Elena', lastName: 'De Marchi', isOnline: false },
    ]);
    await tick();
    http.expectOne((r) => r.url.endsWith('/appointments/occurrences')).flush(occurrences);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => clearSession());

  it('mostra le risorse in ordine e le persone di ogni casella, "Tu" per me', async () => {
    const mon = iso(monday(new Date()));
    const fixture = await create([occ({ date: mon }), occ({ appointmentId: 2, date: mon, userId: 4, subject: 'Elena De Marchi' }), occ({ appointmentId: 3, date: mon, resourceId: 2, userId: 4, subject: 'Elena De Marchi', recurring: true, recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20261204' })]);
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text.indexOf('Mobile')).toBeLessThan(text.indexOf('OnLog'));
    expect(text).toContain('Tu');
    expect(text).toContain('Elena De Marchi');
    expect(text).toContain('Ogni lun · fino al 04/12');
    expect(el.querySelectorAll('button[aria-label^="Mobile,"]').length).toBe(2);
  });

  it('una persona è «Tu» solo se lo userId è il mio', async () => {
    const fixture = await create([occ({ userId: 4, subject: 'Elena De Marchi' })]);
    const chips = (fixture.componentInstance as any).rows()[0].cells[0].people;
    expect(chips.length).toBe(1);
    expect(chips[0].mine).toBeFalse();
    expect(chips[0].name).toBe('Elena De Marchi');
  });

  it('la ricerca delle presenze copre la settimana mostrata e le tre davanti a oggi', async () => {
    seedSession(null);
    await TestBed.configureTestingModule({ imports: [MainPageComponent], providers: testProviders }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MainPageComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/resources/active')).flush([]);
    http.expectOne((r) => r.url.endsWith('/users/colleagues')).flush([]);
    await tick();
    const req = http.expectOne((r) => r.url.endsWith('/appointments/occurrences'));
    expect(req.request.params.get('start')! <= iso(monday(new Date()))).toBeTrue();
    expect(req.request.params.get('end')!).toBe(iso(addDays(new Date(), 21)));
    req.flush([]);
  });

  it('la settimana dopo rilegge le presenze', async () => {
    const fixture = await create();
    (fixture.componentInstance as any).shift(1);
    const req = http.expectOne((r) => r.url.endsWith('/appointments/occurrences'));
    expect(req.request.params.get('end')! >= iso(addDays(monday(new Date()), 11))).toBeTrue();
    req.flush([]);
    await tick();
    expect(iso((fixture.componentInstance as any).weekStart())).toBe(iso(addDays(monday(new Date()), 7)));
  });

  it('server irraggiungibile: badge Offline e nessuna griglia inventata', async () => {
    seedSession(null);
    await TestBed.configureTestingModule({ imports: [MainPageComponent], providers: testProviders }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MainPageComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/resources/active')).error(new ProgressEvent('error'));
    http.expectOne((r) => r.url.endsWith('/users/colleagues')).error(new ProgressEvent('error'));
    await new Promise((r) => setTimeout(r)); // niente whenStable: il toast d'errore tiene un timer di 12 s
    expect(TestBed.inject(ConnectionService).online()).toBeFalse();
    expect((fixture.componentInstance as any).resources().length).toBe(0);
  });

  it('«Aggiungi» di una casella apre il pannello su quel giorno e quella risorsa', async () => {
    const fixture = await create();
    const btn = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) => b.textContent?.includes('Aggiungi') && !b.textContent.includes('presenza')) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();
    const panel = (fixture.componentInstance as any).panel();
    expect(panel.resourceId).toBe(1);
    expect(iso(panel.day)).toBe(iso(monday(new Date())));
    expect(panel.existing).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-assign-panel')).not.toBeNull();
  });

  it('togliere un giorno di una serie chiede conferma e chiama remove-day', async () => {
    const mon = iso(monday(new Date()));
    const fixture = await create([occ({ appointmentId: 7, date: mon, recurring: true, recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20261204' })]);
    const confirm = TestBed.inject(BmConfirm);
    const ask = spyOn(confirm, 'ask').and.resolveTo(true);
    const done = (fixture.componentInstance as any).removeOne(occ({ appointmentId: 7, date: mon, recurring: true }), 'Tu');
    await tick();
    const req = http.expectOne((r) => r.url.endsWith('/appointments/7/remove-day'));
    expect(req.request.params.get('date')).toBe(mon);
    expect(ask.calls.mostRecent().args[0].message).toContain('La serie continua');
    req.flush(null);
    await tick();
    http.expectOne((r) => r.url.endsWith('/appointments/occurrences')).flush([]);
    await done;
  });

  it('se si annulla la conferma non parte nessuna chiamata', async () => {
    const fixture = await create();
    spyOn(TestBed.inject(BmConfirm), 'ask').and.resolveTo(false);
    await (fixture.componentInstance as any).removeOne(occ({ appointmentId: 7 }), 'Tu');
    http.expectNone((r) => r.url.includes('/remove-day'));
  });

  it('termina la serie da qui chiama end-series con il giorno scelto', async () => {
    const mon = iso(monday(new Date()));
    const fixture = await create();
    spyOn(TestBed.inject(BmConfirm), 'ask').and.resolveTo(true);
    const done = (fixture.componentInstance as any).endSeries(occ({ appointmentId: 7, date: mon, recurring: true }));
    await tick();
    const req = http.expectOne((r) => r.url.endsWith('/appointments/7/end-series'));
    expect(req.request.params.get('from')).toBe(mon);
    req.flush(null);
    await tick();
    http.expectOne((r) => r.url.endsWith('/appointments/occurrences')).flush([]);
    await done;
  });

  it('il filtro «Le mie» attenua le caselle senza di me', async () => {
    const mon = iso(monday(new Date()));
    const fixture = await create([occ({ date: mon }), occ({ appointmentId: 2, date: mon, resourceId: 2, userId: 4, subject: 'Elena De Marchi' })]);
    (fixture.componentInstance as any).filter.set('mine');
    const rows = (fixture.componentInstance as any).rows();
    expect(rows[0].cells[0].dim).toBeFalse(); // Mobile: ci sono io
    expect(rows[1].cells[0].dim).toBeTrue(); // OnLog: c'è solo Elena
  });
});
