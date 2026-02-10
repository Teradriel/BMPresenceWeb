import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  errorMessage: string = '';
  isBusy: boolean = false;
  isForced: boolean = false;

  constructor() {
    // Verificar si es un cambio forzado
    this.route.queryParams.subscribe(params => {
      this.isForced = params['forced'] === 'true' || this.authService.mustChangePassword();
    });
  }

  async onChangePassword() {
    this.errorMessage = '';

    // Validaciones
    if (!this.currentPassword) {
      this.errorMessage = this.isForced 
        ? 'Inserisci la password temporale assegnata'
        : 'Inserisci la password attuale';
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Tutti i campi obbligatori devono essere compilati';
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
      
      // Limpiar el flag de cambio forzado
      this.authService.clearForceChangePassword();
      
      // Cambio de password exitoso, redirigir
      if (this.isForced) {
        // Si era forzado, ir a la página principal
        this.router.navigate(['/main']);
      } else {
        // Si era cambio normal, volver a perfil de usuario
        this.router.navigate(['/user']);
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Errore durante il cambio password';
    } finally {
      this.isBusy = false;
    }
  }

  onCancel() {
    if (this.isForced) {
      // Si es cambio forzado, no se puede cancelar, cerrar sesión
      this.authService.logout();
    } else {
      this.router.navigate(['/user']);
    }
  }
}
