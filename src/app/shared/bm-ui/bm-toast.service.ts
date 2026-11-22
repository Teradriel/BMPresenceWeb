import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core'
import { BM_LABELS } from './bm-labels'
import { BmIcon } from './bm-icon.component'

export type BmToastTone = 'ok' | 'err' | 'info'

export interface BmToastItem {
  id: number
  tone: BmToastTone
  text: string
}

/** Quanto resta a schermo: gli errori più a lungo, perché vanno letti */
const DURATION: Record<BmToastTone, number> = { ok: 5000, info: 6000, err: 12000 }
const MAX_VISIBLE = 4

/**
 * Notifiche a comparsa in basso a destra (come `toast.tsx` di onSales): `toast.show({ tone: 'ok', text: '…' })`.
 * Al massimo 4 insieme; un testo uguale già a schermo viene sostituito. Serve `<bm-toast-outlet />` una volta nella radice dell'app.
 */
@Injectable({ providedIn: 'root' })
export class BmToast {
  readonly items = signal<BmToastItem[]>([])
  private next = 1
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>()

  show(input: { tone: BmToastTone; text: string }): void {
    const id = this.next++
    this.items.update((cur) => {
      cur.filter((i) => i.text === input.text).forEach((i) => this.clear(i.id))
      return [...cur.filter((i) => i.text !== input.text), { id, ...input }].slice(-MAX_VISIBLE)
    })
    this.timers.set(id, setTimeout(() => this.dismiss(id), DURATION[input.tone]))
  }

  dismiss(id: number): void {
    this.clear(id)
    this.items.update((cur) => cur.filter((i) => i.id !== id))
  }

  private clear(id: number): void {
    clearTimeout(this.timers.get(id))
    this.timers.delete(id)
  }
}

const styles: Record<BmToastTone, string> = {
  ok: 'border-ok/30 bg-ok-soft text-ok-ink',
  err: 'border-err/30 bg-err-soft text-err-ink',
  info: 'border-accent/30 bg-accent-soft text-accent-ink',
}
const icons: Record<BmToastTone, string> = { ok: 'check-circle', err: 'alert', info: 'info' }

@Component({
  selector: 'bm-toast-outlet',
  imports: [BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2 lg:right-6 lg:bottom-6">
      @for (i of toast.items(); track i.id) {
        <div [attr.role]="i.tone === 'err' ? 'alert' : 'status'" [class]="'pm-slide-up pointer-events-auto flex items-start gap-2.5 rounded-[12px] border px-4 py-3 text-sm shadow-lg ' + styles[i.tone]">
          <bm-icon [name]="icons[i.tone]" [size]="16" class="mt-0.5" />
          <span class="min-w-0 flex-1 break-words">{{ i.text }}</span>
          <button type="button" [attr.aria-label]="labels.closeMessage" (click)="toast.dismiss(i.id)" class="shrink-0 opacity-70 hover:opacity-100">
            <bm-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
})
export class BmToastOutlet {
  protected readonly toast = inject(BmToast)
  protected readonly labels = inject(BM_LABELS)
  protected readonly styles = styles
  protected readonly icons = icons
}
