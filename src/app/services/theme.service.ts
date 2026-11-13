import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'bmp.theme';

/** Tema Sistema / Chiaro / Scuro, ricordato sul dispositivo (come nel mockup e nell'app MAUI). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.read());

  constructor() {
    this.apply();
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      // browser senza storage: la scelta vale per questa pagina
    }
    this.apply();
  }

  private read(): ThemeMode {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
      return 'system';
    }
  }

  private apply(): void {
    const root = document.documentElement;
    if (this.mode() === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', this.mode());
    }
  }
}
