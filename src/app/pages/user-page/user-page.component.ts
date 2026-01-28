import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Load current user data if available
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.user.name = currentUser.name || 'Utente';
      this.user.lastName = currentUser.lastName || '';
      this.user.username = currentUser.username;
    }
  }

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
    this.router.navigate(['/change-password']);
  }

  onLogout(): void {
    if (confirm('Sei sicuro di voler uscire dall\'account?')) {
      this.authService.logout();
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
