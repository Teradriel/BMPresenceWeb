import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { CalendarService, Resource, Appointment } from '../../services/calendar.service';
import { UserService, UserDisplay } from '../../services/user.service';
import { AppointmentPopupComponent, AppointmentData } from '../../components/appointment-popup/appointment-popup.component';
import { 
  ScheduleModule, 
  TimelineViewsService,
  DayService,
  WeekService,
  WorkWeekService,
  MonthService,
  AgendaService,
  ScheduleComponent,
  EventSettingsModel,
  View,
  ResourceDetails,
  PopupOpenEventArgs
} from '@syncfusion/ej2-angular-schedule';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CommonModule, ScheduleModule, AppointmentPopupComponent],
  providers: [
    TimelineViewsService,
    DayService,
    WeekService,
    WorkWeekService,
    MonthService,
    AgendaService
  ],
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css']
})
export class MainPageComponent implements OnInit {
  @ViewChild('scheduleObj') scheduleObj!: ScheduleComponent;

  title = 'Presenze 8:30';
  isConnectedStr = 'Connesso';
  isBusy = false;
  selectedDate: Date = new Date();
  currentUserName: string = '';
  currentUser?: User;
  
  // Scheduler data
  presence: Appointment[] = [];
  
  // Event configuration
  eventSettings: EventSettingsModel = {
    dataSource: this.presence,
    fields: {
      id: 'Id',
      subject: { name: 'Subject' },
      startTime: { name: 'StartTime' },
      endTime: { name: 'EndTime' },
      recurrenceRule: { name: 'RecurrenceRule' }
    }
  };

  // Current view
  currentView: View = 'TimelineWorkWeek';

  // Resource configuration
  resourceDataSource: Resource[] = [];
  
  group = {
    resources: ['Resources']
  };

  // Resource settings for scheduler
  resourceSettings = {
    dataSource: this.resourceDataSource,
    field: 'ResourceIds',
    title: 'Resources',
    name: 'Resources',
    textField: 'Name',
    idField: 'Id',
    colorField: 'Background'
  };

  // Popup personalizado
  showAppointmentPopup = false;
  appointmentPopupData?: AppointmentData;
  users: UserDisplay[] = [];
  isEditMode = false;

  constructor(
    private authService: AuthService,
    private calendarService: CalendarService,
    private userService: UserService
  ) {
    const user = this.authService.currentUserValue;
    this.currentUser = user || undefined;
    this.currentUserName = user?.name || user?.username || 'Utente';
  }

  
  ngOnInit(): void {
    this.loadData();
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    try {
      this.users = await firstValueFrom(this.userService.getUsers());
      console.log('Users loaded:', this.users.length);
    } catch (error) {
      console.error('Error loading users:', error);
      this.users = [];
    }
  }

  async loadData(): Promise<void> {
    this.isBusy = true;
    
    try {
      // Load resources from backend
      this.resourceDataSource = await firstValueFrom(
        this.calendarService.getResources()
      );

      // Load appointments from backend
      this.presence = await firstValueFrom(
        this.calendarService.getAppointments()
      );

      // Update event configuration with all necessary fields
      this.eventSettings = {
        dataSource: this.presence,
        fields: {
          id: 'Id',
          subject: { name: 'Subject' },
          startTime: { name: 'StartTime' },
          endTime: { name: 'EndTime' },
          recurrenceRule: { name: 'RecurrenceRule' }
        }
      };

      console.log('Data loaded:', {
        resources: this.resourceDataSource.length,
        appointments: this.presence.length,
        presenceData: this.presence
      });

      // Refresh scheduler if already initialized
      if (this.scheduleObj) {
        this.scheduleObj.eventSettings.dataSource = this.presence;
        this.scheduleObj.dataBind();
      }
    } catch (error: any) {
      console.error('Error loading calendar data:', error);
      
      // Show error message to user
      const errorMessage = error?.error?.message || error?.message || 'Errore durante il caricamento dei dati del calendario';
      alert(`Errore: ${errorMessage}`);
      
      // Keep empty data on error
      this.resourceDataSource = [];
      this.presence = [];
      this.eventSettings = {
        dataSource: this.presence,
        fields: {
          id: 'Id',
          subject: { name: 'Subject' },
          startTime: { name: 'StartTime' },
          endTime: { name: 'EndTime' },
          recurrenceRule: { name: 'RecurrenceRule' }
        }
      };
    } finally {
      this.isBusy = false;
    }
  }

  refreshCalendar(): void {
    console.log('Refreshing calendar...');
    this.loadData();
    if (this.scheduleObj) {
      this.scheduleObj.refresh();
    }
  }

  onPopupOpen(args: PopupOpenEventArgs): void {
    // Cancel default Syncfusion popup
    args.cancel = true;

    if (args.type === 'QuickInfo' || args.type === 'Editor') {
      const data = args.data as any;
      
      console.log('onPopupOpen - data:', data);
      console.log('onPopupOpen - resourceDataSource:', this.resourceDataSource);
      
      // Determine if it's edit or create
      this.isEditMode = !!data.Id;

      // Get resource information
      // For new appointments, use groupIndex to determine the resource
      let resourceId: string;
      if (data.ResourceIds) {
        resourceId = Array.isArray(data.ResourceIds) ? data.ResourceIds[0] : data.ResourceIds;
      } else if (data.groupIndex !== undefined && this.resourceDataSource[data.groupIndex]) {
        resourceId = this.resourceDataSource[data.groupIndex].Id;
        console.log('Using groupIndex:', data.groupIndex, 'resourceId:', resourceId);
      } else {
        // Fallback: use first available resource
        resourceId = this.resourceDataSource[0]?.Id || '1';
        console.log('Using fallback, resourceId:', resourceId);
      }

      const resource = this.resourceDataSource.find(r => r.Id === resourceId);

      this.appointmentPopupData = {
        startTime: data.StartTime,
        endTime: data.EndTime,
        resourceIds: [resourceId],
        resourceName: resource?.Name || 'Unknown',
        appointmentId: data.Id
      };

      console.log('appointmentPopupData:', this.appointmentPopupData);

      this.showAppointmentPopup = true;
    }
  }

  onCellClick(args: any): void {
    console.log('Cell clicked:', args);
  }

  onEventClick(args: any): void {
    console.log('Event clicked:', args);
  }

  /**
   * Traduce mensajes de error del backend al italiano
   */
  private translateErrorMessage(error: any): string {
    // Log para debug
    console.log('Error completo:', error);
    console.log('error.error:', error?.error);
    console.log('error.message:', error?.message);
    console.log('error.status:', error?.status);
    
    // Intentar extraer el mensaje del error
    const errorMessage = error?.error?.message || error?.error?.error || error?.error || error?.message || '';
    
    console.log('errorMessage extraído:', errorMessage);
    
    // Detectar el error de appointment duplicado
    if (errorMessage.includes('ya tiene un appointment asignado')) {
      // Extraer información del mensaje (nombre, recurso, fecha)
      const match = errorMessage.match(/La persona '(.+?)' ya tiene un appointment asignado para el recurso (\d+) el día ([\d-]+)/);
      
      if (match) {
        const [, nombre, recurso, fecha] = match;
        const recursoNombre = recurso === '1' ? 'Mobile' : 'Onlog';
        const fechaFormateada = new Date(fecha).toLocaleDateString('it-IT', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        return `${nombre} ha già un appuntamento assegnato per ${recursoNombre} il giorno ${fechaFormateada}.`;
      }
      
      // Fallback si no se puede parsear el mensaje
      return 'Questa persona ha già un appuntamento assegnato per questo giorno e risorsa.';
    }
    
    // Otros errores genéricos
    if (errorMessage) {
      return `Errore: ${errorMessage}`;
    }
    
    return 'Errore durante l\'assegnazione dell\'appuntamento.';
  }

  async onAssignToMe(): Promise<void> {
    if (!this.appointmentPopupData || !this.currentUser) return;

    this.isBusy = true;
    try {
      const appointment: Appointment = {
        Subject: `${this.currentUser.name} ${this.currentUser.lastName}`.trim() || this.currentUser.username,
        StartTime: this.appointmentPopupData.startTime,
        EndTime: this.appointmentPopupData.endTime,
        ResourceIds: this.appointmentPopupData.resourceIds
      };

      console.log('Appointment to create/update:', appointment);

      if (this.isEditMode && this.appointmentPopupData.appointmentId) {
        // Update existing appointment
        const updated = await firstValueFrom(
          this.calendarService.updateAppointment(this.appointmentPopupData.appointmentId, appointment)
        );
        
        // Update in local array
        const index = this.presence.findIndex(a => a.Id === this.appointmentPopupData!.appointmentId);
        if (index !== -1) {
          this.presence[index] = updated;
        }
      } else {
        // Create new appointment
        const created = await firstValueFrom(
          this.calendarService.createAppointment(appointment)
        );
        
        // Add to local array
        this.presence.push(created);
      }
      
      this.refreshCalendar();
      this.closePopup();
    } catch (error: any) {
      console.error('Error assigning appointment:', error);
      const errorMessage = this.translateErrorMessage(error);
      alert(errorMessage);
    } finally {
      this.isBusy = false;
    }
  }

  async onAssignToUser(user: UserDisplay): Promise<void> {
    if (!this.appointmentPopupData) return;

    this.isBusy = true;
    try {
      const appointment: Appointment = {
        Subject: user.fullName,
        StartTime: this.appointmentPopupData.startTime,
        EndTime: this.appointmentPopupData.endTime,
        ResourceIds: this.appointmentPopupData.resourceIds
      };

      console.log('Appointment to create/update (assign to user):', appointment);

      if (this.isEditMode && this.appointmentPopupData.appointmentId) {
        // Update existing appointment
        const updated = await firstValueFrom(
          this.calendarService.updateAppointment(this.appointmentPopupData.appointmentId, appointment)
        );
        
        // Update in local array
        const index = this.presence.findIndex(a => a.Id === this.appointmentPopupData!.appointmentId);
        if (index !== -1) {
          this.presence[index] = updated;
        }
      } else {
        // Create new appointment
        const created = await firstValueFrom(
          this.calendarService.createAppointment(appointment)
        );
        
        // Add to local array
        this.presence.push(created);
      }
      
      this.refreshCalendar();
      this.closePopup();
    } catch (error: any) {
      console.error('Error assigning appointment:', error);
      const errorMessage = this.translateErrorMessage(error);
      alert(errorMessage);
    } finally {
      this.isBusy = false;
    }
  }

  async onDeleteAppointment(): Promise<void> {
    if (!this.appointmentPopupData?.appointmentId) return;

    const confirmed = confirm('Sei sicuro di voler eliminare questo appuntamento?');
    if (!confirmed) return;

    this.isBusy = true;
    try {
      // Call service to delete
      await firstValueFrom(
        this.calendarService.deleteAppointment(this.appointmentPopupData.appointmentId)
      );
      
      // Remove from local array
      this.presence = this.presence.filter(a => a.Id !== this.appointmentPopupData!.appointmentId);
      
      this.refreshCalendar();
      this.closePopup();
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      const errorMessage = error?.error?.message || error?.message || 'Errore durante l’eliminazione dell’appuntamento';
      alert(`Errore: ${errorMessage}`);
    } finally {
      this.isBusy = false;
    }
  }

  closePopup(): void {
    this.showAppointmentPopup = false;
    this.appointmentPopupData = undefined;
  }

  logout(): void {
    this.authService.logout();
  }
}
