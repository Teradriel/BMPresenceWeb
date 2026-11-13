import { type ConnectedPosition, Overlay, type OverlayRef } from '@angular/cdk/overlay'
import { TemplatePortal } from '@angular/cdk/portal'
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, TemplateRef, ViewContainerRef, computed, inject, input, output, signal, viewChild } from '@angular/core'
import { BM_LABELS } from './bm-labels'
import { BmIcon } from './bm-icon.component'
import { buttonClass, inputClass } from './bm-ui'

export type BmColumnFilterKind = 'text' | 'number' | 'date' | 'bool' | 'option'

/** Intervallo da/a come valore di un filtro (numeri e date): `da..a`, con un estremo anche vuoto */
export const bmEncodeRange = (from: string, to: string): string | null => (from.trim() === '' && to.trim() === '' ? null : `${from.trim()}..${to.trim()}`)
export const bmDecodeRange = (value: string): { from: string; to: string } => {
  const [from = '', to = ''] = value.split('..')
  return { from, to }
}

/**
 * Filtro di una colonna, accanto all'ordinamento nell'intestazione (come `column-filter.tsx` di onSales): l'imbuto si colora quando il filtro è attivo e
 * apre un riquadro da 260px con il controllo giusto per il tipo: testo «contiene», da/a per numeri e date, sì/no, o la scelta tra i valori. `value` è il
 * filtro attuale come nell'indirizzo (vuoto = nessuno); `changed` emette il nuovo valore o null per toglierlo. Invio applica, Esc e clic fuori chiudono.
 * Codifica: testo = il testo; numero e data = `da..a`; sì/no = `1`/`0`; scelta = `=valore`.
 */
@Component({
  selector: 'bm-column-filter',
  imports: [BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #trigger
      type="button"
      [attr.aria-label]="labels.columnFilter + ': ' + label()"
      [title]="labels.columnFilter + ': ' + label()"
      [attr.aria-expanded]="isOpen()"
      [class]="active() ? 'flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-ink hover:text-ink' : 'flex size-6 shrink-0 items-center justify-center rounded-md text-muted opacity-50 hover:bg-sunken hover:text-ink hover:opacity-100 focus-visible:opacity-100'"
      (click)="$event.stopPropagation(); toggle()"
    >
      <bm-icon name="filter" [size]="14" />
    </button>

    <ng-template #popup>
      <div role="dialog" [attr.aria-label]="labels.columnFilter + ': ' + label()" class="pm-pop-in flex w-[260px] flex-col gap-3 rounded-xl border border-line bg-surface p-3 text-sm font-normal text-ink shadow-[0_12px_32px_rgba(21,23,28,0.2)]">
        <span class="text-[13px] font-semibold">{{ label() }}</span>
        @switch (kind()) {
          @case ('text') {
            <input [class]="input" maxlength="80" [placeholder]="labels.contains" [attr.aria-label]="labels.contains" [value]="text()" (input)="text.set($any($event.target).value)" (keydown.enter)="submit()" />
          }
          @case ('number') {
            <div class="flex items-center gap-2">
              <input [class]="input + ' tabular-nums'" inputmode="decimal" [placeholder]="labels.min" [attr.aria-label]="labels.min" [value]="from()" (input)="from.set($any($event.target).value)" (keydown.enter)="submit()" />
              <span class="text-muted">–</span>
              <input [class]="input + ' tabular-nums'" inputmode="decimal" [placeholder]="labels.max" [attr.aria-label]="labels.max" [value]="to()" (input)="to.set($any($event.target).value)" (keydown.enter)="submit()" />
            </div>
          }
          @case ('date') {
            <div class="flex flex-col gap-2">
              <label class="flex items-center gap-2 text-[13px]"><span class="w-8 text-muted">{{ labels.from }}</span><input type="date" [class]="input" [value]="from()" (input)="from.set($any($event.target).value)" (keydown.enter)="submit()" /></label>
              <label class="flex items-center gap-2 text-[13px]"><span class="w-8 text-muted">{{ labels.to }}</span><input type="date" [class]="input" [value]="to()" (input)="to.set($any($event.target).value)" (keydown.enter)="submit()" /></label>
            </div>
          }
          @case ('bool') {
            <div class="flex flex-col gap-0.5">
              <button type="button" [class]="choice('1')" (click)="apply('1')">{{ labels.yes }}</button>
              <button type="button" [class]="choice('0')" (click)="apply('0')">{{ labels.no }}</button>
            </div>
          }
          @case ('option') {
            <div class="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
              @for (o of options(); track o.value) {
                <button type="button" [class]="choice('=' + o.value)" (click)="apply('=' + o.value)">{{ o.label }}</button>
              }
            </div>
          }
        }
        <div class="flex items-center justify-between gap-2">
          <button type="button" [class]="ghost" [disabled]="!value()" (click)="apply(null)">{{ labels.remove }}</button>
          @if (kind() === 'text' || kind() === 'number' || kind() === 'date') {
            <button type="button" [class]="primary" (click)="submit()">{{ labels.apply }}</button>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class BmColumnFilter {
  protected readonly labels = inject(BM_LABELS)
  private readonly overlay = inject(Overlay)
  private readonly vcr = inject(ViewContainerRef)
  private readonly popup = viewChild.required<TemplateRef<unknown>>('popup')
  private readonly trigger = viewChild.required<ElementRef<HTMLElement>>('trigger')
  private ref?: OverlayRef

  protected readonly input = `${inputClass} h-9`
  protected readonly primary = `${buttonClass.primary} h-8 px-3`
  protected readonly ghost = `${buttonClass.ghost} h-8`

  readonly label = input.required<string>()
  readonly kind = input.required<BmColumnFilterKind>()
  readonly value = input('')
  readonly options = input<{ value: string; label: string }[]>([])
  readonly changed = output<string | null>()

  protected readonly isOpen = signal(false)
  protected readonly active = computed(() => this.value() !== '')
  protected readonly text = signal('')
  protected readonly from = signal('')
  protected readonly to = signal('')

  constructor() {
    inject(DestroyRef).onDestroy(() => this.ref?.dispose())
  }

  protected choice(v: string): string {
    return `flex h-9 w-full items-center rounded-lg px-2.5 text-left text-[13px] hover:bg-sunken ${this.value() === v ? 'bg-accent-wash font-medium text-accent-ink' : ''}`
  }

  protected toggle(): void {
    if (this.ref) return this.close()
    const k = this.kind()
    const v = this.value()
    this.text.set(k === 'text' ? v : '')
    const r = k === 'number' || k === 'date' ? bmDecodeRange(v) : { from: '', to: '' }
    this.from.set(r.from)
    this.to.set(r.to)
    const positions: ConnectedPosition[] = [
      { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
      { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
    ]
    this.ref = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy: this.overlay.position().flexibleConnectedTo(this.trigger()).withPositions(positions).withPush(true),
      // scorrendo la pagina il riquadro non sta più sotto la sua intestazione
      scrollStrategy: this.overlay.scrollStrategies.close(),
    })
    this.ref.backdropClick().subscribe(() => this.close())
    this.ref.detachments().subscribe(() => this.isOpen.set(false))
    this.ref.keydownEvents().subscribe((e) => e.key === 'Escape' && this.close())
    this.ref.attach(new TemplatePortal(this.popup(), this.vcr))
    this.isOpen.set(true)
    setTimeout(() => document.querySelector<HTMLInputElement>('.cdk-overlay-container [role=dialog] input')?.focus())
  }

  protected close(): void {
    this.ref?.dispose()
    this.ref = undefined
    this.isOpen.set(false)
  }

  protected submit(): void {
    const k = this.kind()
    this.apply(k === 'text' ? this.text().trim() : bmEncodeRange(this.from(), this.to()))
  }

  protected apply(next: string | null): void {
    this.changed.emit(next && next.trim() !== '' ? next : null)
    this.close()
  }
}

/** Il filtro di una colonna come testo, per i «criteri attivi» del pannello dei filtri */
export function bmDescribeColumnFilter(kind: BmColumnFilterKind, value: string, o: { yes: string; no: string; optionLabel: (v: string) => string | undefined }): string {
  switch (kind) {
    case 'bool':
      return value === '1' ? o.yes : o.no
    case 'option':
      return o.optionLabel(value.replace(/^=/, '')) ?? value.replace(/^=/, '')
    case 'number':
    case 'date': {
      const { from, to } = bmDecodeRange(value)
      return from && to ? `${from} – ${to}` : from ? `≥ ${from}` : `≤ ${to}`
    }
    default:
      return `«${value}»`
  }
}
