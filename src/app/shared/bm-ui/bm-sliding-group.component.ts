import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'
import { BmActiveRect } from './bm-active-rect.directive'

/**
 * Contenitore di schede o pulsanti a scelta singola (come `SlidingGroup` di onSales: le «Tutti / Attivi / Bloccati» di un elenco, i selettori a segmenti):
 * il fondo bianco con la linea verde **scivola** dalla scheda precedente a quella scelta (200ms) invece di comparire di colpo. La voce scelta si segna con
 * `data-active="true"`; i pulsanti non hanno fondo proprio (lo disegna questo contenitore) e stanno sopra (`relative z-[1]`), con `text-ink` se scelti e
 * `text-ink-2` altrimenti. Senza animazione per chi la disattiva nel sistema.
 */
@Component({
  selector: 'bm-sliding-group',
  imports: [BmActiveRect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [bmActiveRect]="key() || label()" #ar="bmActiveRect" [attr.role]="role()" [attr.aria-label]="label()" [class]="boxClasses()">
      @if (ar.rect(); as r) {
        <span
          aria-hidden="true"
          [class]="ar.ready() ? pill + ' transition-[transform,width,height] duration-200 ease-out motion-reduce:transition-none' : pill"
          [style.transform]="'translate(' + r.x + 'px, ' + r.y + 'px)'"
          [style.width.px]="r.w"
          [style.height.px]="r.h"
        ></span>
      }
      <ng-content />
    </div>
  `,
})
export class BmSlidingGroup {
  readonly label = input.required<string>()
  readonly role = input<'group' | 'radiogroup'>('group')
  /** colore del fondo del gruppo (la scheda scelta resta bianca) */
  readonly tone = input<'sunken' | 'segment'>('segment')
  /** classi in più sul contenitore (es. `max-w-full overflow-x-auto [scrollbar-width:none]`) */
  readonly boxClass = input('')
  /** chiave con cui si ricorda la posizione del fondo (di base l'etichetta) */
  readonly key = input('')

  protected readonly pill =
    'pointer-events-none absolute top-0 left-0 rounded-lg bg-surface shadow-[0_1px_2px_rgba(21,23,28,.08),0_0_0_1px_var(--color-line)] after:absolute after:inset-x-3 after:bottom-0.5 after:h-[2px] after:rounded-full after:bg-lime'
  protected readonly boxClasses = computed(() => `relative inline-flex gap-0.5 rounded-[10px] p-[3px] ${this.tone() === 'segment' ? 'bg-segment' : 'bg-sunken'} ${this.boxClass()}`)
}
