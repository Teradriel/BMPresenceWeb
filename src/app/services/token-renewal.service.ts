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
    // DO NOT start automatically, wait for explicit call
  }

  /**
   * Starts automatic token renewal.
   * TEMPORARILY DISABLED - Does nothing.
   */
  public startTokenRenewal(): void {
    console.debug('Token renewal DISABLED - automatic renewal is turned off');
    return;
    
    /* DISABLED CODE
    // Avoid multiple starts
    if (this.isStarted) {
      console.debug('Token renewal already started, skipping');
      return;
    }

    // Only start if there's an active session
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
          console.error('Error during automatic token renewal:', err);
        });
      } else {
        // If the session is no longer active, stop renewal
        this.stopTokenRenewal();
      }
    }, intervalMs);

    this.isStarted = true;
    console.debug(`Token renewal started. Next renewal in ${this.RENEWAL_INTERVAL_DAYS} days`);
    */
  }

  /**
   * Stops automatic token renewal.
   * Should be called on logout.
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
