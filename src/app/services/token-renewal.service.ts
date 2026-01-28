import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TokenRenewalService {
  private renewalInterval: any;
  private readonly RENEWAL_INTERVAL_DAYS = 25; // Renew every 25 days (before 30)
  private isStarted = false;

  constructor(private authService: AuthService) {
    // NO iniciar automáticamente, esperar a que se llame explícitamente
  }

  /**
   * Inicia la renovación automática de tokens.
   * DESACTIVADO TEMPORALMENTE - No hace nada.
   */
  public startTokenRenewal(): void {
    console.debug('Token renewal DISABLED - automatic renewal is turned off');
    return;
    
    /* CÓDIGO DESACTIVADO
    // Evitar múltiples inicios
    if (this.isStarted) {
      console.debug('Token renewal already started, skipping');
      return;
    }

    // Solo iniciar si hay sesión activa
    if (!this.authService.isAuthenticated) {
      console.debug('No authenticated session, skipping token renewal start');
      return;
    }

    // Clear previous interval if exists
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
    }

    // Configure automatic renewal every 25 days
    const intervalMs = this.RENEWAL_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
    
    this.renewalInterval = setInterval(() => {
      if (this.authService.isAuthenticated) {
        this.authService.renewToken().catch((err: any) => {
          console.error('Errore durante il rinnovo automatico del token:', err);
        });
      } else {
        // Si la sesión ya no está activa, detener la renovación
        this.stopTokenRenewal();
      }
    }, intervalMs);

    this.isStarted = true;
    console.debug(`Token renewal started. Next renewal in ${this.RENEWAL_INTERVAL_DAYS} days`);
    */
  }

  /**
   * Detiene la renovación automática de tokens.
   * Debe ser llamado al hacer logout.
   */
  public stopTokenRenewal(): void {
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
      this.renewalInterval = null;
      this.isStarted = false;
      console.debug('Token renewal stopped');
    }
  }
}
