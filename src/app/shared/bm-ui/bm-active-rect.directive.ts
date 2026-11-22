import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input, signal } from '@angular/core'

export interface BmRect {
  x: number
  y: number
  w: number
  h: number
}

/** Ultima posizione del fondo di ogni gruppo: se il gruppo si ricostruisce il fondo parte da dov'era (non da zero) */
const lastRects = new Map<string, BmRect>()

/**
 * Misura la voce attiva di un contenitore (come `useActiveRect` di onSales): `rect` è la posizione dell'elemento marcato `data-active="true"` dentro
 * l'host (relativa all'host, che deve essere `position: relative`), aggiornata quando cambia la scelta o le misure (caratteri caricati, numeri nei
 * contatori, larghezza della pagina). `ready` diventa vero dopo il primo disegno: da lì il fondo si anima, alla prima comparsa no. Con la chiave
 * (`bmActiveRect="nome"`) la posizione si ricorda tra un ricostruzione e l'altra, così il fondo scivola dalla posizione di prima.
 * Voce nascosta (dentro un gruppo chiuso) o non ancora disegnata: nessun fondo.
 */
@Directive({ selector: '[bmActiveRect]', exportAs: 'bmActiveRect' })
export class BmActiveRect {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  /** chiave con cui si ricorda la posizione */
  readonly key = input('', { alias: 'bmActiveRect' })
  /** come si riconosce la voce attiva dentro l'host */
  readonly activeSelector = input('[data-active="true"]')
  readonly rect = signal<BmRect | null>(null)
  readonly ready = signal(false)

  constructor() {
    const destroy = inject(DestroyRef)
    afterNextRender(() => {
      const el = this.host.nativeElement
      let first = true
      const measure = () => {
        const active = el.querySelector<HTMLElement>(this.activeSelector())
        if (!active || active.offsetHeight === 0) return this.rect.set(null)
        const next: BmRect = { x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight }
        const k = this.key()
        const prev = k ? lastRects.get(k) : undefined
        if (k) lastRects.set(k, next)
        const apply = () => this.rect.update((cur) => (cur && cur.x === next.x && cur.y === next.y && cur.w === next.w && cur.h === next.h ? cur : next))
        if (first && prev && (prev.x !== next.x || prev.y !== next.y || prev.w !== next.w || prev.h !== next.h)) {
          // si riparte dalla posizione ricordata e, dopo il primo disegno, il fondo scivola verso quella nuova
          this.rect.set(prev)
          this.ready.set(true)
          setTimeout(apply, 30)
        } else apply()
        first = false
      }
      measure()
      setTimeout(() => this.ready.set(true), 50)
      const mutation = new MutationObserver(measure)
      mutation.observe(el, { attributes: true, attributeFilter: ['data-active'], subtree: true, childList: true })
      const resize = new ResizeObserver(measure)
      resize.observe(el)
      destroy.onDestroy(() => {
        mutation.disconnect()
        resize.disconnect()
      })
    })
  }
}
