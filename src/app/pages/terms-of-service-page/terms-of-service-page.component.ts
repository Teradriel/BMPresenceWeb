import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-terms-of-service-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms-of-service-page.component.html',
  styleUrl: './terms-of-service-page.component.css'
})
export class TermsOfServicePageComponent {
  private router = inject(Router);

  onAccept(): void {
    this.router.navigate(['/about']);
  }
}
