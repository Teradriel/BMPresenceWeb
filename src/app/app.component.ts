import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenRenewalService } from './services/token-renewal.service';

interface Tab {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'BMPresenceWeb';
  
  tabs: Tab[] = [
    { label: 'Principale', path: '/main', icon: '🏠' },
    { label: 'Profilo', path: '/user', icon: '👤' },
    { label: 'Informazioni', path: '/about', icon: 'ℹ️' }
  ];

  constructor(private tokenRenewalService: TokenRenewalService) {
    // The service initializes automatically
  }
}
