import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css'
})
export class RegisterPageComponent {
  name: string = '';
  lastName: string = '';
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async onRegister() {
    this.errorMessage = '';

    // Validations
    if (!this.name || !this.lastName || !this.username || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Tutti i campi sono obbligatori';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Inserisci un indirizzo email valido';
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
        username: this.username,
        email: this.email,
        password: this.password
      });

      // Registration successful, redirect to login
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
