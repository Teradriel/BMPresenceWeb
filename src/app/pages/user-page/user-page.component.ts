import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface User {
  name: string;
  lastName: string;
  username: string;
  isAdmin: boolean;
  createdAt: Date;
  lastActiveAt: Date | null;
}

@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-page.component.html',
  styleUrl: './user-page.component.css'
})
export class UserPageComponent {
  isBusy = false;

  // Mock user data - replace with actual service call
  user: User = {
    name: 'Mario',
    lastName: 'Rossi',
    username: 'mario.rossi',
    isAdmin: true,
    createdAt: new Date('2024-01-15T10:30:00'),
    lastActiveAt: new Date('2026-01-27T09:15:00')
  };

  onEditProfile(): void {
    console.log('Edit profile clicked');
    // Implement edit profile logic
  }

  onChangePassword(): void {
    console.log('Change password clicked');
    // Implement change password logic
  }

  onLogout(): void {
    if (confirm('Sei sicuro di voler uscire dall\'account?')) {
      console.log('Logout clicked');
      // Implement logout logic
    }
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
