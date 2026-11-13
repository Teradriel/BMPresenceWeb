import { NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, LOCALE_ID, TemplateRef, afterNextRender, computed, contentChild, effect, inject, input, output, signal, viewChild } from '@angular/core'
import { BM_LABELS } from './bm-labels'
import { BmCollapsible } from './bm-collapsible.component'
import { BmColumnFilter, type BmColumnFilterKind, bmDescribeColumnFilter } from './bm-column-filter.component'
import { BmIcon } from './bm-icon.component'
import { BmPager } from './bm-pager.component'
import { type BmMenuItem, BmRowMenu } from './bm-row-menu.component'
import { BmSelect, type BmOption } from './bm-select.component'
import { BmSidePanel } from './bm-side-panel.component'
import { BmSlidingGroup } from './bm-sliding-group.component'
import { BmViewMenu, type BmViewColumn } from './bm-view-menu.component'
import { BmBadge, type BmTone, buttonClass, inputClass } from './bm-ui'

export type BmCellType = 'text' | 'mono' | 'number' | 'money' | 'percent' | 'date' | 'datetime' | 'bool' | 'badge'
type Row = Record<string, unknown>

export interface BmColumn {
  key: string
  label: string
  /** larghezza della colonna: `130px` fissa oppure `minmax(0,1.8fr)` elastica (minimo 190px) */
  width: string
  type?: BmCellType
  sort?: boolean
  /** colonna con una seconda riga (campo della riga) sotto il valore */
  sub?: string
  /** `badge`: valore → testo e tono */
  badges?: Record<string, { label: string; tone: BmTone }>
  /** `bool`: toni e testi del sì/no */
  boolTone?: { on: BmTone; off: BmTone }
  boolLabels?: { on: string; off: string }
  /** filtro di colonna (imbuto accanto all'ordinamento): tipo del controllo; per `option` le scelte sono `filterOptions` (o i `badges`) */
  filter?: BmColumnFilterKind
  filterOptions?: { value: string; label: string }[]
  /** colonna fissa a sinistra: la prima, sempre visibile, non si nasconde né si sposta (di norma il codice che apre il dettaglio) */
  fixed?: boolean
}

export interface BmFilterDef {
  key: string
  label: string
  options: { value: string; label: string }[]
}

export interface BmTabs {
  /** parametro dell'indirizzo che porta la scheda scelta */
  param: string
  allLabel: string
  total: number
  items: { value: string; label: string; count: number }[]
}

/** Stato di un elenco, lo stesso nell'indirizzo (`?q=…&ambito=…&sort=…&dir=…&pagina=…&<filtro>=…`) come in onSales */
export interface BmListParams {
  q: string
  scope: string
  sort: string
  dir: 'asc' | 'desc'
  page: number
  filters: Record<string, string>
  /** filtri di colonna: chiave della colonna → valore (nell'indirizzo `col_<chiave>`) */
  cols: Record<string, string>
}

/** Cambio di stato dell'elenco: chiave dell'indirizzo → nuovo valore (null = togli il parametro). Chi usa la tabella lo scrive nell'indirizzo. */
export type BmParamsPatch = Record<string, string | null>

/** Dall'oggetto dei parametri di un indirizzo (`ParamMap.keys`/`get`) allo stato dell'elenco */
export function bmListParams(get: (k: string) => string | null, filterKeys: string[], defaults: { sort: string; dir?: 'asc' | 'desc' }, columnKeys: string[] = []): BmListParams {
  return {
    q: get('q') ?? '',
    scope: get('ambito') ?? 'all',
    sort: get('sort') ?? defaults.sort,
    dir: (get('dir') as 'asc' | 'desc' | null) ?? defaults.dir ?? 'asc',
    page: Math.max(1, Number.parseInt(get('pagina') ?? '1', 10) || 1),
    filters: Object.fromEntries(filterKeys.map((k) => [k, get(k) ?? '']).filter(([, v]) => v !== '')),
    cols: Object.fromEntries(columnKeys.map((k) => [k, get(`col_${k}`) ?? '']).filter(([, v]) => v !== '')),
  }
}

@Component({
  selector: 'bm-empty-state',
  imports: [BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-1.5 px-5 py-12 text-center">
      <div class="relative mb-2 h-[88px] w-[150px]">
        <svg viewBox="0 0 150 88" class="absolute inset-0 size-full" aria-hidden="true" fill="none">
          <rect x="22" y="14" width="86" height="58" rx="10" transform="rotate(-7 65 43)" fill="var(--color-sunken)" stroke="var(--color-line)" />
          <rect x="44" y="16" width="86" height="58" rx="10" transform="rotate(6 87 45)" fill="var(--color-subtle)" stroke="var(--color-line)" />
          <rect x="32" y="12" width="86" height="60" rx="10" fill="var(--color-surface)" stroke="var(--color-line-strong)" />
          <rect x="44" y="52" width="40" height="5" rx="2.5" fill="var(--color-line)" />
          <rect x="44" y="62" width="26" height="5" rx="2.5" fill="var(--color-line-soft)" />
          <circle cx="124" cy="18" r="5" fill="var(--color-lime)" />
          <circle cx="16" cy="60" r="3" fill="var(--color-lime)" opacity=".55" />
        </svg>
        <span class="absolute top-[22px] left-1/2 flex size-[30px] -translate-x-1/2 items-center justify-center rounded-full bg-sunken text-accent-ink"><bm-icon name="inbox" [size]="18" /></span>
      </div>
      <span class="text-[15px] font-medium">{{ title() }}</span>
      @if (description()) {
        <span class="max-w-[420px] text-[13px] text-muted">{{ description() }}</span>
      }
      <div class="mt-3 flex flex-wrap items-center justify-center gap-2.5 empty:hidden"><ng-content /></div>
    </div>
  `,
})
export class BmEmptyState {
  readonly title = input.required<string>()
  readonly description = input('')
}

/**
 * Pannello a destra dei filtri di un elenco (come `filter-panel.tsx` di onSales): i filtri a scelta, i criteri attivi da togliere uno a uno e in fondo il
 * totale delle righe con «Azzera» e «Mostra». Ogni scelta si applica subito.
 */
@Component({
  selector: 'bm-filter-panel',
  imports: [BmIcon, BmSidePanel, BmSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bm-side-panel [title]="labels.filters" icon="filter" [width]="440" (closed)="closed.emit()" #panel>
      <div class="flex flex-col gap-7">
        @if (filters().length > 0) {
          <section class="flex flex-col gap-3.5">
            @for (f of filters(); track f.key) {
              <div class="flex flex-col gap-1.5">
                <span class="text-[13px] font-medium text-ink-2">{{ f.label }}</span>
                <bm-select [ariaLabel]="f.label" [options]="optionsOf(f)" [value]="values()[f.key] || ''" [active]="!!values()[f.key]" (valueChange)="set(f.key, $event)" />
              </div>
            }
          </section>
        }
        <section class="flex flex-col gap-2.5">
          <h3 class="text-xs font-semibold tracking-[0.05em] text-muted uppercase">{{ labels.filtersActive }}</h3>
          @if (active().length === 0) {
            <p class="text-[13px] text-muted">{{ labels.filtersNone }}</p>
          } @else {
            <ul class="flex flex-wrap gap-1.5">
              @for (a of active(); track a.key) {
                <li>
                  <button type="button" [title]="labels.filtersRemove" (click)="remove.emit(a.key)" class="inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent-soft py-1 pr-1.5 pl-3 text-[13px] font-medium text-accent-ink hover:bg-accent-wash">
                    <span class="truncate">{{ a.text }}</span>
                    <bm-icon name="x" [size]="14" />
                  </button>
                </li>
              }
            </ul>
          }
        </section>
      </div>
      <div bmPanelFooter class="flex items-center justify-between gap-3">
        <span class="text-[13px] text-muted tabular-nums">{{ labels.results(totalText()) }}</span>
        <div class="flex gap-2.5">
          <button type="button" [class]="secondary" [disabled]="active().length === 0" (click)="clear.emit()">{{ labels.clear }}</button>
          <button type="button" [class]="primary" (click)="panel.close()">{{ labels.show }}</button>
        </div>
      </div>
    </bm-side-panel>
  `,
})
export class BmFilterPanel {
  protected readonly labels = inject(BM_LABELS)
  protected readonly primary = buttonClass.primary
  protected readonly secondary = buttonClass.secondary
  readonly filters = input.required<BmFilterDef[]>()
  readonly values = input.required<Record<string, string>>()
  readonly active = input.required<{ key: string; text: string }[]>()
  readonly totalText = input.required<string>()
  readonly go = output<BmParamsPatch>()
  readonly remove = output<string>()
  readonly clear = output<void>()
  readonly closed = output<void>()

  protected set(key: string, value: string): void {
    this.go.emit({ [key]: value || null })
  }

  protected optionsOf(f: BmFilterDef): BmOption[] {
    return [{ value: '', label: this.labels.all, text: f.label }, ...f.options]
  }
}

// il fondo bianco con la linea verde lo disegna il gruppo (bm-sliding-group) e scivola da una scheda all'altra: i pulsanti non hanno fondo proprio
const tabBase = 'relative z-[1] inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors'
const tabOn = `${tabBase} text-ink`
const tabOff = `${tabBase} text-ink-2 hover:text-ink`

/**
 * Tabella di un elenco (come `data-table.tsx` di onSales, versione essenziale): ricerca con ambito, pulsante Filtri con contatore e pannello a destra,
 * schede con conteggio, intestazioni ordinabili (primo clic crescente, secondo decrescente), righe con barra lime al passaggio, riga espandibile con
 * il dettaglio (template `#detail`), menu ⋯ anche col tasto destro, stato vuoto, piè «da–a su totale» e pager. Tutto lo stato sta nell'indirizzo: la tabella
 * non legge né scrive niente, emette `go` con le modifiche e riceve `params`, `rows` e `total` già letti.
 * Testata ferma sotto la barra in alto e la barra strumenti (come in onSales), filtro per colonna (imbuto) e impostazioni della tabella (mostra/nascondi e ordine
 * delle colonne, anche col tasto destro sull'intestazione; con `viewKey` la scelta si ricorda nel browser).
 * Non ancora portati dal riferimento React: colonne ridimensionabili e ferme a scelta, evidenziazione del testo cercato.
 */
@Component({
  selector: 'bm-data-table',
  imports: [NgTemplateOutlet, BmBadge, BmCollapsible, BmColumnFilter, BmEmptyState, BmFilterPanel, BmIcon, BmPager, BmRowMenu, BmSelect, BmSlidingGroup, BmViewMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2">
      <div #toolbar class="sticky top-16 z-30 -mx-3 -mt-4 bg-canvas px-3 pt-3 pb-3 md:-mx-5 md:-mt-5 md:px-5">
        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center gap-2.5">
            <div class="relative flex min-w-[220px] flex-1 items-center">
              <bm-icon [name]="pending() ? 'loader' : 'search'" [size]="16" [class]="pending() ? 'pointer-events-none absolute left-3 animate-spin text-accent-ink' : 'pointer-events-none absolute left-3 text-muted'" />
              <input type="search" [class]="searchClass()" [attr.aria-label]="searchPlaceholder()" [placeholder]="searchPlaceholder()" [value]="query()" (input)="onSearch($any($event.target).value)" />
              <div class="absolute right-1.5 flex items-center gap-0.5">
                @if (query()) {
                  <button type="button" [attr.aria-label]="labels.clearSearch" [title]="labels.clearSearch" (click)="onSearch('')" class="grid size-6 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                    <bm-icon name="x" [size]="14" />
                  </button>
                }
                @if (scopeOptions().length > 1) {
                  <bm-select [options]="scopeOptions()" [value]="params().scope" ariaLabel="Ambito" [bare]="true" [triggerClass]="scopeClass()" (valueChange)="onScope($event)" />
                }
              </div>
            </div>
            <button type="button" aria-haspopup="dialog" [attr.aria-expanded]="panelOpen()" [title]="labels.filters" [class]="filterBtnClass()" (click)="panelOpen.set(true)">
              <bm-icon name="filter" [size]="16" />
              {{ labels.filters }}
              @if (filterCount() > 0) {
                <span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">{{ filterCount() }}</span>
              }
            </button>
            <span class="shrink-0 text-[13px] text-muted tabular-nums">{{ labels.total(nf.format(rows().length), nf.format(total())) }}</span>
            <ng-content select="[bmActions]" />
          </div>
          @if (tabs(); as t) {
            <div class="min-w-0">
              <bm-sliding-group [label]="t.allLabel" tone="segment" boxClass="max-w-full overflow-x-auto [scrollbar-width:none]">
                @for (tab of tabList(); track tab.value) {
                  <button type="button" [attr.aria-pressed]="isTab(tab.value)" [attr.data-active]="isTab(tab.value) ? 'true' : null" [class]="isTab(tab.value) ? tabOn : tabOff" (click)="onTab(t.param, tab.value)">
                    {{ tab.label }}
                    <!-- il contatore pulsa quando cambia: l'elemento si rifà a ogni nuovo valore -->
                    @for (n of [tab.count]; track n) {
                      <span class="pm-bump inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-line px-1.5 text-[11px] font-semibold text-ink-2">{{ nf.format(n) }}</span>
                    }
                  </button>
                }
              </bm-sliding-group>
            </div>
          }
        </div>
      </div>

      <div #top aria-hidden="true" class="-my-2 scroll-mt-20"></div>
      <section [class]="pending() ? 'rounded-[14px] border border-line bg-surface opacity-60 transition-opacity' : 'rounded-[14px] border border-line bg-surface transition-opacity'">
        <!-- la testata resta ferma sotto la barra in alto e la barra strumenti; di lato segue le righe (si sposta della stessa distanza) -->
        <div class="sticky z-20 overflow-x-clip rounded-t-[14px] border-b border-line-soft bg-subtle" [style.top.px]="64 + toolbarH()">
          <div #headInner [style.min-width.px]="minWidth()">
            <div role="row" [style.grid-template-columns]="gridTemplate()" class="grid items-center gap-x-4 px-5 py-3 text-xs font-medium text-muted" (contextmenu)="view.openAtPoint($event)">
              @if (detail()) {
                <span></span>
              }
              @for (c of shownColumns(); track c.key) {
                <div role="columnheader" [attr.aria-sort]="c.sort ? sortState(c.key) : null" [class]="isNumeric(c) ? 'flex min-w-0 items-center justify-end gap-0.5' : 'flex min-w-0 items-center gap-0.5'">
                  @if (c.sort) {
                    <button type="button" (click)="sortBy(c.key)" [class]="params().sort === c.key ? '-mx-1 inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-ink hover:bg-sunken hover:text-ink' : '-mx-1 inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 hover:bg-sunken hover:text-ink'">
                      <span class="truncate">{{ c.label }}</span>
                      <bm-icon [name]="sortIcon(c.key)" [size]="14" [class]="params().sort === c.key ? 'shrink-0' : 'shrink-0 opacity-40'" />
                    </button>
                  } @else {
                    <span class="min-w-0 truncate">{{ c.label }}</span>
                  }
                  @if (c.filter) {
                    <bm-column-filter [label]="c.label" [kind]="c.filter" [value]="params().cols[c.key] || ''" [options]="filterOptions(c)" (changed)="onColFilter(c.key, $event)" />
                  }
                </div>
              }
              <div class="flex justify-end">
                <bm-view-menu #view [columns]="viewColumns()" [changed]="viewChanged()" (toggleColumn)="toggleColumn($event)" (move)="moveColumn($event.key, $event.step)" (reset)="resetView()" />
              </div>
            </div>
          </div>
        </div>
        <div #scroller (scroll)="syncHead()" class="overflow-x-auto rounded-b-[14px]">
        <div [style.min-width.px]="minWidth()">

          @for (row of rows(); track rowId(row, $index)) {
            @let id = rowId(row, $index);
            <div class="border-b border-line-soft last:border-0">
              <div
                [style.grid-template-columns]="gridTemplate()"
                [class]="rowClass(id)"
                (click)="onRowClick($event, id)"
                (contextmenu)="menu.openAtPoint($event)"
              >
                <span aria-hidden="true" [class]="toneClass(row)"></span>
                @if (detail()) {
                  <span class="relative flex items-center">
                    <button type="button" [attr.aria-expanded]="isOpen(id)" [attr.aria-label]="isOpen(id) ? labels.collapse : labels.expand" [title]="isOpen(id) ? labels.collapse : labels.expand" (click)="toggle(id)" class="flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                      <bm-icon name="chevron-right" [size]="16" [class]="isOpen(id) ? 'rotate-90 transition-transform duration-200' : 'transition-transform duration-200'" />
                    </button>
                  </span>
                }
                @for (c of shownColumns(); track c.key) {
                  <span class="min-w-0">
                    @switch (c.type ?? 'text') {
                      @case ('mono') {
                        <span class="block truncate font-mono text-[13px]">{{ text(c, row) }}</span>
                      }
                      @case ('number') {
                        <span class="block truncate text-right tabular-nums">{{ text(c, row) }}</span>
                      }
                      @case ('money') {
                        <span class="block truncate text-right tabular-nums">{{ text(c, row) }}</span>
                      }
                      @case ('percent') {
                        <span class="block truncate text-right tabular-nums">{{ text(c, row) }}</span>
                      }
                      @case ('date') {
                        <span class="block truncate text-[13px] text-ink-2">{{ text(c, row) }}</span>
                      }
                      @case ('datetime') {
                        <span class="block truncate text-[13px] text-ink-2">{{ text(c, row) }}</span>
                      }
                      @case ('bool') {
                        <bm-badge [tone]="isTrue(row[c.key]) ? (c.boolTone?.on ?? 'ok') : (c.boolTone?.off ?? 'neutral')">{{ text(c, row) }}</bm-badge>
                      }
                      @case ('badge') {
                        @if (badgeOf(c, row); as b) {
                          <bm-badge [tone]="b.tone">{{ b.label }}</bm-badge>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      }
                      @default {
                        <span class="flex min-w-0 flex-col gap-0.5">
                          <span class="block truncate">{{ text(c, row) }}</span>
                          @if (c.sub && row[c.sub]) {
                            <span class="truncate text-xs text-muted">{{ row[c.sub] }}</span>
                          }
                        </span>
                      }
                    }
                  </span>
                }
                <span class="flex items-center justify-end">
                  <bm-row-menu #menu [items]="menuItemsOf(row)" [label]="labels.rowActions" />
                </span>
              </div>
              @if (detail(); as tpl) {
                @if (isMounted(id)) {
                  <bm-collapsible [open]="isOpen(id)">
                    <div class="border-t border-line-soft bg-subtle px-5 py-4 pl-[60px]">
                      <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: row }" />
                    </div>
                  </bm-collapsible>
                }
              }
            </div>
          }
          @if (rows().length === 0) {
            <bm-empty-state [title]="emptyTitle()" [description]="criteria().length > 0 ? labels.noMatch : ''">
              @if (criteria().length > 0) {
                <button type="button" [class]="secondary" (click)="clearAll()">{{ labels.clear }}</button>
              }
            </bm-empty-state>
          }
        </div>
        </div>
      </section>

      @if (panelOpen()) {
        <bm-filter-panel [filters]="filters()" [values]="params().filters" [active]="criteria()" [totalText]="nf.format(total())" (go)="go.emit($event)" (remove)="removeCriterion($event)" (clear)="clearAll()" (closed)="panelOpen.set(false)" />
      }

      @if (total() > 0) {
        <div class="flex items-center justify-between gap-4 text-[13px] text-muted">
          <span>{{ labels.range(nf.format(from()), nf.format(to()), nf.format(total())) }}</span>
          <bm-pager [page]="params().page" [pages]="pages()" [pending]="pending()" (go)="changePage($event)" />
        </div>
      }
    </div>
  `,
})
export class BmDataTable {
  protected readonly labels = inject(BM_LABELS)
  private readonly locale = inject(LOCALE_ID)
  protected readonly nf = new Intl.NumberFormat(this.locale)
  protected readonly secondary = buttonClass.secondary
  protected readonly tabOn = tabOn
  protected readonly tabOff = tabOff

  readonly columns = input.required<BmColumn[]>()
  readonly rows = input.required<Row[]>()
  readonly total = input.required<number>()
  readonly params = input.required<BmListParams>()
  readonly filters = input<BmFilterDef[]>([])
  readonly tabs = input<BmTabs | undefined>(undefined)
  /** ambiti di ricerca da scegliere dentro il campo (il primo è «tutto»; se manca, `{ value: 'all', label: … }` è aggiunto da chi usa la tabella) */
  readonly scopes = input<BmOption[]>([])
  readonly searchPlaceholder = input.required<string>()
  readonly emptyTitle = input.required<string>()
  readonly pageSize = input(50)
  /** campo della riga che la identifica (per tenere aperte le righe espanse) */
  readonly rowKey = input('id')
  readonly pending = input(false)
  readonly menuItems = input<((row: Row) => BmMenuItem[]) | undefined>(undefined)
  /** segnalino colorato a sinistra della riga: valore di un campo → rosso o arancione */
  readonly tone = input<{ column: string; map: Record<string, 'err' | 'warn'> } | undefined>(undefined)
  /** chiave con cui si ricordano nel browser le colonne mostrate e il loro ordine (vuoto = non si ricorda) */
  readonly viewKey = input('')
  readonly go = output<BmParamsPatch>()

  /** dettaglio sotto la riga: `<ng-template #detail let-row>…</ng-template>` dentro la tabella */
  protected readonly detail = contentChild<TemplateRef<{ $implicit: Row }>>('detail')
  private readonly top = viewChild<ElementRef<HTMLElement>>('top')

  private readonly destroyRef = inject(DestroyRef)
  private readonly toolbar = viewChild<ElementRef<HTMLElement>>('toolbar')
  private readonly headInner = viewChild<ElementRef<HTMLElement>>('headInner')
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller')
  /** altezza della barra strumenti ferma: la testata si ferma sotto di lei */
  protected readonly toolbarH = signal(0)
  private readonly hidden = signal<ReadonlySet<string>>(new Set())
  private readonly order = signal<string[]>([])
  private loadedKey = ''

  protected readonly panelOpen = signal(false)
  protected readonly query = signal('')
  private readonly expanded = signal<ReadonlySet<string>>(new Set())
  private readonly closing = signal<ReadonlySet<string>>(new Set())
  private timer?: ReturnType<typeof setTimeout>

  protected readonly scopeOptions = computed(() => this.scopes())
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())))
  protected readonly from = computed(() => (this.total() === 0 ? 0 : (this.params().page - 1) * this.pageSize() + 1))
  protected readonly to = computed(() => this.from() - 1 + this.rows().length)
  protected readonly tabList = computed(() => {
    const t = this.tabs()
    return t ? [{ value: '', label: t.allLabel, count: t.total }, ...t.items] : []
  })
  protected readonly criteria = computed(() => {
    const p = this.params()
    const out: { key: string; text: string }[] = []
    if (p.q) out.push({ key: 'q', text: `${this.labels.search.replace('…', '')}: «${p.q}»` })
    for (const [key, value] of Object.entries(p.cols)) {
      const c = this.columns().find((x) => x.key === key)
      if (c?.filter) out.push({ key: `col_${key}`, text: `${c.label}: ${bmDescribeColumnFilter(c.filter, value, { yes: this.labels.yes, no: this.labels.no, optionLabel: (v) => this.filterOptions(c).find((o) => o.value === v)?.label })}` })
    }
    for (const f of this.filters()) {
      const v = p.filters[f.key]
      if (v) out.push({ key: f.key, text: `${f.label}: ${f.options.find((o) => o.value === v)?.label ?? v}` })
    }
    return out
  })
  /** il pulsante Filtri non conta la ricerca (già visibile nel campo) ma conta la scheda scelta */
  protected readonly filterCount = computed(() => this.criteria().filter((c) => c.key !== 'q').length + (this.tabs() && this.params().filters[this.tabs()!.param] ? 1 : 0))
  protected readonly filterBtnClass = computed(
    () =>
      `flex h-10 shrink-0 items-center justify-center gap-2 rounded-[9px] border px-3 text-sm font-medium hover:bg-sunken ${this.filterCount() > 0 ? 'border-accent bg-accent-wash text-accent-ink' : 'border-line-strong bg-surface text-ink-2'}`,
  )
  protected readonly searchClass = computed(() => `${inputClass} pl-9 [&::-webkit-search-cancel-button]:hidden ${this.scopeOptions().length > 1 ? 'pr-[130px]' : 'pr-9'}`)
  protected readonly scopeClass = computed(
    () => `flex h-7 items-center gap-1 rounded-md px-2 text-xs hover:bg-sunken hover:text-ink ${this.params().scope !== 'all' ? 'bg-accent-soft font-medium text-accent-ink' : 'text-muted'}`,
  )
  /** le colonne nell'ordine scelto dall'utente: la fissa per prima, le altre come nell'ordine salvato (le nuove in coda) */
  protected readonly ordered = computed(() => {
    const cols = this.columns()
    const fixed = cols.filter((c) => c.fixed)
    const rest = cols.filter((c) => !c.fixed)
    const o = this.order()
    return [...fixed, ...[...rest].sort((a, b) => (o.indexOf(a.key) === -1 ? 1e6 : o.indexOf(a.key)) - (o.indexOf(b.key) === -1 ? 1e6 : o.indexOf(b.key)))]
  })
  protected readonly shownColumns = computed(() => this.ordered().filter((c) => c.fixed || !this.hidden().has(c.key)))
  protected readonly viewColumns = computed<BmViewColumn[]>(() => this.ordered().filter((c) => !c.fixed).map((c) => ({ key: c.key, label: c.label, shown: !this.hidden().has(c.key) })))
  protected readonly viewChanged = computed(() => this.hidden().size > 0 || this.order().length > 0)
  protected readonly widths = computed(() =>
    [
      this.detail() ? '36px' : null,
      // una colonna con il filtro ha 26px in più per l'imbuto accanto al nome (le larghezze fisse, se no il nome si taglia)
      ...this.shownColumns().map((c) => {
        const w = c.width.replace('minmax(0,', 'minmax(190px,')
        return c.filter && /^\d+px$/.test(w) ? `${Number.parseInt(w, 10) + 26}px` : w
      }),
      '40px',
    ].filter(Boolean) as string[],
  )
  protected readonly gridTemplate = computed(() => this.widths().join(' '))
  protected readonly minWidth = computed(() => this.widths().reduce((sum, w) => sum + (Number(/(\d+)px/.exec(w)?.[1]) || 0), 0) + (this.widths().length - 1) * 16 + 40)

  constructor() {
    // il testo del campo segue l'indirizzo (azzera, indietro del browser…)
    effect(() => this.query.set(this.params().q))
    // la vista (colonne nascoste e ordine) si ricorda nel browser sotto `viewKey`
    effect(() => {
      const key = this.viewKey()
      if (!key || key === this.loadedKey) return
      this.loadedKey = key
      try {
        const v = JSON.parse(localStorage.getItem(`bm.view.${key}`) ?? 'null') as { hidden?: string[]; order?: string[] } | null
        if (v) {
          this.hidden.set(new Set(v.hidden ?? []))
          this.order.set(v.order ?? [])
        }
      } catch {
        // browser senza storage o dato rovinato: resta la vista di base
      }
    })
    afterNextRender(() => {
      const el = this.toolbar()?.nativeElement
      if (!el) return
      const observer = new ResizeObserver(() => this.toolbarH.set(el.offsetHeight))
      observer.observe(el)
      this.toolbarH.set(el.offsetHeight)
      this.destroyRef.onDestroy(() => observer.disconnect())
    })
  }

  // ---- ricerca, filtri, ordinamento, pagina -------------------------------------------------------------------
  protected onSearch(value: string): void {
    this.query.set(value)
    clearTimeout(this.timer)
    // la ricerca parte dopo una breve pausa nella digitazione
    this.timer = setTimeout(() => this.go.emit({ q: value.trim() || null }), 300)
  }

  protected onScope(value: string): void {
    this.go.emit({ ambito: value === 'all' ? null : value })
  }

  protected onTab(param: string, value: string): void {
    this.go.emit({ [param]: value || null })
  }

  protected isTab(value: string): boolean {
    return (this.params().filters[this.tabs()!.param] ?? '') === value
  }

  protected removeCriterion(key: string): void {
    if (key === 'q') this.query.set('')
    this.go.emit({ [key]: null })
  }

  protected clearAll(): void {
    this.query.set('')
    const patch: BmParamsPatch = { q: null }
    for (const f of this.filters()) patch[f.key] = null
    for (const k of Object.keys(this.params().cols)) patch[`col_${k}`] = null
    const t = this.tabs()
    if (t) patch[t.param] = null
    this.go.emit(patch)
  }

  protected sortBy(key: string): void {
    const p = this.params()
    this.go.emit({ sort: key, dir: p.sort === key && p.dir === 'asc' ? 'desc' : 'asc' })
  }

  protected sortState(key: string): 'ascending' | 'descending' | 'none' {
    const p = this.params()
    return p.sort === key ? (p.dir === 'asc' ? 'ascending' : 'descending') : 'none'
  }

  protected sortIcon(key: string): string {
    const p = this.params()
    return p.sort !== key ? 'chevrons-up-down' : p.dir === 'asc' ? 'arrow-up' : 'arrow-down'
  }

  protected changePage(page: number): void {
    this.top()?.nativeElement.scrollIntoView({ block: 'start', behavior: 'smooth' })
    this.go.emit({ pagina: String(page) })
  }

  // ---- filtri di colonna e impostazioni della tabella -----------------------------------------------------------------
  protected onColFilter(key: string, value: string | null): void {
    this.go.emit({ [`col_${key}`]: value })
  }

  protected filterOptions(c: BmColumn): { value: string; label: string }[] {
    return c.filterOptions ?? Object.entries(c.badges ?? {}).map(([value, b]) => ({ value, label: b.label }))
  }

  protected toggleColumn(key: string): void {
    this.hidden.update((cur) => {
      const next = new Set(cur)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    this.persist()
  }

  protected moveColumn(key: string, step: -1 | 1): void {
    const keys = this.ordered().filter((c) => !c.fixed).map((c) => c.key)
    const at = keys.indexOf(key)
    const to = at + step
    if (at < 0 || to < 0 || to >= keys.length) return
    ;[keys[at], keys[to]] = [keys[to], keys[at]]
    this.order.set(keys)
    this.persist()
  }

  protected resetView(): void {
    this.hidden.set(new Set())
    this.order.set([])
    this.persist()
  }

  private persist(): void {
    if (!this.viewKey()) return
    try {
      localStorage.setItem(`bm.view.${this.viewKey()}`, JSON.stringify({ hidden: [...this.hidden()], order: this.order() }))
    } catch {
      // browser senza storage: la scelta vale per questa pagina
    }
  }

  /** di lato la testata segue le righe */
  protected syncHead(): void {
    const head = this.headInner()?.nativeElement
    const scroller = this.scroller()?.nativeElement
    if (head && scroller) head.style.transform = `translateX(${-scroller.scrollLeft}px)`
  }

  // ---- righe ---------------------------------------------------------------------------------------------------------
  protected rowId(row: Row, index: number): string {
    return String(row[this.rowKey()] ?? index)
  }

  /** aperta (e non in chiusura): la freccia è girata e il dettaglio è visibile */
  protected isOpen(id: string): boolean {
    return this.expanded().has(id) && !this.closing().has(id)
  }

  /** nel template finché la chiusura non è finita (così la chiusura si anima) */
  protected isMounted(id: string): boolean {
    return this.expanded().has(id)
  }

  protected toggle(id: string): void {
    if (this.closing().has(id)) return
    if (this.expanded().has(id)) {
      // chiusura animata: il dettaglio resta nel template il tempo del movimento
      this.closing.update((cur) => new Set(cur).add(id))
      setTimeout(() => {
        this.expanded.update((cur) => new Set([...cur].filter((k) => k !== id)))
        this.closing.update((cur) => new Set([...cur].filter((k) => k !== id)))
      }, 260)
    } else this.expanded.update((cur) => new Set(cur).add(id))
  }

  protected onRowClick(e: MouseEvent, id: string): void {
    if (this.detail() && !(e.target as HTMLElement).closest('a,button,input')) this.toggle(id)
  }

  protected rowClass(id: string): string {
    return `group relative grid items-center gap-x-4 px-5 text-sm hover:bg-subtle min-h-[56px] py-2 ${this.isOpen(id) ? 'bg-subtle' : 'bg-surface'} ${this.detail() ? 'cursor-pointer' : ''}`
  }

  /** segnalino a sinistra: rosso o arancione per lo stato, barra lime di 2px al passaggio */
  protected toneClass(row: Row): string {
    const t = this.tone()
    const tone = t ? t.map[String(row[t.column] ?? '')] : undefined
    return `pointer-events-none absolute inset-y-0 left-0 w-[3px] group-hover:w-[2px] group-hover:bg-lime ${tone === 'err' ? 'bg-err' : tone === 'warn' ? 'bg-orange' : ''}`
  }

  protected menuItemsOf(row: Row): BmMenuItem[] {
    return this.menuItems()?.(row) ?? []
  }

  // ---- celle ------------------------------------------------------------------------------------------------------
  protected isNumeric(c: BmColumn): boolean {
    return c.type === 'number' || c.type === 'money' || c.type === 'percent'
  }

  protected isTrue(v: unknown): boolean {
    return v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true'
  }

  protected badgeOf(c: BmColumn, row: Row): { label: string; tone: BmTone } | null {
    const v = String(row[c.key] ?? '')
    return v ? (c.badges?.[v] ?? { label: v, tone: 'neutral' }) : null
  }

  /** Il valore come si legge: numeri e date nella lingua dell'utente, importi con 2 decimali, valore mancante `—` */
  protected text(c: BmColumn, row: Row): string {
    const v = row[c.key]
    if (v == null || v === '') return '—'
    switch (c.type) {
      case 'number':
        return this.nf.format(Number(v))
      case 'money':
        return new Intl.NumberFormat(this.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v))
      case 'percent':
        return `${new Intl.NumberFormat(this.locale, { maximumFractionDigits: 1 }).format(Number(v))} %`
      case 'date':
      case 'datetime': {
        const d = new Date(String(v))
        return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(this.locale, c.type === 'date' ? { dateStyle: 'short' } : { dateStyle: 'short', timeStyle: 'short' }).format(d)
      }
      case 'bool':
        return this.isTrue(v) ? (c.boolLabels?.on ?? 'Sì') : (c.boolLabels?.off ?? 'No')
      default:
        return String(v).trim()
    }
  }
}
