import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BmToast } from '../../shared/bm-ui';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-page.component.html'
})
export class RegisterPageComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private toast = inject(BmToast);
  
  name: string = '';
  lastName: string = '';
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  async onRegister() {
    this.errorMessage = '';

    // Validations
    if (!this.name || !this.lastName || !this.username || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Tutti i campi sono obbligatori';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La password deve essere di almeno 6 caratteri';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Le password non corrispondono';
      return;
    }

    this.isLoading = true;

    try {
      await this.authService.register({
        name: this.name,
        lastName: this.lastName,
        email: this.email.trim() || `${this.name}.${this.lastName}`.toLowerCase().replaceAll(' ', '.') + '@bluemobility.it',
        username: this.username,
        password: this.password
      });

      // Registration successful, redirect to login
      this.toast.show({ tone: 'info', text: 'Registrazione completata. Un amministratore deve attivare il tuo account prima del primo accesso.' });
      this.router.navigate(['/login']);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Errore durante la registrazione';
    } finally {
      this.isLoading = false;
    }
  }

  onCancel() {
    this.router.navigate(['/login']);
  }
}
