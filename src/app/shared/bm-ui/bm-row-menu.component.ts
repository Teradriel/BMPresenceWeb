import { type ConnectedPosition, Overlay, type OverlayRef } from '@angular/cdk/overlay'
import { TemplatePortal } from '@angular/cdk/portal'
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, TemplateRef, ViewContainerRef, inject, input, signal, viewChild } from '@angular/core'
import { BM_LABELS } from './bm-labels'
import { BmIcon } from './bm-icon.component'

/** Una voce del menu ⋯ di una riga: un collegamento (`href`) o un'azione (`select`) */
export interface BmMenuItem {
  key: string
  label: string
  hint?: string
  /** nome di un'icona di `bm-icon` */
  icon: string
  href?: string
  select?: () => void
  danger?: boolean
  /** voce spenta: resta visibile con il suo perché nel suggerimento (es. «usato da 2 promo») */
  disabled?: boolean
}

/**
 * Menu ⋯ di una riga di tabella (come `row-menu.tsx` di onSales): voci con titolo e spiegazione, barra lime al passaggio, si chiude con Esc, clic fuori
 * o scorrimento. Si apre sotto il pulsante (sopra se manca posto) e, con il tasto destro sulla riga, dove sta il mouse: la riga chiama
 * `menu.openAtPoint($event)`. Voci: «Apri pagina» → collegamenti agli altri elenchi → «Modifica» → altre azioni → «Elimina» (`danger`) per ultima.
 */
@Component({
  selector: 'bm-row-menu',
  imports: [BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length > 0) {
      <button
        #trigger
        type="button"
        aria-haspopup="menu"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="label()"
        [disabled]="disabled()"
        class="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink disabled:opacity-50"
        (click)="$event.stopPropagation(); toggle()"
      >
        <bm-icon name="more" [size]="16" />
      </button>
    } @else {
      <span class="inline-block size-8"></span>
    }

    <ng-template #menu>
      <div role="menu" class="pm-pop-in w-64 rounded-xl border border-line bg-surface p-1 shadow-[0_8px_24px_rgba(21,23,28,0.12)]">
        @for (it of items(); track it.key) {
          @if (it.href && !it.disabled) {
            <a role="menuitem" [href]="it.href" [class]="itemClass" (click)="close()">
              <bm-icon [name]="it.icon" [size]="16" [class]="iconClass(it)" />
              <span class="flex flex-col"><span [class]="titleClass(it)">{{ it.label }}</span>@if (it.hint) {<span class="text-xs text-muted">{{ it.hint }}</span>}</span>
            </a>
          } @else {
            <button type="button" role="menuitem" [attr.aria-disabled]="it.disabled || null" [disabled]="it.disabled" [class]="it.disabled ? itemClass + ' cursor-not-allowed opacity-55 hover:bg-transparent' : itemClass" (click)="pick(it)">
              <bm-icon [name]="it.icon" [size]="16" [class]="iconClass(it)" />
              <span class="flex flex-col"><span [class]="titleClass(it)">{{ it.label }}</span>@if (it.hint) {<span class="text-xs text-muted">{{ it.hint }}</span>}</span>
            </button>
          }
        }
      </div>
    </ng-template>
  `,
})
export class BmRowMenu {
  protected readonly labels = inject(BM_LABELS)
  private readonly overlay = inject(Overlay)
  private readonly vcr = inject(ViewContainerRef)
  private readonly menu = viewChild.required<TemplateRef<unknown>>('menu')
  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger')
  private ref?: OverlayRef

  readonly items = input.required<BmMenuItem[]>()
  readonly label = input('')
  readonly disabled = input(false)
  protected readonly isOpen = signal(false)

  protected readonly itemClass =
    'relative flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-sunken hover:before:absolute hover:before:inset-y-2 hover:before:left-0 hover:before:w-[2px] hover:before:rounded-full hover:before:bg-lime'

  constructor() {
    inject(DestroyRef).onDestroy(() => this.close())
  }

  protected iconClass(it: BmMenuItem): string {
    return `mt-0.5 shrink-0 ${it.danger ? 'text-err' : 'text-ink-2'}`
  }
  protected titleClass(it: BmMenuItem): string {
    return `text-[13px] font-medium ${it.danger ? 'text-err-ink' : ''}`
  }

  /** Dal pulsante ⋯: sotto, a destra con il bordo del pulsante; sopra se sotto non c'è posto */
  toggle(): void {
    if (this.ref) return this.close()
    const el = this.trigger()?.nativeElement
    if (!el) return
    this.show(el, [
      { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
      { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
    ])
  }

  /** Tasto destro sulla riga: il menu si apre dove sta il mouse (a sinistra se manca posto a destra, sopra se manca sotto). Nei campi di testo resta il menu del browser */
  openAtPoint(e: MouseEvent): void {
    if (this.items().length === 0 || this.disabled()) return
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return
    e.preventDefault()
    this.close()
    this.show({ x: e.clientX, y: e.clientY }, [
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top' },
      { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
      { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
    ])
  }

  protected pick(it: BmMenuItem): void {
    this.close()
    it.select?.()
  }

  close(): void {
    this.ref?.dispose()
    this.ref = undefined
    this.isOpen.set(false)
  }

  private show(origin: HTMLElement | { x: number; y: number }, positions: ConnectedPosition[]): void {
    this.ref = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      positionStrategy: this.overlay.position().flexibleConnectedTo(origin).withPositions(positions).withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.close(),
    })
    this.ref.backdropClick().subscribe(() => this.close())
    this.ref.detachments().subscribe(() => this.isOpen.set(false))
    this.ref.keydownEvents().subscribe((e) => e.key === 'Escape' && this.close())
    this.ref.attach(new TemplatePortal(this.menu(), this.vcr))
    this.isOpen.set(true)
  }
}
