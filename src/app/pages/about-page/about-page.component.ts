import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-page.component.html'
})
export class AboutPageComponent {
  private router = inject(Router);
  isBusy = false;
  version = '2.0.0';
  device = `${navigator.platform} · ${navigator.userAgent.includes('Mobile') ? 'telefono' : 'browser'}`;

  onSupportClicked(): void {
    window.location.href = 'mailto:luca.terzariol@bluemobility.it?subject=Richiesta Supporto BMPresence';
  }

  onTermsOfServiceTapped(): void {
    this.router.navigate(['/terms-of-service']);
  }

  onPrivacyPolicyTapped(): void {
    this.router.navigate(['/privacy-policy']);
  }
}
