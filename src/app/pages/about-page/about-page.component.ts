import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.css'
})
export class AboutPageComponent {
  isBusy = false;

  constructor(private router: Router) {}

  onSupportClicked(): void {
    window.location.href = 'mailto:luca.terzariol@bluemobility.it?subject=Richiesta Supporto BMPresence';
  }

  onCheckUpdatesClicked(): void {
    alert('Stai utilizzando l\'ultima versione disponibile!');
  }

  onTermsOfServiceTapped(): void {
    this.router.navigate(['/terms-of-service']);
  }

  onPrivacyPolicyTapped(): void {
    this.router.navigate(['/privacy-policy']);
  }
}
