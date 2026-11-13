import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, signal, untracked } from '@angular/core'

/**
 * Pannello che si apre e si chiude con un'animazione di altezza (come `collapsible.tsx` di onSales: griglia che passa da `0fr` a `1fr` in 250ms) invece di
 * comparire e sparire di colpo. Alla prima comparsa parte chiuso e si apre; chiuso è `inert` (non raggiungibile). Durante il movimento il contenuto è
 * ritagliato; a apertura finita torna libero di uscire dai bordi (menu, ombre e anelli di selezione non vengono tagliati).
 * Per animare anche la chiusura chi lo usa lo tiene nel template un po' più a lungo con `[open]="false"` (vedi `BmDataTable`).
 */
@Component({
  selector: 'bm-collapsible',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="shown() ? gridOpen : gridClosed" [attr.inert]="shown() ? null : ''">
      <div [class]="shown() && settled() ? 'min-h-0 overflow-visible' : 'min-h-0 overflow-hidden'"><ng-content /></div>
    </div>
  `,
})
export class BmCollapsible {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  readonly open = input(true)
  protected readonly gridOpen = 'grid grid-rows-[1fr] transition-[grid-template-rows] duration-[250ms] ease-out motion-reduce:transition-none'
  protected readonly gridClosed = 'grid grid-rows-[0fr] transition-[grid-template-rows] duration-[250ms] ease-out motion-reduce:transition-none'

  private readonly mounted = signal(false)
  protected readonly settled = signal(true)
  /** vero quando è aperto e già disegnato una volta chiuso (così alla comparsa l'apertura si anima) */
  protected readonly shown = computed(() => this.open() && this.mounted())

  constructor() {
    setTimeout(() => {
      // lo stato chiuso viene calcolato prima di passare ad aperto, altrimenti i due stati si fondono e la transizione non parte
      this.host.nativeElement.getBoundingClientRect()
      this.mounted.set(true)
    }, 20)
    effect((onCleanup) => {
      this.shown()
      untracked(() => this.settled.set(false))
      const timer = setTimeout(() => this.settled.set(true), 320)
      onCleanup(() => clearTimeout(timer))
    })
  }
}
