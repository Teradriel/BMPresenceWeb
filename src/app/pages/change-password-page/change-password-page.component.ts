import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password-page.component.html',
  styleUrl: './change-password-page.component.css'
})
export class ChangePasswordPageComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  isBusy: boolean = false;

  async onChangePassword() {
    this.errorMessage = '';

    // Validations
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Tutti i campi sono obbligatori';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'La nuova password deve essere di almeno 6 caratteri';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Le password non corrispondono';
      return;
    }

    if (this.currentPassword === this.newPassword) {
      this.errorMessage = 'La nuova password deve essere diversa da quella attuale';
      return;
    }

    this.isBusy = true;

    try {
      await this.authService.changePassword(this.currentPassword, this.newPassword);
      
      // Password change successful, go back to previous page
      this.router.navigate(['/user']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Errore durante il cambio password';
    } finally {
      this.isBusy = false;
    }
  }

  onCancel() {
    this.router.navigate(['/user']);
  }
}
