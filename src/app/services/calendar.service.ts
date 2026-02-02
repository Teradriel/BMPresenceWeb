import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces for backend data
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

// Interfaces for creating/updating appointments
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

// Interfaces for frontend (Syncfusion)
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
   * Gets the list of resources (rooms, offices, etc.)
   */
  getResources(): Observable<Resource[]> {
    return this.http.get<ResourceDTO[]>(`${this.apiUrl}/resources`).pipe(
      map(resources => resources
        .filter(r => r.active) // Only active resources
        .map(r => this.mapResourceToFrontend(r))
      )
    );
  }

  /**
   * Gets the list of appointments
   */
  getAppointments(): Observable<Appointment[]> {
    return this.http.get<AppointmentDTO[]>(`${this.apiUrl}/appointments`).pipe(
      map(appointments => {
        console.log('Appointments from backend (raw):', appointments);
        return appointments
          .filter(a => a.active) // Only active appointments
          .map(a => this.mapAppointmentToFrontend(a));
      })
    );
  }

  /**
   * Maps a resource from backend to frontend format
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
   * Maps an appointment from backend to frontend format
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
   * Creates a new appointment
   */
  createAppointment(appointment: Appointment): Observable<Appointment> {
    const request = this.mapAppointmentToBackend(appointment);
    console.log('Request to backend (createAppointment):', request);
    console.log('resourceIds type:', typeof request.resourceIds, 'isArray:', Array.isArray(request.resourceIds));
    console.log('JSON to send:', JSON.stringify(request));
    return this.http.post<AppointmentDTO>(`${this.apiUrl}/appointments`, request).pipe(
      map(dto => this.mapAppointmentToFrontend(dto))
    );
  }

  /**
   * Updates an existing appointment
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
   * Deletes an appointment (marks it as inactive)
   */
  deleteAppointment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/appointments/${id}`);
  }

  /**
   * Maps an appointment from frontend to backend format
   */
  private mapAppointmentToBackend(appointment: Appointment): CreateAppointmentRequest {
    // Normalize resourceIds to array of numbers
    // ResourceIds must always exist (1=mobile, 2=onlog)
    if (!appointment.ResourceIds || appointment.ResourceIds.length === 0) {
      throw new Error('ResourceIds è obbligatorio (1=mobile, 2=onlog)');
    }

    const resourceIds = appointment.ResourceIds.map(id => {
      // Convert to number, whether string or number
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
   * Converts a local date to ISO string without UTC conversion
   */
  private formatDateTimeToUTC(date: Date): string {
    // Take local components without converting to UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // Send without the Z suffix so the backend interprets it as LocalDateTime
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Converts an ISO string date to Date as local time
   * The backend sends LocalDateTime without timezone (without "Z")
   * JavaScript parses it correctly as local time
   */
  private parseLocalDateTime(dateString: string): Date {
    return new Date(dateString);
  }
}
