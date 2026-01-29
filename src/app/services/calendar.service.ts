import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

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

// Interfaces para crear/actualizar appointments
export interface CreateAppointmentRequest {
  subject: string;
  startTime: string;
  endTime: string;
  resourceIds: number[];
  recurrenceRule?: string;
  active: boolean;
}

export interface UpdateAppointmentRequest {
  subject?: string;
  startTime?: string;
  endTime?: string;
  resourceIds?: number[];
  recurrenceRule?: string;
  active?: boolean;
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
      map(appointments => {
        console.log('Appointments del backend (raw):', appointments);
        return appointments
          .filter(a => a.active) // Solo appointments activos
          .map(a => this.mapAppointmentToFrontend(a));
      })
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
      StartTime: this.parseLocalDateTime(appointment.startTime),
      EndTime: this.parseLocalDateTime(appointment.endTime),
      ResourceIds: appointment.resourceIds?.map(id => id.toString()) || undefined,
      RecurrenceRule: appointment.recurrenceRule || undefined
    };
  }

  /**
   * Crea un nuevo appointment
   */
  createAppointment(appointment: Appointment): Observable<Appointment> {
    const request = this.mapAppointmentToBackend(appointment);
    console.log('Petición al backend (createAppointment):', request);
    console.log('resourceIds type:', typeof request.resourceIds, 'isArray:', Array.isArray(request.resourceIds));
    console.log('JSON a enviar:', JSON.stringify(request));
    return this.http.post<AppointmentDTO>(`${this.apiUrl}/appointments`, request).pipe(
      map(dto => this.mapAppointmentToFrontend(dto))
    );
  }

  /**
   * Actualiza un appointment existente
   */
  updateAppointment(id: string, appointment: Appointment): Observable<Appointment> {
    const request: UpdateAppointmentRequest = {
      subject: appointment.Subject,
      startTime: this.formatDateTimeToUTC(appointment.StartTime),
      endTime: this.formatDateTimeToUTC(appointment.EndTime),
      resourceIds: appointment.ResourceIds?.map(id => parseInt(id)),
      recurrenceRule: appointment.RecurrenceRule || undefined
    };
    return this.http.put<AppointmentDTO>(`${this.apiUrl}/appointments/${id}`, request).pipe(
      map(dto => this.mapAppointmentToFrontend(dto))
    );
  }

  /**
   * Elimina un appointment (lo marca como inactivo)
   */
  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/appointments/${id}`);
  }

  /**
   * Mapea un appointment del frontend al formato del backend
   */
  private mapAppointmentToBackend(appointment: Appointment): CreateAppointmentRequest {
    // Normalizar resourceIds a array de números
    // ResourceIds siempre debe existir (1=mobile, 2=onlog)
    if (!appointment.ResourceIds || appointment.ResourceIds.length === 0) {
      throw new Error('ResourceIds es obligatorio (1=mobile, 2=onlog)');
    }

    const resourceIds = appointment.ResourceIds.map(id => {
      // Convertir a número, ya sea string o número
      return typeof id === 'string' ? parseInt(id, 10) : id;
    });

    return {
      subject: appointment.Subject,
      startTime: this.formatDateTimeToUTC(appointment.StartTime),
      endTime: this.formatDateTimeToUTC(appointment.EndTime),
      resourceIds: resourceIds,
      recurrenceRule: appointment.RecurrenceRule || undefined,
      active: true
    };
  }

  /**
   * Convierte una fecha local a ISO string sin conversión a UTC
   */
  private formatDateTimeToUTC(date: Date): string {
    // Tomar los componentes locales sin convertir a UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // Enviar sin el sufijo Z para que el backend lo interprete como LocalDateTime
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Convierte una fecha ISO string a Date como hora local
   * El backend envía LocalDateTime sin zona horaria (sin "Z")
   * JavaScript lo parsea correctamente como hora local
   */
  private parseLocalDateTime(dateString: string): Date {
    return new Date(dateString);
  }
}
