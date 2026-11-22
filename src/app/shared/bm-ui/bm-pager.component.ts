import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core'
import { BM_LABELS } from './bm-labels'
import { BmIcon } from './bm-icon.component'

const step = 'flex size-8 items-center justify-center rounded-lg border border-line bg-surface hover:bg-sunken disabled:opacity-40'

/**
 * Comandi di una tabella a pagine (come `pager.tsx` di onSales): prima, precedente, successiva, ultima e, al centro, il numero della pagina che si
 * può scrivere per andarci subito (Invio o uscita dal campo; un numero fuori scala si porta alla prima o all'ultima pagina; Esc annulla).
 */
@Component({
  selector: 'bm-pager',
  imports: [BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="flex items-center gap-1">
      <button type="button" [class]="step" [attr.aria-label]="labels.first" [title]="labels.first" [disabled]="page() <= 1 || pending()" (click)="go.emit(1)">
        <bm-icon name="chevrons-left" [size]="16" />
      </button>
      <button type="button" [class]="step" [attr.aria-label]="labels.previous" [title]="labels.previous" [disabled]="page() <= 1 || pending()" (click)="go.emit(page() - 1)">
        <bm-icon name="chevron-left" [size]="16" />
      </button>
      <label class="flex items-center gap-1.5 px-1.5">
        <span>{{ labels.page }}</span>
        <input
          type="text"
          inputmode="numeric"
          [attr.aria-label]="labels.goToPage"
          [title]="labels.goToPage"
          [value]="value()"
          [disabled]="pending()"
          [style.width]="width()"
          class="h-8 rounded-lg border border-line-strong bg-surface px-1.5 text-center text-[13px] text-ink tabular-nums"
          (input)="onInput($any($event.target))"
          (focus)="$any($event.target).select()"
          (blur)="commit()"
          (keydown)="onKey($event)"
        />
        <span class="tabular-nums">{{ labels.ofPages(pagesText()) }}</span>
      </label>
      <button type="button" [class]="step" [attr.aria-label]="labels.next" [title]="labels.next" [disabled]="page() >= pages() || pending()" (click)="go.emit(page() + 1)">
        <bm-icon name="chevron-right" [size]="16" />
      </button>
      <button type="button" [class]="step" [attr.aria-label]="labels.last" [title]="labels.last" [disabled]="page() >= pages() || pending()" (click)="go.emit(pages())">
        <bm-icon name="chevrons-right" [size]="16" />
      </button>
    </span>
  `,
})
export class BmPager {
  protected readonly labels = inject(BM_LABELS)
  protected readonly step = step

  readonly page = input.required<number>()
  readonly pages = input.required<number>()
  readonly pending = input(false)
  readonly go = output<number>()

  // il testo nel campo: parte dalla pagina corrente e si rimette a posto quando la pagina cambia
  private readonly typed = signal<{ for: number; value: string } | null>(null)
  protected readonly value = computed(() => {
    const t = this.typed()
    return t && t.for === this.page() ? t.value : String(this.page())
  })
  protected readonly pagesText = computed(() => new Intl.NumberFormat().format(this.pages()))
  protected readonly width = computed(() => `${Math.max(3, String(this.pages()).length + 1.5)}ch`)

  protected onInput(el: HTMLInputElement): void {
    const digits = el.value.replace(/\D/g, '').slice(0, 7)
    el.value = digits
    this.typed.set({ for: this.page(), value: digits })
  }

  protected commit(): void {
    const n = Number.parseInt(this.value(), 10)
    this.typed.set(null)
    if (Number.isFinite(n)) {
      const target = Math.min(this.pages(), Math.max(1, n))
      if (target !== this.page()) this.go.emit(target)
    }
  }

  protected onKey(e: KeyboardEvent): void {
    const el = e.target as HTMLInputElement
    if (e.key === 'Enter') el.blur()
    else if (e.key === 'Escape') {
      this.typed.set(null)
      el.value = String(this.page())
      el.blur()
    }
  }
}
