import { Overlay } from '@angular/cdk/overlay'
import { ComponentPortal } from '@angular/cdk/portal'
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Injectable, InjectionToken, Injector, inject, viewChild } from '@angular/core'
import { BM_LABELS } from './bm-labels'
import { BmIcon } from './bm-icon.component'
import { buttonClass } from './bm-ui'

export interface BmConfirmOptions {
  /** titolo della finestra (default: «Conferma l'operazione») */
  title?: string
  message: string
  /** testo del pulsante di conferma (default: «Conferma») */
  confirmLabel?: string
  /** operazione distruttiva (elimina, ripristina…): pulsante rosso e il fuoco parte su «Annulla» */
  danger?: boolean
}

interface ConfirmData extends BmConfirmOptions {
  done: (result: boolean) => void
}

const CONFIRM_DATA = new InjectionToken<ConfirmData>('BM_CONFIRM_DATA')

/**
 * Finestre di conferma al posto di `window.confirm`: `if (!(await this.confirm.ask({ message: '…', danger: true }))) return`.
 * Larghezza 440px, raggio 16px, fondo scuro; Esc e clic fuori annullano; nelle operazioni distruttive il fuoco parte su «Annulla»
 * (un Invio distratto non elimina). Come `dialogs.tsx` di onSales.
 */
@Injectable({ providedIn: 'root' })
export class BmConfirm {
  private readonly overlay = inject(Overlay)
  private readonly injector = inject(Injector)

  ask(options: BmConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const ref = this.overlay.create({
        hasBackdrop: true,
        backdropClass: ['bg-[rgba(21,23,28,0.46)]', 'pm-fade-in'],
        positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
        scrollStrategy: this.overlay.scrollStrategies.block(),
      })
      let finished = false
      const done = (result: boolean) => {
        if (finished) return
        finished = true
        ref.dispose()
        resolve(result)
      }
      ref.backdropClick().subscribe(() => done(false))
      ref.keydownEvents().subscribe((e) => e.key === 'Escape' && done(false))
      const injector = Injector.create({ parent: this.injector, providers: [{ provide: CONFIRM_DATA, useValue: { ...options, done } satisfies ConfirmData }] })
      ref.attach(new ComponentPortal(BmConfirmDialog, null, injector))
    })
  }
}

@Component({
  selector: 'bm-confirm-dialog',
  imports: [BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="alertdialog" aria-modal="true" aria-labelledby="bm-confirm-title" aria-describedby="bm-confirm-message" class="pm-pop-in flex w-[440px] max-w-full flex-col gap-4 rounded-2xl bg-surface p-6 shadow-[0_24px_64px_rgba(21,23,28,0.28)]">
      <div class="flex items-start gap-3.5">
        <span [class]="data.danger ? 'flex size-10 shrink-0 items-center justify-center rounded-full bg-err-soft text-err' : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink'">
          <bm-icon [name]="data.danger ? 'alert' : 'info'" [size]="20" />
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 id="bm-confirm-title" class="text-[17px] font-semibold tracking-[-0.01em]">{{ data.title ?? labels.confirmTitle }}</h2>
          <div id="bm-confirm-message" class="text-[13.5px] leading-relaxed break-words text-ink-2">{{ data.message }}</div>
        </div>
      </div>
      <div class="flex justify-end gap-2.5">
        <button #cancel type="button" [class]="secondary" (click)="data.done(false)">{{ labels.cancel }}</button>
        <button #ok type="button" [class]="data.danger ? danger : primary" (click)="data.done(true)">{{ data.confirmLabel ?? labels.confirm }}</button>
      </div>
    </div>
  `,
})
export class BmConfirmDialog implements AfterViewInit {
  protected readonly data = inject(CONFIRM_DATA)
  protected readonly labels = inject(BM_LABELS)
  protected readonly primary = buttonClass.primary
  protected readonly secondary = buttonClass.secondary
  protected readonly danger = buttonClass.danger
  private readonly cancel = viewChild.required<ElementRef<HTMLButtonElement>>('cancel')
  private readonly ok = viewChild.required<ElementRef<HTMLButtonElement>>('ok')

  ngAfterViewInit(): void {
    // operazione distruttiva: il fuoco parte su «Annulla»
    ;(this.data.danger ? this.cancel() : this.ok()).nativeElement.focus()
  }
}
