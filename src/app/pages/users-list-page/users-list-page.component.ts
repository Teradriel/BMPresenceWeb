import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserDTO, UserService } from '../../services/user.service';
import { BmBadge, BmConfirm, BmFormPanel, BmIcon, BmMenuItem, BmPager, BmRowMenu, BmSlidingGroup, BmToast, BmTone, buttonClass, inputClass } from '../../shared/bm-ui';
import { UserPanelComponent } from './user-panel.component';

type Tab = 'all' | 'active' | 'inactive' | 'admin';
type Col = 'name' | 'role' | 'status' | 'created' | 'seen';

const PAGE_SIZE = 10;

const fullName = (u: UserDTO): string => `${u.name ?? ''} ${u.lastName ?? ''}`.trim() || u.username;
const date = (s?: string): string => (s ? new Date(s).toLocaleDateString('it-IT') : '—');
const dateTime = (s?: string): string => (s ? new Date(s).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—');

/** Gestione utenti (solo amministratori): ricerca, schede di stato, ordinamento, pagine, menu di riga e pannelli. */
@Component({
  selector: 'app-users-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, BmBadge, BmIcon, BmPager, BmRowMenu, BmSlidingGroup, BmFormPanel, UserPanelComponent],
  templateUrl: './users-list-page.component.html',
})
export class UsersListPageComponent implements OnInit {
  private readonly users = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(BmConfirm);
  private readonly toast = inject(BmToast);

  protected readonly primary = buttonClass.primary;
  protected readonly secondary = buttonClass.secondary;
  protected readonly input = inputClass;
  protected readonly fullName = fullName;
  protected readonly date = date;
  protected readonly dateTime = dateTime;

  protected readonly all = signal<UserDTO[]>([]);
  protected readonly loading = signal(false);
  protected readonly query = signal('');
  protected readonly tab = signal<Tab>('all');
  protected readonly sortCol = signal<Col>('name');
  protected readonly asc = signal(true);
  protected readonly page = signal(1);
  protected readonly panel = signal<{ user: UserDTO | null } | null>(null);
  protected readonly resetFor = signal<UserDTO | null>(null);
  protected readonly newPassword = signal('');
  protected readonly resetError = signal<string | null>(null);
  protected readonly resetBusy = signal(false);

  protected readonly meId = computed(() => String(this.auth.currentUserValue?.id ?? ''));

  protected readonly tabs = computed(() => {
    const a = this.all();
    return [
      { value: 'all' as Tab, label: 'Tutti', n: a.length },
      { value: 'active' as Tab, label: 'Attivi', n: a.filter((u) => u.active).length },
      { value: 'inactive' as Tab, label: 'Disattivi', n: a.filter((u) => !u.active).length },
      { value: 'admin' as Tab, label: 'Amministratori', n: a.filter((u) => u.isAdmin).length },
    ];
  });

  protected readonly cols: { key: Col; label: string }[] = [
    { key: 'name', label: 'Utente' },
    { key: 'role', label: 'Ruolo' },
    { key: 'status', label: 'Stato' },
    { key: 'created', label: 'Creato' },
    { key: 'seen', label: 'Ultimo accesso' },
  ];

  private readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const tab = this.tab();
    const list = this.all().filter(
      (u) =>
        (tab === 'all' || (tab === 'active' && u.active) || (tab === 'inactive' && !u.active) || (tab === 'admin' && u.isAdmin)) &&
        (!q || [fullName(u), u.username, u.email ?? ''].some((s) => s.toLowerCase().includes(q))),
    );
    const dir = this.asc() ? 1 : -1;
    const key = (u: UserDTO): string | number => {
      switch (this.sortCol()) {
        case 'role': return u.isAdmin ? 0 : 1;
        case 'status': return !u.active ? 2 : u.mustChangePassword ? 1 : 0;
        case 'created': return u.createdAt ? new Date(u.createdAt).getTime() : 0;
        case 'seen': return u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
        default: return fullName(u).toLowerCase();
      }
    };
    return [...list].sort((a, b) => {
      // gli accessi vuoti stanno sempre in fondo, in entrambi i sensi
      if (this.sortCol() === 'seen' && !a.lastActiveAt !== !b.lastActiveAt) return a.lastActiveAt ? -1 : 1;
      const x = key(a);
      const y = key(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir || fullName(a).localeCompare(fullName(b));
    });
  });

  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  protected readonly rows = computed(() => this.filtered().slice((Math.min(this.page(), this.pages()) - 1) * PAGE_SIZE, Math.min(this.page(), this.pages()) * PAGE_SIZE));
  protected readonly range = computed(() => {
    const total = this.filtered().length;
    const p = Math.min(this.page(), this.pages());
    return total === 0 ? 'Nessun utente' : `${(p - 1) * PAGE_SIZE + 1}–${Math.min(total, p * PAGE_SIZE)} di ${total}`;
  });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.all.set(await firstValueFrom(this.users.listAll()));
    } catch {
      this.toast.show({ tone: 'err', text: 'Impossibile leggere gli utenti. Controlla la connessione.' });
    } finally {
      this.loading.set(false);
    }
  }

  protected setTab(t: Tab): void {
    this.tab.set(t);
    this.page.set(1);
  }

  protected setQuery(q: string): void {
    this.query.set(q);
    this.page.set(1);
  }

  /** Primo clic crescente, secondo decrescente. */
  protected sort(c: Col): void {
    if (this.sortCol() === c) this.asc.update((a) => !a);
    else {
      this.sortCol.set(c);
      this.asc.set(true);
    }
    this.page.set(1);
  }

  protected ariaSort(c: Col): string | null {
    return this.sortCol() === c ? (this.asc() ? 'ascending' : 'descending') : null;
  }

  protected roleTone(u: UserDTO): BmTone {
    return u.isAdmin ? 'accent' : 'neutral';
  }

  protected statusText(u: UserDTO): string {
    return !u.active ? 'Disattivo' : u.mustChangePassword ? 'Deve cambiare password' : 'Attivo';
  }

  protected statusTone(u: UserDTO): BmTone {
    return !u.active ? 'neutral' : u.mustChangePassword ? 'warn' : 'ok';
  }

  protected menuItems(u: UserDTO): BmMenuItem[] {
    const self = String(u.id) === this.meId();
    const items: BmMenuItem[] = [
      { key: 'edit', label: 'Modifica', hint: 'Dati, ruolo e stato', icon: 'pencil', select: () => this.panel.set({ user: u }) },
      { key: 'reset', label: 'Reset password', hint: 'Imposta una password temporanea', icon: 'lock', select: () => this.openReset(u) },
    ];
    if (!self) {
      items.push({ key: 'toggle', label: u.active ? 'Disattiva' : 'Attiva', hint: u.active ? 'Non potrà più accedere' : 'Potrà di nuovo accedere', icon: 'user-check', select: () => void this.setActive(u, !u.active) });
      items.push({ key: 'delete', label: 'Elimina', hint: 'Per sempre, con i suoi dati', icon: 'trash', danger: true, select: () => void this.remove(u) });
    }
    return items;
  }

  protected async setActive(u: UserDTO, active: boolean): Promise<void> {
    try {
      await firstValueFrom(this.users.updateUser(u.id, { name: u.name, lastName: u.lastName, username: u.username, email: u.email, isAdmin: u.isAdmin, active }));
      this.toast.show({ tone: 'ok', text: active ? `${fullName(u)} è di nuovo attivo` : `${fullName(u)} è stato disattivato` });
      void this.load();
    } catch {
      this.toast.show({ tone: 'err', text: 'Impossibile aggiornare l’utente.' });
    }
  }

  protected async remove(u: UserDTO): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminare l’utente?',
      message: `${fullName(u)} sarà eliminato per sempre, insieme ai suoi dati. Se vuoi solo impedirgli l’accesso, disattivalo.`,
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.users.hardDelete(u.id));
      this.toast.show({ tone: 'ok', text: `Utente '${fullName(u)}' eliminato` });
      void this.load();
    } catch {
      this.toast.show({ tone: 'err', text: `Impossibile eliminare l'utente '${fullName(u)}'.` });
    }
  }

  protected openReset(u: UserDTO): void {
    this.newPassword.set('');
    this.resetError.set(null);
    this.resetFor.set(u);
  }

  protected async doReset(): Promise<void> {
    const u = this.resetFor();
    if (!u || this.resetBusy()) return;
    this.resetBusy.set(true);
    this.resetError.set(null);
    try {
      await firstValueFrom(this.users.adminResetPassword(u.id, this.newPassword(), true));
      this.toast.show({ tone: 'ok', text: `Password resettata per '${fullName(u)}'. Dovrà cambiarla al prossimo accesso.` });
      this.resetFor.set(null);
      void this.load();
    } catch (e) {
      const body = e instanceof HttpErrorResponse ? e.error : null;
      this.resetError.set(body?.message ?? 'Errore durante il reset della password. Riprova più tardi.');
    } finally {
      this.resetBusy.set(false);
    }
  }

  protected afterSave(): void {
    this.panel.set(null);
    void this.load();
  }
}
