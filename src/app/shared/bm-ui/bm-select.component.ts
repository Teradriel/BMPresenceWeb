import { DOCUMENT } from '@angular/common'
import { CdkConnectedOverlay, CdkOverlayOrigin, type ConnectedPosition } from '@angular/cdk/overlay'
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, forwardRef, inject, input, model, signal } from '@angular/core'
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { BM_LABELS } from './bm-labels'
import { BmIcon } from './bm-icon.component'
import { inputClass } from './bm-ui'

export interface BmOption {
  value: string
  /** come si vede nell'elenco */
  label: string
  /** testo nel campo chiuso e per la ricerca da tastiera (se manca: `label`) */
  text?: string
  /** seconda riga nell'elenco */
  description?: string
  disabled?: boolean
}

/** Da quante voci in su l'elenco ha il campo di ricerca (se non lo decide `searchable`) */
const SEARCH_FROM = 8
let nextId = 0

/**
 * Menu a tendina al posto di <select> (stesso comportamento di `select.tsx` di onSales): elenco in uno strato sopra la pagina (CDK overlay),
 * sotto il campo o sopra se sotto non c'è posto; con 8 voci o più la ricerca in cima; frecce, Home/Fine, Invio o Spazio, Esc, Tab e lettere
 * (senza ricerca) per saltare a una voce. Funziona con `formControlName`/`ngModel` e con `[(value)]`.
 * `active` = c'è una scelta che restringe una lista (filtri): campo con accento. `bare` = senza aspetto da campo (per metterlo dentro altri controlli
 * con `triggerClass`).
 */
@Component({
  selector: 'bm-select',
  imports: [CdkOverlayOrigin, CdkConnectedOverlay, BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BmSelect), multi: true }],
  host: { class: 'block' },
  template: `
    <button
      #trigger
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? id : null"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-invalid]="invalid() || null"
      [disabled]="isDisabled()"
      [class]="triggerClasses()"
      (click)="toggle()"
      (keydown)="onTriggerKey($event)"
    >
      <span class="min-w-0 flex-1 truncate" [class.text-placeholder]="!selected()">{{ shownText() }}</span>
      <bm-icon name="chevron-down" [size]="16" [class]="open() ? 'shrink-0 rotate-180 text-muted transition-transform' : 'shrink-0 text-muted transition-transform'" />
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayWidth]="menuWidth()"
      [cdkConnectedOverlayPush]="true"
      (overlayOutsideClick)="onOutside($event)"
      (attach)="onAttach()"
      (detach)="close(false)"
    >
      <div
        [id]="id"
        tabindex="-1"
        role="listbox"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-activedescendant]="list()[activeIndex()] ? id + '-' + activeIndex() : null"
        (keydown)="onMenuKey($event)"
        class="pm-pop-in flex max-h-[340px] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_12px_32px_rgba(21,23,28,0.2)] outline-none"
      >
        @if (hasSearch()) {
          <div class="flex shrink-0 items-center gap-2 border-b border-line-soft px-3 transition-colors focus-within:border-lime">
            <bm-icon name="search" [size]="16" [stroke]="1.8" class="shrink-0 text-muted" />
            <input
              [value]="query()"
              (input)="onQuery($any($event.target).value)"
              [placeholder]="labels.search"
              [attr.aria-label]="labels.search"
              [attr.aria-controls]="id"
              autocomplete="off"
              spellcheck="false"
              class="h-10 min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-placeholder"
            />
            @if (query()) {
              <button type="button" [attr.aria-label]="labels.clearSearch" (click)="onQuery('')" class="flex size-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink">
                <bm-icon name="x" [size]="14" />
              </button>
            }
          </div>
        }
        <div class="min-h-0 flex-1 overflow-y-auto p-1.5">
          @if (query() && list().length === 0) {
            <div class="px-3 py-6 text-center text-[13px] text-muted">{{ labels.noResults }}</div>
          }
          @for (o of list(); track o.value; let i = $index) {
            <div
              role="option"
              [id]="id + '-' + i"
              [attr.data-index]="i"
              [attr.aria-selected]="o.value === value()"
              [attr.aria-disabled]="o.disabled || null"
              [class]="optionClasses(o, i)"
              (mousemove)="onHover(i, o)"
              (click)="choose(o)"
            >
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate">{{ o.label }}</span>
                @if (o.description) {
                  <span class="truncate text-xs font-normal text-muted">{{ o.description }}</span>
                }
              </span>
              @if (o.value === value()) {
                <bm-icon name="check" [size]="16" class="shrink-0 text-accent-ink" />
              }
            </div>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class BmSelect implements ControlValueAccessor {
  protected readonly labels = inject(BM_LABELS)
  private readonly doc = inject(DOCUMENT)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  readonly options = input.required<BmOption[]>()
  readonly value = model('')
  readonly placeholder = input('')
  readonly ariaLabel = input('')
  readonly invalid = input(false)
  /** c'è una scelta che restringe una lista (filtri): campo con accento */
  readonly active = input(false)
  readonly searchable = input<boolean | undefined>(undefined)
  readonly bare = input(false)
  readonly disabled = input(false)
  readonly triggerClass = input('')

  protected readonly id = `bm-select-${nextId++}`
  protected readonly open = signal(false)
  protected readonly query = signal('')
  protected readonly activeIndex = signal(0)
  protected readonly menuWidth = signal(200)
  private readonly formDisabled = signal(false)
  private byMouse = false
  private typed = { text: '', at: 0 }
  private onChange: (v: string) => void = () => {}
  private onTouched: () => void = () => {}

  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  ]

  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled())
  protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()))
  protected readonly shownText = computed(() => {
    const s = this.selected()
    return s ? (s.text ?? s.label) : this.placeholder()
  })
  protected readonly hasSearch = computed(() => this.searchable() ?? this.options().length >= SEARCH_FROM)
  protected readonly list = computed(() => {
    const needle = this.query().trim().toLowerCase()
    return needle ? this.options().filter((o) => `${o.text ?? o.label} ${o.description ?? ''}`.toLowerCase().includes(needle)) : this.options()
  })
  protected readonly triggerClasses = computed(() => {
    const base = 'flex items-center justify-between gap-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
    const look = this.bare()
      ? ''
      : this.active()
        ? 'h-10 w-full rounded-[9px] border border-accent bg-accent-wash px-3 text-sm text-accent-ink hover:border-ink-2'
        : `${inputClass} hover:border-ink-2`
    return `${base} ${look} ${this.invalid() ? 'border-err' : ''} ${this.triggerClass()}`
  })

  constructor() {
    // la voce attiva resta in vista, ma solo quando la sceglie la tastiera (se la evidenzia il mouse, riportarla in vista annullerebbe lo scorrimento)
    effect(() => {
      const i = this.activeIndex()
      if (!this.open() || this.byMouse) return
      queueMicrotask(() => this.doc.getElementById(`${this.id}-${i}`)?.scrollIntoView({ block: 'nearest' }))
    })
  }

  writeValue(v: string | null): void {
    this.value.set(v ?? '')
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn
  }
  setDisabledState(d: boolean): void {
    this.formDisabled.set(d)
  }

  protected optionClasses(o: BmOption, i: number): string {
    return [
      'relative flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px]',
      i === this.activeIndex() ? 'bg-sunken before:absolute before:inset-y-2 before:left-0 before:w-[2px] before:rounded-full before:bg-lime' : '',
      o.value === this.value() ? 'font-medium text-ink' : 'text-ink-2',
      o.disabled ? 'cursor-not-allowed opacity-50' : '',
    ].join(' ')
  }

  protected toggle(): void {
    this.open() ? this.close(false) : this.show()
  }

  private show(): void {
    if (this.isDisabled()) return
    this.menuWidth.set(Math.max(this.host.nativeElement.offsetWidth, 200))
    this.query.set('')
    const at = this.options().findIndex((o) => o.value === this.value())
    this.activeIndex.set(at >= 0 ? at : Math.max(0, this.options().findIndex((o) => !o.disabled)))
    this.byMouse = false
    this.open.set(true)
  }

  protected close(refocus: boolean): void {
    if (!this.open()) return
    this.open.set(false)
    this.onTouched()
    if (refocus) this.host.nativeElement.querySelector('button')?.focus()
  }

  protected onOutside(e: MouseEvent): void {
    // il clic sul campo lo gestisce `toggle()`
    if (!this.host.nativeElement.contains(e.target as Node)) this.close(false)
  }

  protected onAttach(): void {
    // il fuoco passa all'elenco (o al suo campo di ricerca)
    setTimeout(() => {
      const menu = this.doc.getElementById(this.id)
      ;(menu?.querySelector('input') ?? menu)?.focus()
    })
  }

  protected choose(o: BmOption): void {
    if (o.disabled) return
    this.close(true)
    if (o.value !== this.value()) {
      this.value.set(o.value)
      this.onChange(o.value)
    }
  }

  protected onHover(i: number, o: BmOption): void {
    if (i === this.activeIndex() || o.disabled) return
    this.byMouse = true
    this.activeIndex.set(i)
  }

  protected onQuery(text: string): void {
    this.query.set(text)
    this.byMouse = false
    // la prima voce che combacia è già evidenziata: Invio la sceglie
    this.activeIndex.set(Math.max(0, this.list().findIndex((o) => !o.disabled)))
  }

  protected onTriggerKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.show()
    }
  }

  private move(from: number, step: 1 | -1): number {
    const list = this.list()
    for (let i = from + step; i >= 0 && i < list.length; i += step) if (!list[i].disabled) return i
    return from
  }

  protected onMenuKey(e: KeyboardEvent): void {
    this.byMouse = false
    const list = this.list()
    const search = this.hasSearch()
    const active = this.activeIndex()
    if (e.key === 'ArrowDown') this.activeIndex.set(this.move(active, 1))
    else if (e.key === 'ArrowUp') this.activeIndex.set(this.move(active, -1))
    else if (e.key === 'Home' && !search) this.activeIndex.set(this.move(-1, 1))
    else if (e.key === 'End' && !search) this.activeIndex.set(this.move(list.length, -1))
    else if (e.key === 'Enter' || (e.key === ' ' && !search)) {
      if (list[active]) this.choose(list[active])
    } else if (e.key === 'Escape') this.close(true)
    else if (e.key === 'Tab') this.close(false)
    else if (!search && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // lettere: si salta alla prima voce che inizia con quanto digitato negli ultimi istanti
      const now = e.timeStamp
      this.typed = { text: (now - this.typed.at > 700 ? '' : this.typed.text) + e.key.toLowerCase(), at: now }
      const text = (o: BmOption) => (o.text ?? o.label).toLowerCase()
      const from = list.findIndex((o, i) => i >= (this.typed.text.length > 1 ? active : active + 1) && !o.disabled && text(o).startsWith(this.typed.text))
      const at = from >= 0 ? from : list.findIndex((o) => !o.disabled && text(o).startsWith(this.typed.text))
      if (at >= 0) this.activeIndex.set(at)
    } else return
    e.preventDefault()
  }
}
