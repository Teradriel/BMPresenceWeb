import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UserDTO, UserService } from '../../services/user.service';
import { BmFormPanel, BmToast, inputClass } from '../../shared/bm-ui';

/** Pannello «Nuovo utente / Modifica utente» (solo amministratori), come nell'app MAUI. */
@Component({
  selector: 'app-user-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BmFormPanel, FormsModule],
  template: `
    <bm-form-panel [title]="user() ? 'Modifica utente' : 'Nuovo utente'" icon="user" [width]="520" [dirty]="dirty()" [busy]="busy()" [error]="error()" [canSave]="canSave()" (save)="save()" (closed)="closed.emit()">
      <div class="flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="flex flex-col gap-2 text-[13px] font-medium text-ink-2">Nome <input [class]="input" [ngModel]="name()" (ngModelChange)="name.set($event)" name="name" /></label>
          <label class="flex flex-col gap-2 text-[13px] font-medium text-ink-2">Cognome <input [class]="input" [ngModel]="lastName()" (ngModelChange)="lastName.set($event)" name="lastName" /></label>
          <label class="flex flex-col gap-2 text-[13px] font-medium text-ink-2">Nome utente <input [class]="input" [ngModel]="username()" (ngModelChange)="username.set($event)" name="username" /></label>
          <label class="flex flex-col gap-2 text-[13px] font-medium text-ink-2">Email <input type="email" [class]="input" [ngModel]="email()" (ngModelChange)="email.set($event)" name="email" /></label>
        </div>

        @if (!user()) {
          <label class="flex flex-col gap-2 text-[13px] font-medium text-ink-2">
            Password temporanea
            <input type="password" [class]="input" placeholder="Almeno 6 caratteri" [ngModel]="password()" (ngModelChange)="password.set($event)" name="password" autocomplete="new-password" />
            <span class="text-xs font-normal text-muted">L'utente dovrà cambiarla al primo accesso.</span>
          </label>
        }

        @if (!isSelf()) {
          <div class="flex items-center justify-between gap-4">
            <span class="flex flex-col"><b class="text-sm font-medium">Amministratore</b><span class="text-xs text-muted">Può gestire utenti e nominare altri amministratori.</span></span>
            <button type="button" role="switch" [attr.aria-checked]="isAdmin()" aria-label="Amministratore" (click)="isAdmin.set(!isAdmin())" [class]="sw(isAdmin())"><span [class]="knob(isAdmin())"></span></button>
          </div>
          <div class="flex items-center justify-between gap-4">
            <span class="flex flex-col"><b class="text-sm font-medium">Account attivo</b><span class="text-xs text-muted">Se spento, l'utente non può accedere.</span></span>
            <button type="button" role="switch" [attr.aria-checked]="active()" aria-label="Account attivo" (click)="active.set(!active())" [class]="sw(active())"><span [class]="knob(active())"></span></button>
          </div>
        }
      </div>
    </bm-form-panel>
  `,
})
export class UserPanelComponent {
  private readonly users = inject(UserService);
  private readonly toast = inject(BmToast);

  readonly user = input<UserDTO | null>(null);
  readonly isSelf = input(false);
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly input = inputClass;
  protected readonly name = signal('');
  protected readonly lastName = signal('');
  protected readonly username = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly isAdmin = signal(false);
  protected readonly active = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    queueMicrotask(() => {
      const u = this.user();
      this.name.set(u?.name ?? '');
      this.lastName.set(u?.lastName ?? '');
      this.username.set(u?.username ?? '');
      this.email.set(u?.email ?? '');
      this.isAdmin.set(u?.isAdmin ?? false);
      this.active.set(u?.active ?? true);
    });
  }

  protected readonly dirty = computed(() => {
    const u = this.user();
    return !u || this.name() !== (u.name ?? '') || this.lastName() !== (u.lastName ?? '') || this.username() !== (u.username ?? '') || this.email() !== (u.email ?? '') || this.isAdmin() !== !!u.isAdmin || this.active() !== !!u.active;
  });

  protected readonly canSave = computed(
    () => !!this.name().trim() && !!this.lastName().trim() && !!this.username().trim() && !!this.email().trim() && (!!this.user() || this.password().length >= 6),
  );

  protected sw(on: boolean): string {
    return `flex h-7 w-12 items-center rounded-full p-[3px] transition-colors ${on ? 'bg-lime' : 'bg-control'}`;
  }

  protected knob(on: boolean): string {
    return `size-[22px] rounded-full shadow-sm transition-transform ${on ? 'translate-x-5 bg-[#15171c] shadow-none' : 'bg-white'}`;
  }

  protected async save(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const u = this.user();
      if (!u) {
        await firstValueFrom(
          this.users.adminCreate({ name: this.name().trim(), lastName: this.lastName().trim(), email: this.email().trim(), username: this.username().trim(), password: this.password(), isAdmin: this.isAdmin(), active: this.active() }),
        );
        this.toast.show({ tone: 'ok', text: 'Utente creato. Dovrà cambiare la password al primo accesso.' });
      } else {
        await firstValueFrom(
          this.users.updateUser(u.id, {
            name: this.name().trim(),
            lastName: this.lastName().trim(),
            username: this.username().trim(),
            email: this.email().trim(),
            isAdmin: this.isSelf() ? u.isAdmin : this.isAdmin(),
            active: this.isSelf() ? u.active : this.active(),
          }),
        );
        this.toast.show({ tone: 'ok', text: 'Utente aggiornato' });
      }
      this.saved.emit();
    } catch (e) {
      const body = e instanceof HttpErrorResponse ? e.error : null;
      this.error.set(typeof body === 'string' && body ? body : body?.message ?? 'Impossibile salvare l’utente. Riprova più tardi.');
    } finally {
      this.busy.set(false);
    }
  }
}
