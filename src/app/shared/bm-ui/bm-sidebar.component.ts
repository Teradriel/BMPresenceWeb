import { NgTemplateOutlet } from '@angular/common'
import { type ConnectedPosition, Overlay, type OverlayRef } from '@angular/cdk/overlay'
import { TemplatePortal } from '@angular/cdk/portal'
import { ChangeDetectionStrategy, Component, DestroyRef, TemplateRef, ViewContainerRef, computed, inject, input, output, signal, viewChild } from '@angular/core'
import type { LucideIconData } from 'lucide-angular'
import { BM_LABELS } from './bm-labels'
import { BmActiveRect } from './bm-active-rect.directive'
import { BmIcon } from './bm-icon.component'

/** Una voce del menu. `match` decide quando è la pagina attiva (di base: l'indirizzo comincia con `href`). */
export interface BmNavItem {
  key: string
  label: string
  href: string
  /** icona di `lucide-angular` (`import { Store } from 'lucide-angular'`) */
  icon: LucideIconData
  match?: (url: string) => boolean
  /** voce non ancora pronta: chip «Presto» */
  soon?: boolean
}

/** Un gruppo di voci per argomento: si apre e si chiude; con una sola voce visibile si mostra come voce semplice */
export interface BmNavGroup {
  id: string
  label: string
  icon: LucideIconData
  items: BmNavItem[]
}

export type BmNavEntry = BmNavItem | BmNavGroup

const GROUPS_KEY = 'bm.menu.groups'
const COLLAPSED_KEY = 'bm.menu.collapsed'

const readJson = <T>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}
const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // browser senza storage: la scelta vale per questa pagina
  }
}

/**
 * Menu laterale (come `sidebar.tsx` di onSales): voci raggruppate per argomento in gruppi che si aprono e si chiudono (di base **chiusi**; la scelta si ricorda),
 * 232px aperto e 60px compresso (per scelta, o sotto 1024px). **Compresso**, un gruppo è una sola icona, evidenziata se contiene la pagina attiva; passandoci sopra
 * con il mouse (o col fuoco, o col clic) le sue voci si aprono in un riquadro accanto, sopra la pagina, che resta aperto finché il mouse è sull'icona o sul riquadro
 * e si chiude con Esc o uscendo. **A menu compresso il logo (`[bmLogoMark]`) diventa il pulsante per riaprire**: all'hover o col fuoco compare sopra di lui l'icona «apri». Il menu resta fermo mentre scorre il contenuto (`sticky top-0 h-screen`: l'elemento che lo contiene non deve avere altezza fissa). La voce attiva ha il fondo `accent-soft` e la barra lime a sinistra; al passaggio il filo lime.
 *
 * Contenuto proiettato: `[bmLogo]` (logo e nome, a menu aperto) e `[bmLogoMark]` (solo il marchio, a menu compresso). Il menu non conosce il router: riceve
 * `activeHref` (l'indirizzo attuale) ed emette `selected`; con `interceptClicks` ferma la navigazione del link, e l'app naviga con il suo router.
 */
@Component({
  selector: 'bm-sidebar',
  host: { class: 'block shrink-0' },
  imports: [NgTemplateOutlet, BmActiveRect, BmIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      [attr.data-rail]="rail()"
      [class]="rail() ? 'sticky top-0 flex h-screen w-[60px] shrink-0 flex-col items-center gap-7 overflow-x-hidden border-r border-line bg-sidebar px-2 py-5 transition-[width,padding] duration-200 ease-out motion-reduce:transition-none' : 'sticky top-0 flex h-screen w-[232px] shrink-0 flex-col gap-7 overflow-x-hidden border-r border-line bg-sidebar px-3 py-5 transition-[width,padding] duration-200 ease-out motion-reduce:transition-none'"
    >
      <div [class]="rail() ? 'group/head relative flex shrink-0 items-center justify-center' : 'flex shrink-0 items-center justify-between gap-1'">
        @if (rail()) {
          <ng-content select="[bmLogoMark]" />
          <!-- menu compresso: il logo diventa il pulsante per riaprire (all'hover o col fuoco compare l'icona sopra il logo) -->
          <button type="button" [attr.aria-label]="labels.menuExpand" [title]="labels.menuExpand" (click)="toggleRail()" class="absolute -inset-1 flex items-center justify-center rounded-lg bg-sidebar text-ink opacity-0 transition-opacity hover:bg-sunken hover:opacity-100 focus-visible:opacity-100">
            <bm-icon name="panel-left-open" [size]="20" [stroke]="1.8" />
          </button>
        } @else {
          <ng-content select="[bmLogo]" />
          <button type="button" [attr.aria-label]="labels.menuCollapse" [title]="labels.menuCollapse" (click)="toggleRail()" class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-sunken hover:text-ink">
            <bm-icon name="panel-left-close" [size]="18" [stroke]="1.8" />
          </button>
        }
      </div>

      <nav bmActiveRect="bm-sidebar" #ar="bmActiveRect" [attr.aria-label]="labels.menuMain" [class]="rail() ? 'relative -mx-1 flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-x-hidden overflow-y-auto px-1 [scrollbar-width:none] [&>*]:shrink-0' : 'relative -mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-1 [scrollbar-width:none] [&>*]:shrink-0'">
        <!-- il fondo della voce attiva (e la barra lime) scivola da una voce all'altra (250ms); le voci dentro un gruppo aperto hanno il loro fondo fisso -->
        @if (ar.rect(); as r) {
          <span
            aria-hidden="true"
            [class]="ar.ready() ? pill + ' transition-[transform,width,height] duration-[250ms] ease-out motion-reduce:transition-none' : pill"
            [style.transform]="'translate(' + r.x + 'px, ' + r.y + 'px)'"
            [style.width.px]="r.w"
            [style.height.px]="r.h"
          ></span>
        }
        @for (e of entries(); track entryKey(e)) {
          @if (asGroup(e); as g) {
            @if (g.items.length === 1) {
              <ng-container [ngTemplateOutlet]="itemTpl" [ngTemplateOutletContext]="{ item: g.items[0], nested: false }" />
            } @else if (rail()) {
              <button
                #railBtn
                type="button"
                aria-haspopup="menu"
                [attr.aria-expanded]="flyoutGroup()?.id === g.id"
                [attr.aria-label]="g.label"
                [attr.data-active]="groupHasActive(g) ? 'true' : null"
                [title]="g.label"
                [class]="groupHasActive(g) ? 'relative z-[1] flex size-10 items-center justify-center rounded-lg font-medium text-accent-ink' : 'relative z-[1] flex size-10 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken'"
                (mouseenter)="openFlyout(g, railBtn)"
                (mouseleave)="closeSoon()"
                (focus)="openFlyout(g, railBtn)"
                (click)="openFlyout(g, railBtn)"
              >
                <bm-icon [data]="g.icon" [size]="18" [stroke]="1.8" />
              </button>
            } @else {
              <div class="flex flex-col gap-0.5">
                <button type="button" [attr.aria-expanded]="isOpen(g)" [class]="groupHasActive(g) && !isOpen(g) ? 'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-accent-ink hover:bg-sunken' : 'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-2 hover:bg-sunken'" (click)="toggleGroup(g)">
                  <bm-icon [data]="g.icon" [size]="18" [stroke]="1.8" />
                  <span class="flex-1 text-left whitespace-nowrap">{{ g.label }}</span>
                  <bm-icon name="chevron-down" [size]="16" [class]="isOpen(g) ? 'text-muted transition-transform duration-200' : '-rotate-90 text-muted transition-transform duration-200'" />
                </button>
                @if (isOpen(g)) {
                  <div class="flex flex-col gap-0.5">
                    @for (it of g.items; track it.key) {
                      <ng-container [ngTemplateOutlet]="itemTpl" [ngTemplateOutletContext]="{ item: it, nested: true }" />
                    }
                  </div>
                }
              </div>
            }
          } @else {
            <ng-container [ngTemplateOutlet]="itemTpl" [ngTemplateOutletContext]="{ item: e, nested: false }" />
          }
        }
      </nav>
    </aside>

    <ng-template #itemTpl let-item="item" let-nested="nested">
      <a
        [attr.href]="item.href"
        [attr.aria-current]="isActive(item) ? 'page' : null"
        [attr.data-active]="isActive(item) && !nested ? 'true' : null"
        [attr.aria-label]="item.label"
        [title]="item.label"
        [class]="itemClass(item, nested)"
        (click)="onClick($event, item)"
      >
        <bm-icon [data]="item.icon" [size]="18" [stroke]="1.8" />
        @if (!rail()) {
          <span class="min-w-0 truncate">{{ item.label }}</span>
          @if (item.soon) {
            <span class="ml-auto shrink-0 rounded-full bg-sunken px-1.5 py-0.5 text-[10px] font-medium text-muted">{{ labels.soon }}</span>
          }
        }
      </a>
    </ng-template>

    <!-- il riquadro dei figli a menu compresso -->
    <ng-template #flyout>
      @if (flyoutGroup(); as g) {
        <div role="menu" [attr.aria-label]="g.label" (mouseenter)="holdFlyout()" (mouseleave)="closeSoon()" class="pm-pop-in flex w-60 flex-col gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-[0_8px_24px_rgba(21,23,28,0.14)]">
          <span class="px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">{{ g.label }}</span>
          @for (it of g.items; track it.key) {
            <a role="menuitem" [attr.href]="it.href" [attr.aria-current]="isActive(it) ? 'page' : null" (click)="onClick($event, it); closeFlyout()" [class]="isActive(it) ? 'flex h-9 items-center gap-2.5 rounded-lg bg-accent-wash px-2.5 text-sm font-medium text-accent-ink hover:bg-sunken' : 'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-2 hover:bg-sunken'">
              <bm-icon [data]="it.icon" [size]="18" [stroke]="1.8" />
              <span class="min-w-0 flex-1 truncate">{{ it.label }}</span>
              @if (it.soon) {
                <span class="shrink-0 rounded-full bg-sunken px-1.5 py-0.5 text-[10px] font-medium text-muted">{{ labels.soon }}</span>
              }
            </a>
          }
        </div>
      }
    </ng-template>
  `,
})
export class BmSidebar {
  protected readonly labels = inject(BM_LABELS)
  private readonly overlay = inject(Overlay)
  private readonly vcr = inject(ViewContainerRef)
  private readonly flyoutTpl = viewChild.required<TemplateRef<unknown>>('flyout')
  private flyoutRef?: OverlayRef
  private timer?: ReturnType<typeof setTimeout>

  readonly entries = input.required<BmNavEntry[]>()
  /** l'indirizzo attuale: serve a segnare la voce attiva */
  readonly activeHref = input('')
  /** ferma la navigazione del link (se la fa il router dell'app) */
  readonly interceptClicks = input(false)
  readonly selected = output<BmNavItem>()

  private readonly narrow = signal(false)
  private readonly chosen = signal<boolean | null>(readJson<boolean | null>(COLLAPSED_KEY, null))
  private readonly groups = signal<Record<string, boolean>>(readJson(GROUPS_KEY, {}))
  /** compresso: per scelta dell'utente, oppure (se non ha scelto) sotto 1024px */
  protected readonly rail = computed(() => this.chosen() ?? this.narrow())
  protected readonly flyoutGroup = signal<BmNavGroup | null>(null)
  /** il fondo che scivola: accento morbido con la barra lime a sinistra */
  protected readonly pill = 'pointer-events-none absolute top-0 left-0 rounded-lg bg-accent-soft before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-lime'

  constructor() {
    const mq = matchMedia('(max-width: 1023px)')
    this.narrow.set(mq.matches)
    const onChange = (e: MediaQueryListEvent) => this.narrow.set(e.matches)
    mq.addEventListener('change', onChange)
    inject(DestroyRef).onDestroy(() => {
      mq.removeEventListener('change', onChange)
      this.flyoutRef?.dispose()
    })
  }

  protected entryKey(e: BmNavEntry): string {
    return 'items' in e ? e.id : e.key
  }

  protected asGroup(e: BmNavEntry): BmNavGroup | null {
    return 'items' in e ? e : null
  }

  protected isActive(item: BmNavItem): boolean {
    const url = this.activeHref()
    return item.match ? item.match(url) : !!url && url.startsWith(item.href)
  }

  protected groupHasActive(g: BmNavGroup): boolean {
    return g.items.some((i) => this.isActive(i))
  }

  /** di base i gruppi sono chiusi: si aprono per scelta dell'utente, che si ricorda */
  protected isOpen(g: BmNavGroup): boolean {
    return this.groups()[g.id] ?? false
  }

  protected toggleGroup(g: BmNavGroup): void {
    this.groups.update((cur) => ({ ...cur, [g.id]: !this.isOpen(g) }))
    write(GROUPS_KEY, this.groups())
  }

  protected toggleRail(): void {
    this.chosen.set(!this.rail())
    write(COLLAPSED_KEY, this.chosen())
    this.closeFlyout()
  }

  protected onClick(e: MouseEvent, item: BmNavItem): void {
    if (this.interceptClicks()) e.preventDefault()
    this.selected.emit(item)
  }

  /**
   * Voce di primo livello: `h-9 rounded-lg px-2.5`; attiva = fondo `accent-soft` + barra lime di 3px; al passaggio il filo lime di 2px. Voce dentro un gruppo:
   * la riga è larga come le altre (testo e icona dove sono) e sfondo e barra si disegnano con due pseudo-elementi che partono a 26px, vicino all'icona.
   */
  protected itemClass(item: BmNavItem, nested: boolean): string {
    const active = this.isActive(item)
    const base = 'relative z-[1] flex items-center gap-2.5 rounded-lg text-sm'
    if (this.rail()) {
      return `${base} size-10 justify-center ${active ? 'font-medium text-accent-ink' : 'text-ink-2 hover:bg-sunken hover:before:absolute hover:before:inset-y-2 hover:before:left-0 hover:before:w-[2px] hover:before:rounded-full hover:before:bg-lime'}`
    }
    if (nested) {
      return `${base} h-9 pl-9 pr-2.5 after:absolute after:inset-y-0 after:right-0 after:left-[26px] after:-z-10 after:rounded-lg ${active ? 'font-medium text-accent-ink after:bg-accent-soft before:absolute before:inset-y-1.5 before:left-[26px] before:w-[3px] before:rounded-r-full before:bg-lime' : 'text-ink-2 hover:after:bg-sunken hover:before:absolute hover:before:inset-y-1.5 hover:before:left-[26px] hover:before:w-[3px] hover:before:rounded-r-full hover:before:bg-lime'}`
    }
    return `${base} h-9 px-2.5 ${active ? 'font-medium text-accent-ink' : 'text-ink-2 hover:bg-sunken hover:before:absolute hover:before:inset-y-2 hover:before:left-0 hover:before:w-[2px] hover:before:rounded-full hover:before:bg-lime'}`
  }

  // ---- riquadro dei figli a menu compresso -------------------------------------------------------------------------------
  protected openFlyout(g: BmNavGroup, origin: HTMLElement): void {
    clearTimeout(this.timer)
    if (this.flyoutRef && this.flyoutGroup()?.id === g.id) return
    this.closeFlyout()
    this.flyoutGroup.set(g)
    const positions: ConnectedPosition[] = [
      { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
      { originX: 'end', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: 8 },
    ]
    this.flyoutRef = this.overlay.create({
      positionStrategy: this.overlay.position().flexibleConnectedTo(origin).withPositions(positions).withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    })
    this.flyoutRef.outsidePointerEvents().subscribe((e) => !(e.target as HTMLElement).closest('[aria-haspopup="menu"]') && this.closeFlyout())
    this.flyoutRef.keydownEvents().subscribe((e) => e.key === 'Escape' && this.closeFlyout())
    this.flyoutRef.attach(new TemplatePortal(this.flyoutTpl(), this.vcr))
  }

  protected holdFlyout(): void {
    clearTimeout(this.timer)
  }

  /** una breve pausa nel passaggio tra icona e riquadro (a 8px di distanza) non lo chiude */
  protected closeSoon(): void {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.closeFlyout(), 220)
  }

  protected closeFlyout(): void {
    clearTimeout(this.timer)
    this.flyoutRef?.dispose()
    this.flyoutRef = undefined
    this.flyoutGroup.set(null)
  }
}
