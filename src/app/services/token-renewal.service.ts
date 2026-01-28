import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TokenRenewalService {
  private renewalInterval: any;
  private readonly RENEWAL_INTERVAL_DAYS = 25; // Renew every 25 days (before 30)

  constructor(private authService: AuthService) {
    this.startTokenRenewal();
  }

  private startTokenRenewal(): void {
    // Clear previous interval if exists
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
    }

    // Configure automatic renewal every 25 days
    const intervalMs = this.RENEWAL_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
    
    this.renewalInterval = setInterval(() => {
      if (this.authService.isAuthenticated) {
        this.authService.renewToken().catch(err => {
          console.error('Errore durante il rinnovo automatico del token:', err);
        });
      }
    }, intervalMs);

    // Also try to renew on startup if there's an active session
    if (this.authService.isAuthenticated) {
      this.authService.renewToken().catch(err => {
        console.debug('Impossibile rinnovare il token all\'avvio:', err);
      });
    }
  }

  stopTokenRenewal(): void {
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
      this.renewalInterval = null;
    }
  }
}
