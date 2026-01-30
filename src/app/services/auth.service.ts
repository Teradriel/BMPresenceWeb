import { Injectable, inject } from '@angular/core';
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
}

export interface RegisterData {
  name: string;
  lastName: string;
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
  private readonly apiUrl = environment.apiUrl;
  
  // **PROTECCIÓN ANTI-LOOP**: Flags para prevenir llamadas concurrentes
  private isRestoringSession = false;
  private isRenewingToken = false;
  private isLoggingIn = false;

  private http = inject(HttpClient);
  private tokenRenewalService?: any; // Lazy injection

  constructor(private router: Router) {
    const storedUser = this.getStoredUser();
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Try to restore session on initialization
    this.restoreSession();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.currentUserSubject.value && !!this.getToken();
  }

  async login(username: string, password: string): Promise<void> {
    // **PROTECCIÓN ANTI-LOOP**: Prevenir múltiples llamadas simultáneas
    if (this.isLoggingIn) {
      console.warn('Login already in progress, skipping duplicate call');
      return;
    }

    this.isLoggingIn = true;

    try {
      // Las peticiones de autenticación NO pasan por el interceptor (ver auth.interceptor.ts)
      const data = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/login`, 
          { username, password },
          {
            // Context para asegurar que esta petición no pase por el interceptor
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
      
      // Update observable
      this.currentUserSubject.next(data.user);

      // Renovación automática DESACTIVADA
      // this.startTokenRenewal();
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
    // Detener renovación automática
    this.stopTokenRenewal();

    // Call logout endpoint (esta petición NO pasa por el interceptor)
    this.http.post(`${this.apiUrl}/auth/logout`, {}, {
      context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true)
    }).subscribe({
      error: (err) => console.error('Error en logout:', err)
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
      // Las peticiones de autenticación NO pasan por el interceptor
      const result = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/register`, {
          name: data.name,
          lastName: data.lastName,
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
      // Esta petición NO pasa por el interceptor para evitar loops
      const result = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/change-password`, 
          { currentPassword, newPassword },
          {
            context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true)
          }
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
    
    // **PROTECCIÓN ANTI-LOOP**: Evitar múltiples llamadas simultáneas
    if (!token || this.isRestoringSession) {
      return;
    }

    this.isRestoringSession = true;

    try {
      // Esta petición NO pasa por el interceptor para evitar loops infinitos
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
        
        // Renovación automática DESACTIVADA
        // this.startTokenRenewal();
      } else {
        this.clearSession();
      }
    } catch (error) {
      console.error('Error restaurando sesión:', error);
      this.clearSession();
    } finally {
      this.isRestoringSession = false;
    }
  }

  public async renewToken(): Promise<void> {
    const token = this.getToken();
    
    // **PROTECCIÓN ANTI-LOOP**: Evitar múltiples llamadas simultáneas
    if (!token || this.isRenewingToken) {
      return;
    }

    this.isRenewingToken = true;

    try {
      // Esta petición NO pasa por el interceptor para evitar loops infinitos
      const data = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/auth/renew-token`, 
          { token },
          {
            context: new HttpContext().set(SKIP_AUTH_INTERCEPTOR, true)
          }
        )
      );
      
      if (data.success && data.token) {
        this.setToken(data.token);
      }
    } catch (error) {
      console.error('Error renovando token:', error);
    } finally {
      this.isRenewingToken = false;
    }
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
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private clearSession(): void {
    this.stopTokenRenewal();
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  /**
   * Inicia el servicio de renovación automática de tokens.
   * Usa lazy loading para evitar dependencia circular.
   */
  private startTokenRenewal(): void {
    if (!this.tokenRenewalService) {
      // Importación dinámica para evitar dependencia circular
      import('./token-renewal.service').then(({ TokenRenewalService }) => {
        // Crear instancia manualmente con las dependencias necesarias
        this.tokenRenewalService = new TokenRenewalService(this);
        this.tokenRenewalService.startTokenRenewal();
      }).catch((err: any) => {
        console.error('Error loading TokenRenewalService:', err);
      });
    } else {
      this.tokenRenewalService.startTokenRenewal();
    }
  }

  /**
   * Detiene el servicio de renovación de tokens.
   */
  private stopTokenRenewal(): void {
    if (this.tokenRenewalService) {
      this.tokenRenewalService.stopTokenRenewal();
    }
  }
}
