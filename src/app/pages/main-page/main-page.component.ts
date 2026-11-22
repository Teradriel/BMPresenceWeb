import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CalendarService, Colleague, Occurrence, Resource } from '../../services/calendar.service';
import { ConnectionService } from '../../services/connection.service';
import { BmConfirm, BmIcon, BmMenuItem, BmRowMenu, BmSlidingGroup, BmToast, buttonClass } from '../../shared/bm-ui';
import { DOW, DOW3, MON, addDays, describe, ddmm, fromIso, iso, isoWeek, monday, weekday } from '../../shared/week';
import { AssignPanelComponent } from './assign-panel.component';

interface Chip {
  occ: Occurrence;
  name: string;
  initials: string;
  mine: boolean;
  sub: string;
}

interface Cell {
  date: Date;
  resource: Resource;
  people: Chip[];
  warn: boolean;
  dim: boolean;
}

interface PanelState {
  day: Date;
  resourceId: number;
  existing: Occurrence | null;
}

/** Presenze della settimana: griglia risorse × giorni (sotto 768px un giorno alla volta), come nel mockup e nell'app MAUI. */
@Component({
  selector: 'app-main-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, BmIcon, BmRowMenu, BmSlidingGroup, AssignPanelComponent],
  templateUrl: './main-page.component.html',
})
export class MainPageComponent implements OnInit {
  private readonly calendar = inject(CalendarService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(BmConfirm);
  private readonly toast = inject(BmToast);
  private readonly connection = inject(ConnectionService);

  protected readonly primary = buttonClass.primary;
  protected readonly secondary = buttonClass.secondary;
  protected readonly dow3 = DOW3;
  protected readonly iso = iso;

  protected readonly weekStart = signal(monday(new Date()));
  protected readonly selDay = signal(Math.min(4, weekday(new Date())));
  protected readonly filter = signal<'all' | 'mine' | 'uncovered'>('all');
  protected readonly resources = signal<Resource[]>([]);
  protected readonly colleagues = signal<Colleague[]>([]);
  protected readonly occurrences = signal<Occurrence[]>([]);
  protected readonly loading = signal(false);
  protected readonly panel = signal<PanelState | null>(null);
  protected readonly narrow = signal(matchMedia('(max-width: 1199px)').matches);

  protected readonly filters = [
    { value: 'all', label: 'Tutti' },
    { value: 'mine', label: 'Le mie' },
    { value: 'uncovered', label: 'Scoperte' },
  ] as const;

  protected readonly me = computed(() => {
    const u = this.auth.currentUserValue;
    const name = `${u?.name ?? ''} ${u?.lastName ?? ''}`.trim() || (u?.username ?? '');
    return { id: Number(u?.id), name };
  });

  protected readonly days = computed(() => Array.from({ length: 5 }, (_, i) => addDays(this.weekStart(), i)));
  protected readonly todayIso = iso(new Date());

  protected readonly weekLabel = computed(() => {
    const s = this.weekStart();
    const e = addDays(s, 4);
    return `${s.getDate()} – ${e.getDate()} ${MON[e.getMonth()]} ${e.getFullYear()}`;
  });
  protected readonly weekSub = computed(() => `Settimana ${isoWeek(this.weekStart())}${iso(this.weekStart()) === iso(monday(new Date())) ? ' · questa settimana' : ''}`);

  private readonly nameOf = computed(() => {
    const map = new Map<number, string>();
    for (const c of this.colleagues()) map.set(c.id, `${c.name} ${c.lastName}`.trim());
    return map;
  });

  private chipOf(o: Occurrence): Chip {
    const mine = o.userId === this.me().id;
    const full = (o.userId !== null ? this.nameOf().get(o.userId) : undefined) ?? o.subject ?? '?';
    const initials = full.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
    return { occ: o, name: mine ? 'Tu' : full, initials: initials || '?', mine, sub: describe(o.recurrenceRule, fromIso(o.date)) };
  }

  protected readonly rows = computed(() => {
    const filter = this.filter();
    const today = new Date(this.todayIso + 'T00:00:00');
    const tomorrow = addDays(today, 1);
    return this.resources().map((resource) => ({
      resource,
      cells: this.days().map<Cell>((date) => {
        const people = this.occurrences()
          .filter((o) => o.date === iso(date) && o.resourceId === resource.id)
          .map((o) => this.chipOf(o))
          .sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name));
        return {
          date,
          resource,
          people,
          warn: date >= today && date <= tomorrow,
          dim: (filter === 'mine' && !people.some((p) => p.mine)) || (filter === 'uncovered' && people.length > 0),
        };
      }),
    }));
  });

  /** telefono: le caselle del giorno scelto, una per risorsa */
  protected readonly dayRows = computed(() => this.rows().map((r) => ({ resource: r.resource, cell: r.cells[this.selDay()] })));

  protected readonly kpi = computed(() => {
    const t = this.todayIso;
    const weekend = [0, 6].includes(new Date().getDay());
    const uncovered = this.resources().filter((r) => !this.occurrences().some((o) => o.date === t && o.resourceId === r.id));
    const present = new Set(this.occurrences().filter((o) => o.date === t).map((o) => o.userId ?? o.subject)).size;
    const limit = iso(addDays(new Date(), 21));
    const mine = this.occurrences().filter((o) => o.userId === this.me().id && o.date >= t && o.date <= limit).sort((a, b) => a.date.localeCompare(b.date));
    const first = mine[0]?.date;
    const where = [...new Set(mine.filter((o) => o.date === first).map((o) => this.resources().find((r) => r.id === o.resourceId)?.name))].join(' e ');
    const f = first ? fromIso(first) : null;
    return {
      uncovered: weekend ? '—' : String(uncovered.length),
      uncoveredSub: weekend ? 'Oggi non si lavora' : uncovered.length === 0 ? 'Tutte le risorse hanno qualcuno' : uncovered.map((r) => r.name).join(', '),
      present: weekend ? '—' : String(present),
      next: f ? `${DOW[weekday(f)]} ${ddmm(f)}` : '—',
      nextSub: f ? `${where} · 08:30` : 'Nessun turno nelle prossime 3 settimane',
    };
  });

  constructor() {
    const mq = matchMedia('(max-width: 1199px)');
    const on = (e: MediaQueryListEvent) => this.narrow.set(e.matches);
    mq.addEventListener('change', on);
    inject(DestroyRef).onDestroy(() => mq.removeEventListener('change', on));
  }

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    try {
      if (this.resources().length === 0) {
        const [resources, colleagues] = await Promise.all([firstValueFrom(this.calendar.getResources()), firstValueFrom(this.calendar.getColleagues())]);
        this.resources.set([...resources].sort((a, b) => a.id - b.id));
        this.colleagues.set(colleagues);
      }
      // la settimana mostrata + tre settimane davanti a oggi (per «Il tuo prossimo turno»)
      const today = new Date();
      const from = this.weekStart() < today ? this.weekStart() : today;
      const weekEnd = addDays(this.weekStart(), 4);
      const to = weekEnd > addDays(today, 21) ? weekEnd : addDays(today, 21);
      this.occurrences.set(await firstValueFrom(this.calendar.getOccurrences(iso(from), iso(to))));
      this.connection.online.set(true);
    } catch {
      this.connection.online.set(false);
      this.toast.show({ tone: 'err', text: 'Impossibile leggere le presenze. Controlla la connessione.' });
    } finally {
      this.loading.set(false);
    }
  }

  protected shift(weeks: number): void {
    this.weekStart.update((w) => addDays(w, weeks * 7));
    void this.load();
  }

  protected goToday(): void {
    this.weekStart.set(monday(new Date()));
    this.selDay.set(Math.min(4, weekday(new Date())));
    void this.load();
  }

  protected openPanel(day: Date, resourceId: number, existing: Occurrence | null = null): void {
    if (this.resources().length) this.panel.set({ day, resourceId, existing });
  }

  protected addFromToolbar(): void {
    this.openPanel(addDays(this.weekStart(), this.selDay()), this.resources()[0]?.id ?? 0);
  }

  protected afterSave(): void {
    this.panel.set(null);
    void this.load();
  }

  protected menuItems(chip: Chip): BmMenuItem[] {
    const o = chip.occ;
    const items: BmMenuItem[] = [
      { key: 'edit', label: 'Cambia', hint: 'Giorno, risorsa, persona o ripetizione', icon: 'pencil', select: () => this.openPanel(fromIso(o.date), o.resourceId, o) },
      {
        key: 'remove',
        label: o.recurring ? 'Togli solo questo giorno' : chip.mine ? 'Togliti' : 'Togli dalla risorsa',
        hint: o.recurring ? 'La serie continua negli altri giorni' : 'Gli altri sulla risorsa restano',
        icon: 'trash',
        danger: true,
        select: () => void this.removeOne(o, chip.name),
      },
    ];
    if (o.recurring) {
      items.push({ key: 'end', label: 'Termina la serie da qui', hint: 'Toglie questo giorno e i successivi', icon: 'repeat', danger: true, select: () => void this.endSeries(o) });
    }
    return items;
  }

  protected removeFromPanel(o: Occurrence): void {
    const name = o.userId === this.me().id ? 'Tu' : ((o.userId !== null ? this.nameOf().get(o.userId) : undefined) ?? o.subject ?? 'La persona');
    void this.removeOne(o, name);
  }

  protected async removeOne(o: Occurrence, name: string): Promise<void> {
    const resource = this.resources().find((r) => r.id === o.resourceId)?.name ?? '';
    const others = this.occurrences().filter((x) => x.date === o.date && x.resourceId === o.resourceId).length - 1;
    const d = fromIso(o.date);
    const rest = others > 0 ? `Restano ${others} ${others === 1 ? 'persona' : 'persone'}.` : `${resource} resterà senza nessuno.`;
    const ok = await this.confirm.ask({
      title: 'Togliere la presenza?',
      message: `${name === 'Tu' ? 'Non sarai' : name + ' non sarà'} più su ${resource} ${DOW[weekday(d)].toLowerCase()} ${ddmm(d)}. ${rest}${o.recurring ? ' La serie continua negli altri giorni.' : ''}`,
      confirmLabel: 'Togli presenza',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.calendar.removeDay(o.appointmentId, o.date));
      this.toast.show({ tone: 'ok', text: 'Presenza tolta' });
      this.panel.set(null);
      void this.load();
    } catch {
      this.toast.show({ tone: 'err', text: 'Impossibile togliere la presenza. Riprova più tardi.' });
    }
  }

  protected async endSeries(o: Occurrence): Promise<void> {
    const d = fromIso(o.date);
    const left = this.occurrences().filter((x) => x.appointmentId === o.appointmentId && x.date >= o.date).length;
    const ok = await this.confirm.ask({
      title: 'Terminare la serie?',
      message: `Si tolgono le presenze da ${DOW[weekday(d)].toLowerCase()} ${ddmm(d)} in poi (almeno ${left} in vista); quelle prima restano.`,
      confirmLabel: 'Termina serie',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.calendar.endSeries(o.appointmentId, o.date));
      this.toast.show({ tone: 'ok', text: 'Serie terminata' });
      this.panel.set(null);
      void this.load();
    } catch {
      this.toast.show({ tone: 'err', text: 'Impossibile terminare la serie. Riprova più tardi.' });
    }
  }
}
