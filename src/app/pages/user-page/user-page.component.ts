import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CalendarService } from '../../services/calendar.service';
import { ThemeService, ThemeMode } from '../../services/theme.service';
import { BmConfirm, BmSlidingGroup } from '../../shared/bm-ui';
import { DOW, addDays, ddmm, fromIso, iso, weekday } from '../../shared/week';

interface User {
  name: string;
  lastName: string;
  username: string;
  isAdmin: boolean;
  createdAt: Date;
  lastActiveAt: Date | null;
}

@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [CommonModule, RouterLink, BmSlidingGroup],
  templateUrl: './user-page.component.html'
})
export class UserPageComponent implements OnInit {
  private calendar = inject(CalendarService);
  private confirm = inject(BmConfirm);
  protected theme = inject(ThemeService);
  protected themes: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'Sistema' },
    { value: 'light', label: 'Chiaro' },
    { value: 'dark', label: 'Scuro' }
  ];
  nextShift = '—';
  nextShiftSub = '';
  email = '';

  get initials(): string {
    return `${this.user.name?.[0] ?? ''}${this.user.lastName?.[0] ?? ''}`.toUpperCase();
  }

  async ngOnInit(): Promise<void> {
    try {
      const me = Number(this.authService.currentUserValue?.id);
      const today = iso(new Date());
      const [resources, occ] = await Promise.all([
        firstValueFrom(this.calendar.getResources()),
        firstValueFrom(this.calendar.getOccurrences(today, iso(addDays(new Date(), 21))))
      ]);
      const mine = occ.filter(o => o.userId === me).sort((a, b) => a.date.localeCompare(b.date));
      if (mine.length) {
        const d = fromIso(mine[0].date);
        const where = [...new Set(mine.filter(o => o.date === mine[0].date).map(o => resources.find(r => r.id === o.resourceId)?.name))].join(' e ');
        this.nextShift = `${DOW[weekday(d)]} ${ddmm(d)}`;
        this.nextShiftSub = `${where} · 08:30`;
      } else {
        this.nextShiftSub = 'Nessun turno nelle prossime 3 settimane';
      }
    } catch {
      this.nextShiftSub = 'Presenze non disponibili';
    }
  }

  private router = inject(Router);
  private authService = inject(AuthService);
  isBusy = false;

  constructor() {
    // Load current user data if available
    const currentUser = this.authService.currentUserValue;
    this.email = currentUser?.email ?? '';
    if (currentUser) {
      this.user.name = currentUser.name || 'Utente';
      this.user.lastName = currentUser.lastName || '';
      this.user.username = currentUser.username || '';
      this.user.isAdmin = currentUser.isAdmin || false;
      this.user.createdAt = currentUser.createdAt ? new Date(currentUser.createdAt) : new Date();
      this.user.lastActiveAt = currentUser.lastActiveAt ? new Date(currentUser.lastActiveAt) : null;
    }
  }

  user: User = {
    name: '',
    lastName: '',
    username: '',
    isAdmin: false,
    createdAt: new Date(),
    lastActiveAt: null
  };

  onEditProfile(): void {
    this.router.navigate(['/edit-user']);
  }

  onChangePassword(): void {
    this.router.navigate(['/change-password']);
  }

  async onLogout(): Promise<void> {
    if (await this.confirm.ask({ title: 'Uscire dall\'account?', message: 'Dovrai accedere di nuovo per vedere le presenze.', confirmLabel: 'Esci', danger: true })) {
      this.authService.logout();
    }
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
