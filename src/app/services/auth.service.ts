import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment.local';

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
  email: string;
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
  private isRestoringSession = false;
  private isRenewingToken = false;

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
    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      // Verify response content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Il server non è disponibile o non risponde correttamente. Verifica che il backend sia in esecuzione su ' + this.apiUrl);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Nome utente o password non corretti');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Nome utente o password non corretti');
      }

      // Save token and user
      this.setToken(data.token);
      this.setUser(data.user);
      
      // Update observable
      this.currentUserSubject.next(data.user);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Errore durante il tentativo di accesso. Verifica la connessione e che il server sia disponibile.');
    }
  }

  logout(): void {
    // Call logout endpoint
    fetch(`${this.apiUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    }).catch(err => console.error('Error en logout:', err));

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
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          lastName: data.lastName,
          email: data.email,
          username: data.username,
          password: data.password,
          isAdmin: data.isAdmin || false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore durante la registrazione');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Errore durante la registrazione');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Errore durante la registrazione. Nome utente già esistente.');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password attuale non corretta');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Password attuale non corretta');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Password attuale non corretta');
    }
  }

  async restoreSession(): Promise<void> {
    const token = this.getToken();
    
    if (!token || this.isRestoringSession) {
      return;
    }

    this.isRestoringSession = true;

    try {
      const response = await fetch(`${this.apiUrl}/auth/restore-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        // Invalid or expired token
        this.clearSession();
        return;
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        // Update user without changing token
        this.setUser(data.user);
        this.currentUserSubject.next(data.user);
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

  async renewToken(): Promise<void> {
    const token = this.getToken();
    
    if (!token || this.isRenewingToken) {
      return;
    }

    this.isRenewingToken = true;

    try {
      const response = await fetch(`${this.apiUrl}/auth/renew-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.token) {
          this.setToken(data.token);
        }
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
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }
}
