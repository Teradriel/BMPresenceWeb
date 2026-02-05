import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenRenewalService } from './services/token-renewal.service';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

interface Tab {
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
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
  
  allTabs: Tab[] = [
    { label: 'Principale', path: '/main', icon: '🏠' },
    { label: 'Profilo', path: '/user', icon: '👤' },
    { label: 'Utenti', path: '/users-list', icon: '👥', adminOnly: true },
    { label: 'Informazioni', path: '/about', icon: 'ℹ️' }
  ];

  tabs: Tab[] = [];

  constructor(
    private tokenRenewalService: TokenRenewalService,
    private authService: AuthService,
    private router: Router
  ) {
    // The service initializes automatically
    
    // Hide navigation on login and register pages
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const url = event.urlAfterRedirects || event.url;
      this.showNavigation = !url.includes('/login') && !url.includes('/register');
      
      // Update tabs based on user role
      this.updateTabs();
    });

    // Initial tab setup
    this.updateTabs();
  }

  private updateTabs(): void {
    const currentUser = this.authService.currentUserValue;
    const isAdmin = currentUser?.isAdmin || false;

    // Filter tabs based on user role
    this.tabs = this.allTabs.filter((tab: Tab) => !tab.adminOnly || isAdmin);
  }
}
