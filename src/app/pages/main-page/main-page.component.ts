import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
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

interface Resource {
  Id: string;
  Name: string;
  Background: string;
  Foreground: string;
}

interface Appointment {
  Id?: string;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  ResourceIds?: string[];
  RecurrenceRule?: string;
}

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
constructor(private authService: AuthService) {
    const user = this.authService.currentUserValue;
    this.currentUserName = user?.name || user?.username || 'Utente';
  }

  
  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isBusy = true;
    
    // Sample data - replace with actual API calls
    this.resourceDataSource = [
      { Id: '1', Name: 'Persona 1', Background: '#00bdae', Foreground: '#ffffff' },
      { Id: '2', Name: 'Persona 2', Background: '#357cd2', Foreground: '#ffffff' },
      { Id: '3', Name: 'Persona 3', Background: '#7fa900', Foreground: '#ffffff' }
    ];

    this.presence = [
      {
        Id: '1',
        Subject: 'Presente',
        StartTime: new Date(2026, 0, 27, 8, 30),
        EndTime: new Date(2026, 0, 27, 9, 30),
        ResourceIds: ['1']
      }
    ];

    this.eventSettings = {
      dataSource: this.presence
    };

    setTimeout(() => {
      this.isBusy = false;
    }, 1000);
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
