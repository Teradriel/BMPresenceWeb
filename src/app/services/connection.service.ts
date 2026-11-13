import { Injectable, signal } from '@angular/core';

/** Stato della connessione al server, mostrato nella barra in alto. Lo aggiorna chi carica i dati. */
@Injectable({ providedIn: 'root' })
export class ConnectionService {
  readonly online = signal(true);
}
