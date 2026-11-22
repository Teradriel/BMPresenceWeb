import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { HttpClient, HttpContext } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { SKIP_AUTH_INTERCEPTOR } from '../interceptors/auth.interceptor';

export interface User {
  id: string;
  username: string;
  email?: string;
  name?: string;
  lastName?: string;
  isAdmin?: boolean;
  active?: boolean;
  createdAt?: Date;
  lastActiveAt?: Date | null;
  forceChangePassword?: boolean;
  mustChangePassword?: boolean;
}

export interface RegisterData {
  name: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  isAdmin?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private readonly TOKEN_KEY = 'bmpresence_token';
  private readonly USER_KEY = 'bmpresence_user';
  private readonly FORCE_CHANGE_PASSWORD_KEY = 'bmpresence_force_change_password';
  private readonly apiUrl = environment.apiUrl;
  
  // **ANTI-LOOP PROTECTION**: Flags to prevent concurrent calls
  private isRestoringSession = false;
  private isRenewingToken = false;
  private isLoggingIn = false;

  private http = inject(HttpClient);
  private router = inject(Router);
  private renewPromise: Promise<boolean> | null = null;

  /** true finché si controlla il token salvato (avvio): la UI mostra l'attesa e le guardie aspettano. */
  readonly checking = signal(false);
  /** Si risolve quando il controllo all'avvio è finito (con o senza sessione valida). */
  readonly ready: Promise<void>;

  constructor() {
    const storedUser = this.getStoredUser();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Sessione già aperta: si riusa (rinnovo se serve, poi ripristino), senza chiedere il login
    this.ready = this.startup();

    // Al ritorno nella scheda si controlla la scadenza del token
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.ensureFreshToken();
    });
  }

  private async startup(): Promise<void> {
    if (!this.getToken()) return;
    this.checking.set(true);
    try {
      if (!(await this.ensureFreshToken())) return;
      await this.restoreSession();
    } finally {
      this.checking.set(false);
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    const token = this.getToken();
    const exp = token ? AuthService.tokenExpiry(token) : null;
    // scaduto da oltre 7 giorni (come il server): serve il login
    return !!this.currentUserSubject.value && !!token && (exp === null || Date.now() < exp + AuthService.RENEW_GRACE_MS);
  }

  /** Giorni di tolleranza dopo la scadenza in cui il server rinnova ancora il token (jwt.renew-grace-days). */
  private static readonly RENEW_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
  /** Il server rinnova solo nelle ultime 24 ore di vita del token. */
  private static readonly RENEW_WINDOW_MS = 24 * 60 * 60 * 1000;

  /** Scadenza (ms) letta dal claim `exp` del JWT, mai calcolata sul dispositivo. */
  static tokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  /**
   * Se il token scade entro 24 ore (o è scaduto da meno di 7 giorni) lo rinnova.
   * Ritorna false se non c'è più una sessione valida (login necessario).
   */
  public async ensureFreshToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;
    const exp = AuthService.tokenExpiry(token);
    if (exp === null || exp - Date.now() > AuthService.RENEW_WINDOW_MS) return true;
    if (Date.now() > exp + AuthService.RENEW_GRACE_MS) {
      this.clearSession();
      return false;
    }
    return this.renewToken();
  }

  async login(username: string, password: string): Promise<void> {
    // **ANTI-LOOP PROTECTION**: Prevent multiple simultaneous calls
    if (this.isLoggingIn) {
      console.warn('Login already in progress, skipping duplicate call');
      return;
    }

    this.isLoggingIn = true;

    try {
      // Authentication requests DO NOT go through the interceptor (see auth.interceptor.ts)
      const data = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/login`, 
          { username, password },
          {
            // Context to ensure this request doesn't go through the interceptor
            context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true)
          }
        )
      );
      
      if (!data.success) {
        throw new Error(data.message || 'Nome utente o password non corretti');
      }

      // Save token and user
      this.setToken(data.token);
      this.setUser(data.user);
      
      // Check if user must change password on next login
      console.log('🔍 Login response data:', data);
      console.log('🔍 user.mustChangePassword value:', data.user?.mustChangePassword);
      
      // Backend can return the flag in data.forceChangeOnNextLogin OR in data.user.mustChangePassword
      const mustChange = data.forceChangeOnNextLogin === true || data.user?.mustChangePassword === true;
      
      if (mustChange) {
        console.log('✅ Setting force change password flag');
        this.setForceChangePassword(true);
      } else {
        console.log('❌ Clearing force change password flag');
        this.clearForceChangePassword();
      }
      
      // Update observable
      this.currentUserSubject.next(data.user);

    } catch (error: any) {
      if (error?.error?.message) {
        throw new Error(error.error.message);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Errore durante il tentativo di accesso. Verifica la connessione e che il server sia disponibile.');
    } finally {
      this.isLoggingIn = false;
    }
  }

  logout(): void {

    // Call logout endpoint (this request does NOT go through the interceptor)
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      error: (err) => console.error('Error in logout:', err)
    });

    // Clear storage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    // Update observable
    this.currentUserSubject.next(null);
    
    // Redirect to login
    this.router.navigate(['/login']);
  }

  async register(data: RegisterData): Promise<void> {
    try {
      // Authentication requests DO NOT go through the interceptor
      const result = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/register`, {
          name: data.name,
          lastName: data.lastName,
          email: data.email,
          username: data.username,
          password: data.password,
          isAdmin: data.isAdmin || false
        }, {
          context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true)
        })
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Errore durante la registrazione');
      }
    } catch (error: any) {
      if (error?.error?.message) {
        throw new Error(error.error.message);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Errore durante la registrazione. Nome utente già esistente.');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/change-password`, 
          { currentPassword, newPassword }
        )
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Password attuale non corretta');
      }
    } catch (error: any) {
      if (error?.error?.message) {
        throw new Error(error.error.message);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Password attuale non corretta');
    }
  }

  async restoreSession(): Promise<void> {
    const token = this.getToken();
    
    // **ANTI-LOOP PROTECTION**: Avoid multiple simultaneous calls
    if (!token || this.isRestoringSession) {
      return;
    }

    this.isRestoringSession = true;

    try {
      // This request does NOT go through the interceptor to avoid infinite loops
      const data = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/restore-session`, 
          { token },
          {
            context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true)
          }
        )
      );
      
      if (data.success && data.user) {
        // Update user without changing token
        this.setUser(data.user);
        this.currentUserSubject.next(data.user);
        
        // Automatic renewal DISABLED
        // this.startTokenRenewal();
      } else {
        this.clearSession();
      }
    } catch (error: any) {
      console.error('Error restoring session:', error);
      // sessione rifiutata dal server (401/400): finita. Server non raggiungibile: il token resta e si riprova.
      if (error?.status === 401 || error?.status === 400) {
        this.clearSession();
      }
    } finally {
      this.isRestoringSession = false;
    }
  }

  /**
   * Rinnova il token (una sola chiamata alla volta). Ritorna true se c'è un token valido.
   * Se il server risponde 401/400 la sessione è finita: si azzera; se non risponde si tiene il token e si riprova dopo.
   */
  public renewToken(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return Promise.resolve(false);
    if (this.renewPromise) return this.renewPromise;

    this.renewPromise = (async () => {
      try {
        // Questa richiesta NON passa dall'interceptor (evita i giri infiniti)
        const data = await firstValueFrom(
          this.http.post<any>(`${this.apiUrl}/auth/renew-token`, { token }, { context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true) })
        );
        if (data.success && data.token) {
          this.setToken(data.token);
          return true;
        }
        this.clearSession();
        return false;
      } catch (error: any) {
        if (error?.status === 401 || error?.status === 400) {
          this.clearSession();
          return false;
        }
        console.error('Error renewing token:', error);
        return true; // server non raggiungibile: il token resta e si riprova al prossimo controllo
      } finally {
        this.renewPromise = null;
      }
    })();
    return this.renewPromise;
  }

  public getAuthToken(): string | null {
    return this.getToken();
  }

  private getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        // Convert date strings to Date objects
        if (user.createdAt) {
          user.createdAt = new Date(user.createdAt);
        }
        if (user.lastActiveAt) {
          user.lastActiveAt = new Date(user.lastActiveAt);
        }
        return user;
      } catch {
        return null;
      }
    }
    return null;
  }

  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  public clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.FORCE_CHANGE_PASSWORD_KEY);
    this.currentUserSubject.next(null);
  }

  /**
   * Verifica si el usuario debe cambiar su password
   */
  public mustChangePassword(): boolean {
    const flag = localStorage.getItem(this.FORCE_CHANGE_PASSWORD_KEY);
    console.log('🔍 Checking force change password flag:', flag);
    return flag === 'true';
  }

  /**
   * Establece el flag de cambio forzado de password
   */
  private setForceChangePassword(value: boolean): void {
    localStorage.setItem(this.FORCE_CHANGE_PASSWORD_KEY, value.toString());
  }

  /**
   * Limpia el flag de cambio forzado de password
   */
  public clearForceChangePassword(): void {
    localStorage.removeItem(this.FORCE_CHANGE_PASSWORD_KEY);
  }

  /**
   * Updates the current user information in state and storage
   */
  public updateCurrentUser(user: User): void {
    this.setUser(user);
    this.currentUserSubject.next(user);
  }
}
