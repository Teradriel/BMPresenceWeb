import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppointmentRequest, CalendarService, Colleague, Occurrence, Resource } from '../../services/calendar.service';
import { BmFormPanel, BmIcon, BmOption, BmSelect, BmSlidingGroup, BmToast, buttonClass } from '../../shared/bm-ui';
import { DOW, DOW3, addDays, buildRule, ddmm, ddmmyyyy, fromIso, iso, isWeekend, maxUntil, monday, ruleDays, weekday } from '../../shared/week';

/** Pannello a destra «Aggiungi / Cambia presenza»: giorno, risorsa, persona e ripetizione (come nell'app MAUI). */
@Component({
  selector: 'app-assign-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BmFormPanel, BmSelect, BmSlidingGroup, BmIcon],
  template: `
    <bm-form-panel
      [title]="existing() ? 'Cambia presenza' : 'Aggiungi presenza'"
      icon="calendar"
      [dirty]="dirty()"
      [busy]="busy()"
      [error]="error()"
      [canSave]="canSave()"
      saveLabel="Salva"
      (save)="save()"
      (closed)="closed.emit()"
    >
      <div class="flex flex-col gap-5">
        @if (series()) {
          <div class="flex gap-2.5 rounded-[10px] bg-accent-soft px-3.5 py-3 text-[13px] leading-relaxed text-accent-ink">
            <bm-icon name="repeat" [size]="16" class="mt-0.5" />
            <span>Fa parte di una serie: quello che cambi vale da questo giorno in poi; le presenze prima restano.</span>
          </div>
        }

        <label class="flex flex-col gap-2 text-[13px] font-medium text-ink-2">
          Giorno
          <bm-select [options]="dayOptions()" [(value)]="dayIso" ariaLabel="Giorno" />
        </label>

        <label class="flex flex-col gap-2 text-[13px] font-medium text-ink-2">
          Risorsa
          <bm-select [options]="resourceOptions()" [(value)]="resId" ariaLabel="Risorsa" />
        </label>

        <div class="flex flex-col gap-2">
          <span class="text-[13px] font-medium text-ink-2">Chi</span>
          <div class="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Chi">
            <button type="button" role="radio" [attr.aria-checked]="whoMe()" (click)="whoMe.set(true)" [class]="option(whoMe())">
              <span class="font-semibold">Io</span>
              <span class="text-[12.5px] text-muted" [class.text-orange-ink]="meHere()">{{ meDescription() }}</span>
            </button>
            <button type="button" role="radio" [attr.aria-checked]="!whoMe()" (click)="whoMe.set(false)" [class]="option(!whoMe())">
              <span class="font-semibold">Un collega</span>
              <span class="text-[12.5px] text-muted">Scegli dall'elenco qui sotto</span>
            </button>
          </div>
        </div>

        @if (!whoMe()) {
          <label class="flex flex-col gap-2 text-[13px] font-medium text-ink-2">
            Collega
            <bm-select [options]="colleagueOptions()" [(value)]="colleagueId" placeholder="Scegli un collega" ariaLabel="Collega" />
            <span class="text-xs font-normal text-muted">Chi è già su questa risorsa quel giorno è segnato e in fondo all'elenco.</span>
          </label>
        }

        <section class="flex flex-col gap-4 rounded-xl border border-line bg-subtle p-4">
          <div class="flex flex-col gap-2">
            <span class="text-[13px] font-medium text-ink-2">Ripeti</span>
            <bm-sliding-group label="Ripeti" boxClass="self-start">
              @for (o of repeatModes; track o.value) {
                <button type="button" class="relative z-[1] h-8 rounded-lg px-3 text-[13px] font-medium" [attr.data-active]="repeat() === o.value" [class]="repeat() === o.value ? 'text-ink' : 'text-ink-2'" (click)="repeat.set(o.value)">
                  {{ o.label }}
                </button>
              }
            </bm-sliding-group>
          </div>

          @if (repeat() === 'days') {
            <div class="flex flex-col gap-2">
              <span class="text-[13px] font-medium text-ink-2">Giorni della settimana</span>
              <div class="flex flex-wrap gap-1.5" role="group" aria-label="Giorni">
                @for (l of dow3; track l; let i = $index) {
                  <button
                    type="button"
                    class="h-9 min-w-[54px] rounded-[9px] border px-2.5 text-[13px] font-medium"
                    [class]="flags().includes(i) ? 'border-accent bg-accent-wash text-accent-ink' : 'border-line-strong bg-surface text-ink-2 hover:bg-sunken'"
                    [attr.aria-pressed]="flags().includes(i)"
                    [title]="isStartDay(i) ? 'Giorno di inizio: resta scelto' : ''"
                    (click)="toggleDay(i)"
                  >
                    {{ l }}
                  </button>
                }
              </div>
              <span class="text-xs text-muted">Si ripete ogni settimana nei giorni scelti. Il giorno di inizio resta sempre scelto.</span>
            </div>
          }

          @if (repeat() !== 'none') {
            <div class="flex flex-col gap-2">
              <span class="text-[13px] font-medium text-ink-2">Fino al <span class="font-normal text-muted">· obbligatorio</span></span>
              <bm-select [options]="untilOptions()" [(value)]="untilIso" [active]="!!untilIso()" placeholder="Scegli la fine della ripetizione" ariaLabel="Fino al" />
              <div class="flex flex-wrap gap-1.5">
                @for (q of quick; track q.key) {
                  <button type="button" class="inline-flex h-7 items-center rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-2 hover:bg-sunken" (click)="quickUntil(q.key)">{{ q.label }}</button>
                }
              </div>
              <span class="text-xs text-muted">Al massimo 2 mesi dal giorno di inizio: entro {{ maxText() }}.</span>
              @if (summary()) {
                <div class="flex gap-2.5 rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-ink-2">
                  <bm-icon name="calendar" [size]="16" class="mt-0.5" />
                  <span>{{ summary() }}</span>
                </div>
              }
            </div>
          }
        </section>

        @if (existing()) {
          <div class="flex flex-wrap items-center justify-between gap-2.5 border-t border-line pt-4">
            <span class="text-[13px] text-muted">Toglie solo questa persona; gli altri restano.</span>
            <span class="flex flex-wrap gap-2">
              @if (series()) {
                <button type="button" [class]="secondary + ' text-err-ink'" (click)="endSeries.emit()"><bm-icon name="repeat" [size]="16" />Termina serie</button>
              }
              <button type="button" [class]="secondary + ' text-err-ink'" (click)="removeDay.emit()"><bm-icon name="trash" [size]="16" />{{ series() ? 'Togli questo giorno' : 'Togli' }}</button>
            </span>
          </div>
        }
      </div>
    </bm-form-panel>
  `,
})
export class AssignPanelComponent {
  private readonly calendar = inject(CalendarService);
  private readonly toast = inject(BmToast);

  readonly day = input.required<Date>();
  readonly resourceId = input.required<number>();
  readonly existing = input<Occurrence | null>(null);
  readonly resources = input.required<Resource[]>();
  readonly colleagues = input.required<Colleague[]>();
  readonly occurrences = input.required<Occurrence[]>();
  readonly me = input.required<{ id: number; name: string }>();
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly removeDay = output<void>();
  readonly endSeries = output<void>();

  protected readonly secondary = buttonClass.secondary;
  protected readonly dow3 = DOW3;
  protected readonly repeatModes = [
    { value: 'none', label: 'No' },
    { value: 'week', label: 'Ogni settimana' },
    { value: 'days', label: 'Giorni scelti' },
  ] as const;
  protected readonly quick = [
    { key: '14', label: '2 settimane' },
    { key: 'm1', label: '1 mese' },
    { key: 'm2', label: '2 mesi' },
  ];

  protected readonly series = computed(() => this.existing()?.recurring ?? false);
  protected readonly dayIso = signal('');
  protected readonly resId = signal('');
  protected readonly whoMe = signal(true);
  protected readonly colleagueId = signal('');
  protected readonly repeat = signal<'none' | 'week' | 'days'>('none');
  protected readonly flags = signal<number[]>([]);
  protected readonly untilIso = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private start = '';

  constructor() {
    queueMicrotask(() => this.init());
    // cambiando giorno: la fine scelta deve restare dentro la finestra e il giorno di inizio resta tra quelli scelti
    effect(() => {
      const d = this.dayDate();
      if (!d) return;
      untracked(() => {
        const u = this.untilIso();
        if (u && (u <= iso(d) || u > iso(maxUntil(d)))) this.untilIso.set('');
        const wd = Math.min(weekday(d), 4);
        if (!this.flags().includes(wd)) this.flags.update((f) => [...f, wd].sort());
      });
    });
  }

  private init(): void {
    const ex = this.existing();
    this.dayIso.set(iso(this.day()));
    this.resId.set(String(this.resourceId()));
    this.whoMe.set(!ex || ex.userId === this.me().id);
    this.colleagueId.set(ex && ex.userId !== this.me().id && ex.userId ? String(ex.userId) : '');
    const days = this.series() ? ruleDays(ex?.recurrenceRule) : [];
    this.repeat.set(this.series() ? 'days' : 'none');
    this.flags.set(days.length ? days : [Math.min(weekday(this.day()), 4)]);
    this.untilIso.set('');
    this.start = JSON.stringify([this.dayIso(), this.resId(), this.whoMe(), this.colleagueId(), this.repeat(), this.flags(), this.untilIso()]);
  }

  protected readonly dayDate = computed(() => (this.dayIso() ? fromIso(this.dayIso()) : null));
  protected readonly maxText = computed(() => {
    const d = this.dayDate();
    return d ? `${DOW[weekday(maxUntil(d))].toLowerCase()} ${ddmmyyyy(maxUntil(d))}` : '';
  });

  protected readonly dayOptions = computed<BmOption[]>(() => {
    const out: BmOption[] = [];
    const base = monday(new Date());
    for (let i = -7; i < 63; i++) {
      const d = addDays(base, i);
      if (!isWeekend(d)) out.push({ value: iso(d), label: `${DOW[weekday(d)]} ${ddmm(d)}${iso(d) === iso(new Date()) ? ' · oggi' : ''}` });
    }
    return out;
  });

  protected readonly resourceOptions = computed<BmOption[]>(() => this.resources().map((r) => ({ value: String(r.id), label: r.name })));

  protected readonly untilOptions = computed<BmOption[]>(() => {
    const d = this.dayDate();
    if (!d) return [];
    const out: BmOption[] = [];
    for (let x = addDays(d, 1); x <= maxUntil(d); x = addDays(x, 1)) {
      if (!isWeekend(x)) out.push({ value: iso(x), label: `${DOW[weekday(x)]} ${ddmmyyyy(x)}` });
    }
    return out;
  });

  /** la presenza che si sta cambiando (e il resto della sua serie) non conta come «già presente» */
  private onResource(day: Date, resourceId: number, userId: number): boolean {
    const ex = this.existing();
    return this.occurrences().some((o) => {
      if (o.date !== iso(day) || o.resourceId !== resourceId || o.userId !== userId) return false;
      const own = !!ex && o.appointmentId === ex.appointmentId && (!this.series() || o.date >= ex.date);
      return !own;
    });
  }

  private elsewhere(day: Date, resourceId: number, userId: number): Resource | undefined {
    return this.resources().find((r) => r.id !== resourceId && this.onResource(day, r.id, userId));
  }

  protected readonly meHere = computed(() => {
    const d = this.dayDate();
    return !!d && this.onResource(d, Number(this.resId()), this.me().id);
  });

  protected readonly meDescription = computed(() => {
    const d = this.dayDate();
    if (!d) return this.me().name;
    if (this.meHere()) return 'Ci sei già su questa risorsa';
    const other = this.elsewhere(d, Number(this.resId()), this.me().id);
    return other ? `Sei anche su ${other.name}: va bene` : this.me().name;
  });

  protected readonly colleagueOptions = computed<BmOption[]>(() => {
    const d = this.dayDate();
    const rid = Number(this.resId());
    return this.colleagues()
      .filter((c) => c.id !== this.me().id)
      .map((c) => {
        const here = !!d && this.onResource(d, rid, c.id);
        const other = d ? this.elsewhere(d, rid, c.id) : undefined;
        return {
          value: String(c.id),
          label: `${c.name} ${c.lastName}`.trim(),
          description: here ? 'Già su questa risorsa quel giorno' : other ? `Anche su ${other.name} quel giorno` : c.isOnline ? 'Online' : '',
          busy: here,
        };
      })
      .sort((a, b) => Number(a.busy) - Number(b.busy) || a.label.localeCompare(b.label))
      .map(({ busy: _b, ...o }) => o);
  });

  private readonly weekdays = computed(() => {
    const d = this.dayDate();
    if (this.repeat() === 'week') return d ? [Math.min(weekday(d), 4)] : [];
    return this.flags();
  });

  private readonly seriesDays = computed(() => {
    const d = this.dayDate();
    if (this.repeat() === 'none' || !d || !this.untilIso()) return [];
    const out: Date[] = [];
    for (let x = d; iso(x) <= this.untilIso(); x = addDays(x, 1)) {
      if (!isWeekend(x) && this.weekdays().includes(weekday(x))) out.push(x);
    }
    return out;
  });

  protected readonly summary = computed(() => {
    const days = this.seriesDays();
    if (!days.length) return '';
    const uid = this.userId();
    const rid = Number(this.resId());
    const dup = uid ? days.filter((d) => this.onResource(d, rid, uid)).length : 0;
    const n = days.length - dup;
    const list = [...this.weekdays()].sort().map((i) => DOW3[i].toLowerCase()).join(', ');
    return `${n} ${n === 1 ? 'presenza' : 'presenze'}: ogni ${list}, dal ${ddmm(this.dayDate()!)} al ${ddmmyyyy(fromIso(this.untilIso()))}.${dup ? ` ${dup} ${dup === 1 ? 'giorno è saltato' : 'giorni sono saltati'}: c'è già.` : ''}`;
  });

  private readonly userId = computed<number | null>(() => (this.whoMe() ? this.me().id : this.colleagueId() ? Number(this.colleagueId()) : null));

  protected readonly dirty = computed(
    () => JSON.stringify([this.dayIso(), this.resId(), this.whoMe(), this.colleagueId(), this.repeat(), this.flags(), this.untilIso()]) !== this.start || !this.existing(),
  );

  protected readonly canSave = computed(() => !!this.dayIso() && !!this.resId() && this.userId() !== null && (this.repeat() === 'none' || (!!this.untilIso() && this.seriesDays().length > 0)));

  protected option(selected: boolean): string {
    return `flex min-h-[96px] flex-col items-start gap-1.5 rounded-xl border-[1.5px] p-4 text-left ${selected ? 'border-accent bg-accent-wash' : 'border-line bg-surface hover:border-line-strong'}`;
  }

  protected isStartDay(i: number): boolean {
    const d = this.dayDate();
    return !!d && Math.min(weekday(d), 4) === i;
  }

  protected toggleDay(i: number): void {
    if (this.isStartDay(i)) return;
    this.flags.update((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i].sort()));
  }

  protected quickUntil(key: string): void {
    const d = this.dayDate();
    if (!d) return;
    const limit = maxUntil(d);
    const target = new Date(d);
    if (key === '14') target.setDate(target.getDate() + 14);
    else target.setMonth(target.getMonth() + (key === 'm1' ? 1 : 2));
    let x = target;
    while (isWeekend(x) || x > limit) x = addDays(x, -1);
    this.untilIso.set(iso(x));
  }

  protected async save(): Promise<void> {
    const d = this.dayDate();
    const uid = this.userId();
    if (!d || uid === null || this.busy()) return;
    const resource = this.resources().find((r) => String(r.id) === this.resId());
    if (!resource) return;
    if (this.onResource(d, resource.id, uid)) {
      const who = this.whoMe() ? 'Sei' : `${this.colleagueName(uid)} è`;
      this.error.set(`${who} già su ${resource.name} quel giorno: la stessa persona non può stare due volte sulla stessa risorsa.`);
      return;
    }
    if (this.repeat() !== 'none' && !this.weekdays().includes(Math.min(weekday(d), 4))) {
      this.error.set(`Il primo giorno (${DOW[weekday(d)].toLowerCase()}) deve essere tra i giorni che si ripetono.`);
      return;
    }

    const body: AppointmentRequest = {
      userId: uid,
      subject: this.whoMe() ? this.me().name : this.colleagueName(uid),
      startTime: `${iso(d)}T08:30:00`,
      endTime: `${iso(d)}T09:30:00`,
      resourceIds: [resource.id],
      recurrenceRule: this.repeat() === 'none' ? null : buildRule(this.weekdays(), fromIso(this.untilIso())),
      active: true,
    };

    this.busy.set(true);
    this.error.set(null);
    try {
      const ex = this.existing();
      if (ex && !this.series()) {
        await firstValueFrom(this.calendar.update(ex.appointmentId, body)); // singolo: si modifica lo stesso appuntamento
      } else {
        // serie: la vecchia finisce il giorno prima, da qui vale la nuova
        if (ex) await firstValueFrom(this.calendar.endSeries(ex.appointmentId, ex.date));
        await firstValueFrom(this.calendar.create(body));
      }
      this.toast.show({ tone: 'ok', text: ex ? 'Presenza aggiornata' : this.repeat() === 'none' ? 'Presenza aggiunta' : 'Serie creata' });
      this.saved.emit();
    } catch (e) {
      const text = e instanceof HttpErrorResponse && typeof e.error === 'string' && e.error ? e.error : 'Impossibile salvare la presenza. Riprova più tardi.';
      this.error.set(text);
    } finally {
      this.busy.set(false);
    }
  }

  private colleagueName(id: number): string {
    const c = this.colleagues().find((x) => x.id === id);
    return c ? `${c.name} ${c.lastName}`.trim() : '';
  }
}
