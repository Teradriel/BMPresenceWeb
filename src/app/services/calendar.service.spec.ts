import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CalendarService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('risorse e colleghi usano gli stessi endpoint dell’app MAUI', () => {
    service.getResources().subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/resources/active')).request.method).toBe('GET');
    service.getColleagues().subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/users/colleagues')).request.method).toBe('GET');
  });

  it('le presenze si chiedono a intervallo, in aaaa-mm-gg', () => {
    service.getOccurrences('2026-11-09', '2026-12-04').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/appointments/occurrences'));
    expect(req.request.params.get('start')).toBe('2026-11-09');
    expect(req.request.params.get('end')).toBe('2026-12-04');
  });

  it('crea e aggiorna con il corpo dato', () => {
    const body = { userId: 1, subject: 'Luca Moretti', startTime: '2026-11-16T08:30:00', endTime: '2026-11-16T09:30:00', resourceIds: [1], recurrenceRule: null, active: true };
    service.create(body).subscribe();
    const post = http.expectOne((r) => r.url.endsWith('/appointments'));
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(body);
    service.update(7, body).subscribe();
    const put = http.expectOne((r) => r.url.endsWith('/appointments/7'));
    expect(put.request.method).toBe('PUT');
  });

  it('togli un giorno e termina serie: POST con la data nei parametri', () => {
    service.removeDay(3, '2026-11-23').subscribe();
    const r1 = http.expectOne((r) => r.url.endsWith('/appointments/3/remove-day'));
    expect(r1.request.method).toBe('POST');
    expect(r1.request.params.get('date')).toBe('2026-11-23');
    service.endSeries(3, '2026-11-30').subscribe();
    const r2 = http.expectOne((r) => r.url.endsWith('/appointments/3/end-series'));
    expect(r2.request.params.get('from')).toBe('2026-11-30');
  });
});
