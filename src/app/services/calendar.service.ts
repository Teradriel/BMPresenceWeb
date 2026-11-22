import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Resource {
  id: number;
  name: string;
}

/** Una presenza in un giorno preciso: le serie le espande il server (`/appointments/occurrences`). */
export interface Occurrence {
  appointmentId: number;
  date: string;
  resourceId: number;
  userId: number | null;
  subject: string | null;
  recurring: boolean;
  recurrenceRule: string | null;
}

export interface Colleague {
  id: number;
  name: string;
  lastName: string;
  isOnline: boolean;
}

export interface AppointmentRequest {
  userId: number;
  subject: string;
  startTime: string;
  endTime: string;
  resourceIds: number[];
  recurrenceRule: string | null;
  active: boolean;
}

/** Stessi endpoint dell'app MAUI. */
@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.api}/resources/active`);
  }

  getColleagues(): Observable<Colleague[]> {
    return this.http.get<Colleague[]>(`${this.api}/users/colleagues`);
  }

  getOccurrences(start: string, end: string): Observable<Occurrence[]> {
    return this.http.get<Occurrence[]>(`${this.api}/appointments/occurrences`, { params: { start, end } });
  }

  create(body: AppointmentRequest): Observable<unknown> {
    return this.http.post(`${this.api}/appointments`, body);
  }

  update(id: number, body: AppointmentRequest): Observable<unknown> {
    return this.http.put(`${this.api}/appointments/${id}`, body);
  }

  /** «Togli solo questo giorno»: eccezione nella serie, o elimina l'appuntamento singolo. */
  removeDay(id: number, date: string): Observable<void> {
    return this.http.post<void>(`${this.api}/appointments/${id}/remove-day`, null, { params: { date } });
  }

  /** «Termina la serie da qui»: toglie questo giorno e i successivi. */
  endSeries(id: number, from: string): Observable<void> {
    return this.http.post<void>(`${this.api}/appointments/${id}/end-series`, null, { params: { from } });
  }
}
