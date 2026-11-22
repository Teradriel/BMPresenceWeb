import { Component, computed, inject, viewChild } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Calendar, Info, User, Users } from 'lucide-angular';
import { filter, map } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { ConnectionService } from './services/connection.service';
import { ThemeMode, ThemeService } from './services/theme.service';
import {
  BmBadge,
  BmIcon,
  BmMenuItem,
  BmNavEntry,
  BmRowMenu,
  BmSidebar,
  BmToastOutlet,
} from './shared/bm-ui';

const TITLES: Record<string, [string, string]> = {
  '/main': ['Presenze', 'Chi è presente alle 8:30 su Mobile e OnLog'],
  '/users-list': ['Utenti', 'Account, ruoli e accessi'],
  '/user': ['Profilo', 'I tuoi dati e la sicurezza dell’account'],
  '/about': ['Informazioni', 'Versione e documenti'],
  '/edit-user': ['Modifica profilo', 'I tuoi dati'],
  '/change-password': ['Cambia password', 'Sicurezza dell’account'],
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, BmSidebar, BmRowMenu, BmBadge, BmIcon, BmToastOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {
  protected readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly connection = inject(ConnectionService);
  protected readonly themeMenu = viewChild.required<BmRowMenu>('themeMenu');
  protected readonly userMenu = viewChild.required<BmRowMenu>('userMenu');

  protected readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => (e.urlAfterRedirects || e.url).split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  /** Accesso e registrazione: niente menu né barra, il titolo resta in pagina. */
  protected readonly showShell = computed(() => !['/login', '/register', '/'].includes(this.url()) && !!this.auth.currentUserValue);

  protected readonly user = toSignal(this.auth.currentUser, { initialValue: this.auth.currentUserValue });
  protected readonly isAdmin = computed(() => !!this.user()?.isAdmin);
  protected readonly fullName = computed(() => `${this.user()?.name ?? ''} ${this.user()?.lastName ?? ''}`.trim() || (this.user()?.username ?? ''));
  protected readonly initials = computed(() => `${this.user()?.name?.[0] ?? ''}${this.user()?.lastName?.[0] ?? ''}`.toUpperCase() || (this.user()?.username?.[0] ?? '?').toUpperCase());
  protected readonly title = computed(() => TITLES[this.url()] ?? ['BMPresence', '']);

  protected readonly entries = computed<BmNavEntry[]>(() => [
    { key: 'presenze', label: 'Presenze', href: '/main', icon: Calendar },
    { key: 'profilo', label: 'Profilo', href: '/user', icon: User, match: (u: string) => u === '/user' },
    ...(this.isAdmin() ? [{ key: 'utenti', label: 'Utenti', href: '/users-list', icon: Users }] : []),
    { key: 'info', label: 'Informazioni', href: '/about', icon: Info },
  ]);

  protected readonly tabs = computed(() => this.entries().map((e) => e as { key: string; label: string; href: string }));

  protected readonly themeItems = computed<BmMenuItem[]>(() => {
    const cur = this.theme.mode();
    const item = (mode: ThemeMode, label: string, hint: string, icon: string): BmMenuItem => ({
      key: mode,
      label: label + (cur === mode ? '  ✓' : ''),
      hint: cur === mode ? `In uso · ${hint}` : hint,
      icon,
      select: () => this.theme.set(mode),
    });
    return [
      item('system', 'Sistema', 'Segue le impostazioni del dispositivo', 'monitor'),
      item('light', 'Chiaro', 'Sempre chiaro', 'sun'),
      item('dark', 'Scuro', 'Sempre scuro', 'moon'),
    ];
  });

  protected readonly userItems = computed<BmMenuItem[]>(() => [
    { key: 'edit', label: 'Modifica profilo', icon: 'pencil', select: () => void this.router.navigate(['/edit-user']) },
    { key: 'pw', label: 'Cambia password', icon: 'lock', select: () => void this.router.navigate(['/change-password']) },
    { key: 'out', label: 'Esci', icon: 'log-out', danger: true, select: () => this.logout() },
  ]);

  protected isActive(href: string): boolean {
    const u = this.url();
    return u === href || u.startsWith(href + '/');
  }

  protected openTheme(e: MouseEvent): void {
    this.themeMenu().openAtPoint(e);
  }

  protected openUser(e: MouseEvent): void {
    this.userMenu().openAtPoint(e);
  }

  private logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
