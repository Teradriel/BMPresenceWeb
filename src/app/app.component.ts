import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

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
    { label: 'Principal', path: '/main', icon: '🏠' },
    { label: 'Perfil', path: '/user', icon: '👤' },
    { label: 'Acerca de', path: '/about', icon: 'ℹ️' }
  ];
}
