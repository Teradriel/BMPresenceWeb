import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

/** Classi dei pulsanti e dei campi: le stesse di `ui.tsx` di onSales (Tailwind, token di `theme.css`). */
export const buttonClass = {
  primary:
    'inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-accent px-4 text-sm font-medium text-white shadow-sm hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60',
  secondary:
    'inline-flex h-10 items-center justify-center gap-2 rounded-[9px] border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60',
  ghost:
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-ink-2 hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60',
  danger:
    'inline-flex h-10 items-center justify-center gap-2 rounded-[9px] bg-err px-4 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60',
} as const

export const inputClass =
  'h-10 w-full rounded-[9px] border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-placeholder disabled:bg-sunken aria-[invalid=true]:border-err'

export type BmTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'err' | 'orange'

export const tones: Record<BmTone, string> = {
  neutral: 'bg-sunken text-ink-2',
  accent: 'bg-accent-soft text-accent-ink',
  ok: 'bg-ok-soft text-ok-ink',
  warn: 'bg-warn-soft text-warn-ink',
  err: 'bg-err-soft text-err-ink',
  orange: 'bg-orange-soft text-orange-ink',
}

/** Pillola di stato: sfondo morbido + testo scuro del tono (mai il colore pieno come sfondo di testo). */
@Component({
  selector: 'bm-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="classes()"><ng-content /></span>`,
})
export class BmBadge {
  readonly tone = input<BmTone>('neutral')
  protected readonly classes = computed(
    () => `inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium transition-colors duration-300 ${tones[this.tone()]}`,
  )
}

/** Campo con etichetta sopra e, sotto, UNA sola riga: l'errore oppure il suggerimento. Il campo è il contenuto proiettato. */
@Component({
  selector: 'bm-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2">
      <label [attr.for]="htmlFor() || null" class="text-[13px] font-medium text-ink-2">{{ label() }}</label>
      <ng-content />
      @if (error()) {
        <span class="text-xs font-medium text-err-ink">{{ error() }}</span>
      } @else if (hint()) {
        <span class="text-xs leading-relaxed text-muted">{{ hint() }}</span>
      }
    </div>
  `,
})
export class BmField {
  readonly label = input.required<string>()
  readonly htmlFor = input('')
  readonly hint = input('')
  readonly error = input('')
}
