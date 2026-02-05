import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, UserListItem } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-users-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-list-page.component.html',
  styleUrl: './users-list-page.component.css'
})
export class UsersListPageComponent implements OnInit {
  users: UserListItem[] = [];
  isBusy = false;
  errorMessage = '';
  currentUserId: string = '';
  
  // Estado para el diálogo de reset de password
  showResetDialog = false;
  selectedUser: UserListItem | null = null;
  newPassword = '';
  resetErrorMessage = '';

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {
    // Get current user ID to exclude from list
    const currentUser = this.authService.currentUserValue;
    this.currentUserId = currentUser?.id || '';
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.isBusy = true;
    this.errorMessage = '';
    
    try {
      const allUsers = await firstValueFrom(this.userService.getAllUsersDetailed());
      // Filter out current user
      this.users = allUsers.filter((u: UserListItem) => u.id !== this.currentUserId);
    } catch (error: any) {
      console.error('Error loading users:', error);
      this.errorMessage = 'Errore durante il caricamento degli utenti. Riprova più tardi.';
    } finally {
      this.isBusy = false;
    }
  }

  async deleteUser(user: UserListItem): Promise<void> {
    const confirmation = confirm(
      `Sei sicuro di voler eliminare l'utente ${user.name} ${user.lastName}?\n\n` +
      'Questa azione non può essere annullata.'
    );

    if (!confirmation) {
      return;
    }

    this.isBusy = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(this.userService.deleteUser(user.id));
      // Remove user from list
      this.users = this.users.filter((u: UserListItem) => u.id !== user.id);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      this.errorMessage = error?.error?.message || 'Errore durante l\'eliminazione dell\'utente. Riprova più tardi.';
    } finally {
      this.isBusy = false;
    }
  }

  formatDate(date: Date | null): string {
    if (!date) return 'Mai';
    
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getUserRole(isAdmin: boolean): string {
    return isAdmin ? 'Admin' : 'Utente';
  }

  /**
   * Abre el diálogo para resetear la contraseña de un usuario
   */
  openResetPasswordDialog(user: UserListItem): void {
    this.selectedUser = user;
    this.newPassword = '';
    this.resetErrorMessage = '';
    this.showResetDialog = true;
  }

  /**
   * Cierra el diálogo de reset de contraseña
   */
  closeResetDialog(): void {
    this.showResetDialog = false;
    this.selectedUser = null;
    this.newPassword = '';
    this.resetErrorMessage = '';
  }

  /**
   * Ejecuta el reset de contraseña
   */
  async executeResetPassword(): Promise<void> {
    if (!this.selectedUser) return;

    // Validar nueva contraseña
    if (!this.newPassword || this.newPassword.length < 6) {
      this.resetErrorMessage = 'La password deve essere di almeno 6 caratteri';
      return;
    }

    this.isBusy = true;
    this.resetErrorMessage = '';

    try {
      await firstValueFrom(
        this.userService.adminResetPassword(
          this.selectedUser.id,
          this.newPassword,
          true // forceChangeOnNextLogin
        )
      );

      // Cerrar diálogo
      this.closeResetDialog();

      // Mostrar mensaje de éxito (opcional)
      alert(`Password resettata per ${this.selectedUser.name} ${this.selectedUser.lastName}. L'utente dovrà cambiarla al prossimo accesso.`);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      this.resetErrorMessage = error?.error?.message || 'Errore durante il reset della password. Riprova più tardi.';
    } finally {
      this.isBusy = false;
    }
  }
}
