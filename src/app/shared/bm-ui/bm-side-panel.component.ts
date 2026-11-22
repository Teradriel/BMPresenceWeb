import { Overlay, type OverlayRef } from '@angular/cdk/overlay'
import { TemplatePortal } from '@angular/cdk/portal'
import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, TemplateRef, ViewContainerRef, inject, input, output, signal, viewChild } from '@angular/core'
import { BM_LABELS } from './bm-labels'
import { BmConfirm } from './bm-confirm.service'
import { BmIcon } from './bm-icon.component'
import { buttonClass } from './bm-ui'

let nextId = 0

/**
 * Pannello laterale a destra (come `side-panel.tsx` di onSales): scorre dentro da destra sopra la pagina, che resta scurita; si chiude con la X,
 * con Esc o cliccando fuori, con un'uscita animata (con il movimento ridotto subito); `beforeClose` può impedirlo. Il contenuto scorre, il piede
 * (elemento con l'attributo `bmPanelFooter`) resta fisso in fondo. Esiste mentre c'è nel template: `@if (open()) { <bm-side-panel …> }`.
 */
@Component({
  selector: 'bm-side-panel',
  imports: [BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #tpl>
      <div [class]="closing() ? 'pm-fade-out fixed inset-0 z-[110] flex justify-end bg-[rgba(21,23,28,0.32)]' : 'pm-fade-in fixed inset-0 z-[110] flex justify-end bg-[rgba(21,23,28,0.32)]'" (mousedown)="onBackdrop($event)">
        <div
          #panel
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="id + '-title'"
          [style.width.px]="width()"
          [class]="closing() ? 'pm-slide-out-right flex h-full max-w-full flex-col bg-surface shadow-[0_24px_64px_rgba(21,23,28,0.28)] outline-none' : 'pm-slide-in-right flex h-full max-w-full flex-col bg-surface shadow-[0_24px_64px_rgba(21,23,28,0.28)] outline-none'"
          (keydown.escape)="close()"
          (animationend)="onAnimationEnd($event)"
        >
          <div class="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
            <h2 [id]="id + '-title'" class="flex items-center gap-2 text-[17px] font-semibold">
              @if (icon()) {
                <bm-icon [name]="icon()" [size]="20" class="text-muted" />
              }
              {{ title() }}
            </h2>
            <button type="button" [attr.aria-label]="labels.close" (click)="close()" class="flex size-9 items-center justify-center rounded-[9px] bg-sunken text-ink-2 hover:bg-line">
              <bm-icon name="x" [size]="18" />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5"><ng-content /></div>
          <div class="border-t border-line px-6 py-3.5 empty:hidden"><ng-content select="[bmPanelFooter]" /></div>
        </div>
      </div>
    </ng-template>
  `,
})
export class BmSidePanel implements AfterViewInit {
  protected readonly labels = inject(BM_LABELS)
  private readonly overlay = inject(Overlay)
  private readonly vcr = inject(ViewContainerRef)
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl')
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel')
  private ref?: OverlayRef

  protected readonly id = `bm-panel-${nextId++}`
  protected readonly closing = signal(false)

  readonly title = input.required<string>()
  readonly icon = input('')
  readonly width = input(640)
  /** chiamata prima di chiudere (X, Esc, clic fuori): se risponde false il pannello resta aperto (es. modifiche non salvate) */
  readonly beforeClose = input<(() => boolean | Promise<boolean>) | undefined>(undefined)
  readonly closed = output<void>()

  constructor() {
    inject(DestroyRef).onDestroy(() => this.ref?.dispose())
  }

  ngAfterViewInit(): void {
    this.ref = this.overlay.create({
      positionStrategy: this.overlay.position().global(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    })
    this.ref.attach(new TemplatePortal(this.tpl(), this.vcr))
    // il fuoco entra nel pannello
    setTimeout(() => this.panel()?.nativeElement.focus())
  }

  protected onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) void this.close()
  }

  async close(): Promise<void> {
    if (this.closing()) return
    const before = this.beforeClose()
    if (before && !(await before())) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.closed.emit()
    else {
      this.closing.set(true)
      // se l'animazione non parte (scheda in secondo piano) il pannello si chiude lo stesso
      setTimeout(() => this.closing() && this.closed.emit(), 400)
    }
  }

  protected onAnimationEnd(e: AnimationEvent): void {
    if (this.closing() && e.target === e.currentTarget) this.closed.emit()
  }
}

/**
 * Pannello a destra per creare o modificare un elemento (come `form-panel.tsx`): titolo, contenuto che scorre e in fondo Annulla / Salva con l'errore
 * sopra. «Salva» resta spento finché non ci sono modifiche (`dirty`) e i campi obbligatori (`canSave`); se ci sono modifiche chiudere chiede conferma;
 * durante il salvataggio (`busy`) non si chiude.
 */
@Component({
  selector: 'bm-form-panel',
  imports: [BmSidePanel, BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bm-side-panel #panel [title]="title()" [icon]="icon()" [width]="width()" [beforeClose]="guard" (closed)="closed.emit()">
      <ng-content />
      <div bmPanelFooter class="flex flex-col gap-2">
        @if (error()) {
          <p role="alert" class="text-[13px] font-medium text-err-ink">{{ error() }}</p>
        }
        <div class="flex justify-end gap-2.5">
          <button type="button" [class]="secondary" [disabled]="busy()" (click)="panel.close()">{{ labels.cancel }}</button>
          <button type="button" [class]="primary" [disabled]="busy() || !dirty() || !canSave()" (click)="save.emit()">
            @if (busy()) {
              <bm-icon name="loader" [size]="16" class="animate-spin" />
            }
            {{ saveLabel() || labels.save }}
          </button>
        </div>
      </div>
    </bm-side-panel>
  `,
})
export class BmFormPanel {
  protected readonly labels = inject(BM_LABELS)
  private readonly confirm = inject(BmConfirm)
  protected readonly primary = buttonClass.primary
  protected readonly secondary = buttonClass.secondary

  readonly title = input.required<string>()
  readonly icon = input('')
  readonly width = input(560)
  readonly dirty = input.required<boolean>()
  readonly busy = input(false)
  readonly error = input<string | null>(null)
  readonly canSave = input(true)
  readonly saveLabel = input('')
  readonly save = output<void>()
  readonly closed = output<void>()

  protected readonly guard = async (): Promise<boolean> => {
    if (this.busy()) return false
    return !this.dirty() || this.confirm.ask({ title: this.labels.discardTitle, message: this.labels.discardMessage, confirmLabel: this.labels.discard, danger: true })
  }
}
