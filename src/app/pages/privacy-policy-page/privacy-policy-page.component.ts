import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-privacy-policy-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy-policy-page.component.html',
  styleUrl: './privacy-policy-page.component.css'
})
export class PrivacyPolicyPageComponent {
  constructor(private router: Router) {}

  onAccept(): void {
    this.router.navigate(['/about']);
  }
}
