import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenRenewalService } from './services/token-renewal.service';
import { filter } from 'rxjs/operators';

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
  showNavigation = true;
  
  tabs: Tab[] = [
    { label: 'Principale', path: '/main', icon: '🏠' },
    { label: 'Profilo', path: '/user', icon: '👤' },
    { label: 'Informazioni', path: '/about', icon: 'ℹ️' }
  ];

  constructor(
    private tokenRenewalService: TokenRenewalService,
    private router: Router
  ) {
    // The service initializes automatically
    
    // Hide navigation on login and register pages
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      this.showNavigation = !url.includes('/login') && !url.includes('/register');
    });
  }
}
