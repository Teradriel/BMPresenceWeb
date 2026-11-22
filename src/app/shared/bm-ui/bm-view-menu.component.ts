import { type ConnectedPosition, Overlay, type OverlayRef } from '@angular/cdk/overlay'
import { TemplatePortal } from '@angular/cdk/portal'
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, TemplateRef, ViewContainerRef, inject, input, output, signal, viewChild } from '@angular/core'
import { BM_LABELS } from './bm-labels'
import { BmIcon } from './bm-icon.component'

export interface BmViewColumn {
  key: string
  label: string
  shown: boolean
}

/**
 * Impostazioni della tabella (menu «Vista» di `view-options.tsx`): quali colonne mostrare e in che ordine, e «Ripristina vista». L'icona sta nell'ultima cella
 * dell'intestazione ed è evidenziata (`bg-accent-wash text-accent-ink`) quando la vista è stata modificata; il menu si apre anche con il tasto destro
 * sull'intestazione, dove sta il mouse (`openAtPoint`). Le colonne fisse (il codice che apre il dettaglio) non compaiono: non si nascondono né si spostano.
 * Popup 290px `rounded-[12px]`; casella disegnata (blu accento) come nell'app; frecce su/giù per l'ordine.
 */
@Component({
  selector: 'bm-view-menu',
  imports: [BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #trigger
      type="button"
      aria-haspopup="dialog"
      [attr.aria-expanded]="isOpen()"
      [attr.aria-label]="labels.viewTitle"
      [title]="labels.viewTitle"
      [class]="changed() ? 'flex size-7 items-center justify-center rounded-md bg-accent-wash text-accent-ink hover:bg-sunken' : 'flex size-7 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-ink'"
      (click)="toggle()"
    >
      <bm-icon name="columns" [size]="16" />
    </button>

    <ng-template #popup>
      <div role="dialog" [attr.aria-label]="labels.viewTitle" class="pm-pop-in flex w-[290px] flex-col gap-3 rounded-[12px] border border-line bg-surface p-3 shadow-[0_8px_24px_rgba(21,23,28,0.14)]">
        <div class="flex flex-col gap-1">
          <span class="flex items-center justify-between px-1 text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">
            {{ labels.viewColumns }}
            <span class="font-normal tracking-normal normal-case tabular-nums">{{ labels.viewCount(shownCount().toString(), columns().length.toString()) }}</span>
          </span>
          <div class="flex max-h-[min(46vh,340px)] flex-col gap-0.5 overflow-y-auto">
            @for (c of columns(); track c.key; let i = $index) {
              <div class="flex items-center rounded-lg hover:bg-sunken">
                <button type="button" role="checkbox" [attr.aria-checked]="c.shown" class="flex h-8 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 text-left text-[13px]" (click)="toggleColumn.emit(c.key)">
                  <span [class]="c.shown ? 'flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-accent bg-accent text-white' : 'flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-line-strong bg-surface'">
                    @if (c.shown) {
                      <bm-icon name="check" [size]="12" [stroke]="3.5" />
                    }
                  </span>
                  <span class="truncate">{{ c.label }}</span>
                </button>
                <button type="button" [attr.aria-label]="labels.moveUp + ': ' + c.label" [title]="labels.moveUp" [disabled]="i === 0" [class]="arrow" (click)="move.emit({ key: c.key, step: -1 })">
                  <bm-icon name="chevron-up" [size]="16" />
                </button>
                <button type="button" [attr.aria-label]="labels.moveDown + ': ' + c.label" [title]="labels.moveDown" [disabled]="i === columns().length - 1" [class]="arrow" (click)="move.emit({ key: c.key, step: 1 })">
                  <bm-icon name="chevron-down" [size]="16" />
                </button>
              </div>
            }
          </div>
        </div>
        @if (changed()) {
          <button type="button" class="h-8 rounded-lg text-[13px] font-medium text-accent-ink hover:bg-accent-wash" (click)="reset.emit()">{{ labels.viewReset }}</button>
        }
      </div>
    </ng-template>
  `,
})
export class BmViewMenu {
  protected readonly labels = inject(BM_LABELS)
  private readonly overlay = inject(Overlay)
  private readonly vcr = inject(ViewContainerRef)
  private readonly popup = viewChild.required<TemplateRef<unknown>>('popup')
  private readonly trigger = viewChild.required<ElementRef<HTMLElement>>('trigger')
  private ref?: OverlayRef

  protected readonly arrow = 'flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-line hover:text-ink disabled:pointer-events-none disabled:opacity-30'

  /** colonne che si possono mostrare/nascondere e spostare, nell'ordine in cui sono */
  readonly columns = input.required<BmViewColumn[]>()
  /** la vista è diversa da quella di base: icona evidenziata e «Ripristina vista» */
  readonly changed = input(false)
  readonly toggleColumn = output<string>()
  readonly move = output<{ key: string; step: -1 | 1 }>()
  readonly reset = output<void>()
  protected readonly isOpen = signal(false)

  constructor() {
    inject(DestroyRef).onDestroy(() => this.ref?.dispose())
  }

  protected shownCount(): number {
    return this.columns().filter((c) => c.shown).length
  }

  toggle(): void {
    if (this.ref) return this.close()
    this.open(this.trigger().nativeElement, [
      { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
      { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
    ])
  }

  /** Tasto destro sull'intestazione: il menu si apre dove sta il mouse (nei campi dei filtri resta il menu del browser) */
  openAtPoint(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('input, textarea, select')) return
    e.preventDefault()
    this.close()
    this.open({ x: e.clientX, y: e.clientY }, [
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top', offsetY: 4 },
      { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetY: 4 },
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
    ])
  }

  protected close(): void {
    this.ref?.dispose()
    this.ref = undefined
    this.isOpen.set(false)
  }

  private open(origin: HTMLElement | { x: number; y: number }, positions: ConnectedPosition[]): void {
    this.ref = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy: this.overlay.position().flexibleConnectedTo(origin).withPositions(positions).withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.close(),
    })
    this.ref.backdropClick().subscribe(() => this.close())
    this.ref.detachments().subscribe(() => this.isOpen.set(false))
    this.ref.keydownEvents().subscribe((e) => e.key === 'Escape' && this.close())
    this.ref.attach(new TemplatePortal(this.popup(), this.vcr))
    this.isOpen.set(true)
  }
}
