import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserDisplay } from '../../services/user.service';

export interface User {
  id: string;
  username: string;
  name?: string;
  lastName?: string;
  fullName?: string;
}

export interface AppointmentData {
  startTime: Date;
  endTime: Date;
  resourceIds: string[];
  resourceName: string;
  appointmentId?: string;
}

@Component({
  selector: 'app-appointment-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-popup.component.html',
  styleUrls: ['./appointment-popup.component.css']
})
export class AppointmentPopupComponent {
  @Input() isVisible = false;
  @Input() appointmentData?: AppointmentData;
  @Input() currentUser?: User;
  @Input() users: UserDisplay[] = [];
  @Input() isEditMode = false;

  @Output() assignToMe = new EventEmitter<void>();
  @Output() assignToUser = new EventEmitter<UserDisplay>();
  @Output() deleteAppointment = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  selectedUser?: UserDisplay;

  onAssignToMe(): void {
    this.assignToMe.emit();
  }

  onAssignToSelectedUser(): void {
    if (this.selectedUser) {
      this.assignToUser.emit(this.selectedUser);
    }
  }

  onDelete(): void {
    this.deleteAppointment.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  get isAssignButtonEnabled(): boolean {
    return !!this.selectedUser;
  }

  get sortedUsers(): UserDisplay[] {
    return [...this.users].sort((a, b) => {
      const nameA = a.fullName || `${a.name} ${a.lastName}` || a.username;
      const nameB = b.fullName || `${b.name} ${b.lastName}` || b.username;
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  }
}
