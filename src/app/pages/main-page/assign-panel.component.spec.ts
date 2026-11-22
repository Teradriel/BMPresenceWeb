import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AssignPanelComponent } from './assign-panel.component';
import { Occurrence } from '../../services/calendar.service';
import { addDays, iso, monday } from '../../shared/week';
import { clearSession, testProviders } from '../../testing';

const RESOURCES = [{ id: 1, name: 'Mobile' }, { id: 2, name: 'OnLog' }];
const COLLEAGUES = [
  { id: 1, name: 'Luca', lastName: 'Moretti', isOnline: true },
  { id: 3, name: 'Marco', lastName: 'Furlan', isOnline: false },
  { id: 4, name: 'Elena', lastName: 'De Marchi', isOnline: true },
];
// un lunedì futuro: nessun «oggi», nessun fine settimana
const MON = addDays(monday(new Date()), 14);
const occ = (over: Partial<Occurrence>): Occurrence => ({ appointmentId: 1, date: iso(MON), resourceId: 1, userId: 4, subject: 'Elena De Marchi', recurring: false, recurrenceRule: null, ...over });

describe('AssignPanelComponent', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<AssignPanelComponent>;
  let c: any;

  const create = async (inputs: { existing?: Occurrence | null; occurrences?: Occurrence[]; day?: Date; resourceId?: number } = {}) => {
    await TestBed.configureTestingModule({ imports: [AssignPanelComponent], providers: testProviders }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AssignPanelComponent);
    fixture.componentRef.setInput('day', inputs.day ?? MON);
    fixture.componentRef.setInput('resourceId', inputs.resourceId ?? 1);
    fixture.componentRef.setInput('existing', inputs.existing ?? null);
    fixture.componentRef.setInput('resources', RESOURCES);
    fixture.componentRef.setInput('colleagues', COLLEAGUES);
    fixture.componentRef.setInput('occurrences', inputs.occurrences ?? []);
    fixture.componentRef.setInput('me', { id: 1, name: 'Luca Moretti' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    c = fixture.componentInstance;
    return c;
  };

  afterEach(() => clearSession());

  it('presenza singola per me: POST con userId, orario 08:30–09:30 e senza ricorrenza', async () => {
    await create();
    let saved = false;
    c.saved.subscribe(() => (saved = true));
    await Promise.all([c.save(), Promise.resolve().then(() => {
      const req = http.expectOne((r) => r.url.endsWith('/appointments'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ userId: 1, subject: 'Luca Moretti', startTime: `${iso(MON)}T08:30:00`, endTime: `${iso(MON)}T09:30:00`, resourceIds: [1], recurrenceRule: null, active: true });
      req.flush({});
    })]);
    expect(saved).toBeTrue();
  });

  it('la stessa persona due volte sulla stessa risorsa nello stesso giorno è rifiutata prima di chiamare il server', async () => {
    await create({ occurrences: [occ({ userId: 1, subject: 'Luca Moretti' })] });
    await c.save();
    http.expectNone((r) => r.url.endsWith('/appointments'));
    expect(c.error()).toContain('già su Mobile');
  });

  it('stesso giorno su un’altra risorsa va bene', async () => {
    await create({ occurrences: [occ({ userId: 1, subject: 'Luca Moretti', resourceId: 2 })] });
    expect(c.meDescription()).toBe('Sei anche su OnLog: va bene');
    expect(c.canSave()).toBeTrue();
  });

  it('serie su giorni scelti: la regola ha BYDAY ordinato e UNTIL', async () => {
    await create();
    c.repeat.set('days');
    c.flags.set([2, 0]);
    c.untilIso.set(iso(addDays(MON, 14)));
    fixture.detectChanges();
    expect(c.summary()).toContain('ogni lun, mer');
    expect(c.canSave()).toBeTrue();
    const done = c.save();
    await Promise.resolve();
    const req = http.expectOne((r) => r.url.endsWith('/appointments'));
    expect(req.request.body.recurrenceRule).toBe(`FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=${iso(addDays(MON, 14)).replaceAll('-', '')}`);
    req.flush({});
    await done;
  });

  it('una serie senza data di fine non si può salvare', async () => {
    await create();
    c.repeat.set('week');
    expect(c.canSave()).toBeFalse();
    c.untilIso.set(iso(addDays(MON, 7)));
    expect(c.canSave()).toBeTrue();
  });

  it('il giorno di inizio resta tra i giorni scelti', async () => {
    await create();
    c.repeat.set('days');
    c.toggleDay(0); // lunedì = giorno di inizio: non si toglie
    expect(c.flags()).toContain(0);
    c.toggleDay(3);
    expect(c.flags()).toContain(3);
    c.toggleDay(3);
    expect(c.flags()).not.toContain(3);
  });

  it('le scorciatoie portano la fine a 2 settimane / 1 mese / 2 mesi, mai oltre il limite', async () => {
    await create();
    c.quickUntil('14');
    expect(c.untilIso()).toBe(iso(addDays(MON, 14)));
    c.quickUntil('m2');
    const limit = new Date(MON);
    limit.setMonth(limit.getMonth() + 2);
    expect(c.untilIso() <= iso(limit)).toBeTrue();
    expect(new Date(c.untilIso() + 'T00:00:00').getDay() % 6).not.toBe(0);
  });

  it('modifica di una presenza singola: PUT sullo stesso appuntamento', async () => {
    await create({ existing: occ({ appointmentId: 9, userId: 4 }), occurrences: [occ({ appointmentId: 9, userId: 4 })] });
    expect(c.whoMe()).toBeFalse();
    expect(c.colleagueId()).toBe('4');
    c.resId.set('2');
    const done = c.save();
    await Promise.resolve();
    const req = http.expectOne((r) => r.url.endsWith('/appointments/9'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.resourceIds).toEqual([2]);
    expect(req.request.body.userId).toBe(4);
    req.flush({});
    await done;
  });

  it('modifica di una serie: prima chiude la vecchia da questo giorno, poi crea la nuova', async () => {
    const existing = occ({ appointmentId: 5, userId: 1, subject: 'Luca Moretti', recurring: true, recurrenceRule: `FREQ=WEEKLY;BYDAY=MO;UNTIL=${iso(addDays(MON, 28)).replaceAll('-', '')}` });
    await create({ existing, occurrences: [existing] });
    expect(c.repeat()).toBe('days');
    c.resId.set('2');
    const done = c.save();
    await Promise.resolve();
    const end = http.expectOne((r) => r.url.endsWith('/appointments/5/end-series'));
    expect(end.request.params.get('from')).toBe(iso(MON));
    end.flush(null);
    await new Promise((r) => setTimeout(r));
    const post = http.expectOne((r) => r.url.endsWith('/appointments'));
    expect(post.request.method).toBe('POST');
    post.flush({});
    await done;
  });

  it('errore del server (409): il messaggio resta nel piede del pannello', async () => {
    await create();
    const done = c.save();
    await Promise.resolve();
    http.expectOne((r) => r.url.endsWith('/appointments')).flush("La persona 'Luca Moretti' ha già un appuntamento", { status: 409, statusText: 'Conflict' });
    await done;
    expect(c.error()).toContain('ha già un appuntamento');
    expect(c.busy()).toBeFalse();
  });

  it('nell’elenco colleghi chi è già sulla risorsa va in fondo', async () => {
    await create({ occurrences: [occ({ userId: 3, subject: 'Marco Furlan' })] });
    const opts = c.colleagueOptions();
    expect(opts.map((o: any) => o.label)).toEqual(['Elena De Marchi', 'Marco Furlan']);
    expect(opts[1].description).toContain('Già su questa risorsa');
    expect(opts.every((o: any) => o.value !== '1')).toBeTrue(); // io non sono tra i colleghi
  });

  it('cambiando giorno la fine fuori finestra si azzera', async () => {
    await create();
    c.repeat.set('week');
    c.untilIso.set(iso(addDays(MON, 40)));
    c.dayIso.set(iso(addDays(MON, 60)));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.untilIso()).toBe('');
  });
});
