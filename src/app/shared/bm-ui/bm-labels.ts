import { InjectionToken } from '@angular/core'

/**
 * Testi dei componenti bm-*. I componenti non scrivono mai un testo a mano: lo leggono da qui. Il default è l'italiano; un progetto con
 * ngx-translate o transloco fornisce i propri (nelle lingue che supporta) con `{ provide: BM_LABELS, useFactory: … }`.
 */
export interface BmLabels {
  first: string
  previous: string
  next: string
  last: string
  page: string
  ofPages: (pages: string) => string
  goToPage: string
  search: string
  clearSearch: string
  noResults: string
  close: string
  cancel: string
  save: string
  confirmTitle: string
  confirm: string
  discardTitle: string
  discardMessage: string
  discard: string
  filters: string
  filtersActive: string
  filtersNone: string
  filtersRemove: string
  clear: string
  show: string
  results: (n: string) => string
  total: (shown: string, total: string) => string
  range: (from: string, to: string, total: string) => string
  expand: string
  collapse: string
  rowActions: string
  all: string
  noMatch: string
  closeMessage: string
  columnFilter: string
  contains: string
  min: string
  max: string
  from: string
  to: string
  yes: string
  no: string
  remove: string
  apply: string
  viewTitle: string
  viewColumns: string
  viewCount: (shown: string, total: string) => string
  viewReset: string
  moveUp: string
  moveDown: string
  menuMain: string
  menuCollapse: string
  menuExpand: string
  soon: string
}

export const BM_LABELS_IT: BmLabels = {
  first: 'Prima pagina',
  previous: 'Pagina precedente',
  next: 'Pagina successiva',
  last: 'Ultima pagina',
  page: 'Pagina',
  ofPages: (pages) => `di ${pages}`,
  goToPage: 'Vai alla pagina',
  search: 'Cerca…',
  clearSearch: 'Cancella la ricerca',
  noResults: 'Nessun risultato',
  close: 'Chiudi',
  cancel: 'Annulla',
  save: 'Salva',
  confirmTitle: 'Conferma l’operazione',
  confirm: 'Conferma',
  discardTitle: 'Scartare le modifiche?',
  discardMessage: 'Le modifiche non salvate andranno perse.',
  discard: 'Scarta',
  filters: 'Filtri',
  filtersActive: 'Criteri attivi',
  filtersNone: 'Nessun filtro attivo.',
  filtersRemove: 'Togli',
  clear: 'Azzera',
  show: 'Mostra',
  results: (n) => `${n} risultati`,
  total: (shown, total) => `${shown} di ${total}`,
  range: (from, to, total) => `${from}–${to} di ${total}`,
  expand: 'Espandi',
  collapse: 'Comprimi',
  rowActions: 'Azioni',
  all: 'Tutti',
  noMatch: 'Nessun risultato per i filtri scelti.',
  closeMessage: 'Chiudi il messaggio',
  columnFilter: 'Filtra la colonna',
  contains: 'Contiene…',
  min: 'Minimo',
  max: 'Massimo',
  from: 'Dal',
  to: 'Al',
  yes: 'Sì',
  no: 'No',
  remove: 'Rimuovi',
  apply: 'Applica',
  viewTitle: 'Impostazioni della tabella',
  viewColumns: 'Colonne',
  viewCount: (shown, total) => `${shown} di ${total}`,
  viewReset: 'Ripristina vista',
  moveUp: 'Sposta su',
  moveDown: 'Sposta giù',
  menuMain: 'Menu principale',
  menuCollapse: 'Comprimi il menu',
  menuExpand: 'Apri il menu',
  soon: 'Presto',
}

export const BM_LABELS = new InjectionToken<BmLabels>('BM_LABELS', { providedIn: 'root', factory: () => BM_LABELS_IT })
