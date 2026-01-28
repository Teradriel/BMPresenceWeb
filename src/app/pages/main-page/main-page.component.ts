import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CalendarService, Resource, Appointment } from '../../services/calendar.service';
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
  ResourceDetails
} from '@syncfusion/ej2-angular-schedule';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CommonModule, ScheduleModule],
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
constructor(
    private authService: AuthService,
    private calendarService: CalendarService
  ) {
    const user = this.authService.currentUserValue;
    this.currentUserName = user?.name || user?.username || 'Utente';
  }

  
  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isBusy = true;
    
    try {
      // Cargar recursos desde el backend
      this.resourceDataSource = await firstValueFrom(
        this.calendarService.getResources()
      );

      // Cargar appointments desde el backend
      this.presence = await firstValueFrom(
        this.calendarService.getAppointments()
      );

      // Actualizar configuración de eventos
      this.eventSettings = {
        dataSource: this.presence
      };

      console.log('Datos cargados:', {
        resources: this.resourceDataSource.length,
        appointments: this.presence.length
      });
    } catch (error: any) {
      console.error('Error cargando datos del calendario:', error);
      
      // Mostrar mensaje de error al usuario
      const errorMessage = error?.error?.message || error?.message || 'Error al cargar los datos del calendario';
      alert(`Error: ${errorMessage}`);
      
      // Mantener datos vacíos en caso de error
      this.resourceDataSource = [];
      this.presence = [];
      this.eventSettings = {
        dataSource: this.presence
      };
    } finally {
      this.isBusy = false;
    }
  }

  refreshCalendar(): void {
    console.log('Aggiornamento calendario...');
    this.loadData();
    if (this.scheduleObj) {
      this.scheduleObj.refresh();
    }
  }

  onCellClick(args: any): void {
    console.log('Cella cliccata:', args);
    // Implement logic to add presence
  }

  onEventClick(args: any): void {
    console.log('Evento cliccato:', args);
  }

  logout(): void {
    this.authService.logout();
  }
}
