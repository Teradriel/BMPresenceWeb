import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment.local';

// Interfaces para los datos del backend
interface ResourceDTO {
  id: number;
  name: string;
  background: string;
  foreground: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentDTO {
  id: number;
  subject: string;
  startTime: string;
  endTime: string;
  recurrenceRule: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  resourceIds: number[] | null;
}

// Interfaces para el frontend (Syncfusion)
export interface Resource {
  Id: string;
  Name: string;
  Background: string;
  Foreground: string;
}

export interface Appointment {
  Id?: string;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  ResourceIds?: string[];
  RecurrenceRule?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene la lista de recursos (salas, oficinas, etc.)
   */
  getResources(): Observable<Resource[]> {
    return this.http.get<ResourceDTO[]>(`${this.apiUrl}/resources`).pipe(
      map(resources => resources
        .filter(r => r.active) // Solo recursos activos
        .map(r => this.mapResourceToFrontend(r))
      )
    );
  }

  /**
   * Obtiene la lista de citas/appointments
   */
  getAppointments(): Observable<Appointment[]> {
    return this.http.get<AppointmentDTO[]>(`${this.apiUrl}/appointments`).pipe(
      map(appointments => appointments
        .filter(a => a.active) // Solo appointments activos
        .map(a => this.mapAppointmentToFrontend(a))
      )
    );
  }

  /**
   * Mapea un recurso del backend al formato del frontend
   */
  private mapResourceToFrontend(resource: ResourceDTO): Resource {
    return {
      Id: resource.id.toString(),
      Name: resource.name,
      Background: resource.background,
      Foreground: resource.foreground
    };
  }

  /**
   * Mapea un appointment del backend al formato del frontend
   */
  private mapAppointmentToFrontend(appointment: AppointmentDTO): Appointment {
    return {
      Id: appointment.id.toString(),
      Subject: appointment.subject,
      StartTime: new Date(appointment.startTime),
      EndTime: new Date(appointment.endTime),
      ResourceIds: appointment.resourceIds?.map(id => id.toString()) || undefined,
      RecurrenceRule: appointment.recurrenceRule || undefined
    };
  }
}
