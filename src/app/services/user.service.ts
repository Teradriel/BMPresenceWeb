import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserDTO {
  id: string;
  username: string;
  email?: string;
  name?: string;
  lastName?: string;
  isAdmin?: boolean;
  active?: boolean;
  createdAt?: string;
  lastActiveAt?: string;
  mustChangePassword?: boolean;
}

export interface UserDisplay {
  id: string;
  username: string;
  name?: string;
  lastName?: string;
  fullName: string;
}

export interface UserListItem {
  id: string;
  username: string;
  name: string;
  lastName: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  isAdmin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Gets the list of active users
   */
  getUsers(): Observable<UserDisplay[]> {
    return this.http.get<UserDTO[]>(`${this.apiUrl}/users/active`).pipe(
      map((users: UserDTO[]) => users
        .filter((u: UserDTO) => u.active)
        .map((u: UserDTO) => this.mapUserToDisplay(u))
      )
    );
  }

  /**
   * Gets all users with detailed information for admin list
   */
  getAllUsersDetailed(): Observable<UserListItem[]> {
    return this.http.get<UserDTO[]>(`${this.apiUrl}/users`).pipe(
      map((users: UserDTO[]) => users
        .filter((u: UserDTO) => u.active)
        .map((u: UserDTO) => this.mapUserToListItem(u))
      )
    );
  }

  /**
   * Deletes a user by ID
   */
  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }

  /**
   * Admin resets a user's password
   */
  adminResetPassword(userId: string, newPassword: string, forceChangeOnNextLogin: boolean = true): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/admin-reset-password`, {
      userId,
      newPassword,
      forceChangeOnNextLogin
    });
  }

  /** Tutti gli utenti, anche i disattivi (solo amministratori). */
  listAll(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(`${this.apiUrl}/users`);
  }

  /** Elimina definitivamente un utente (hard delete). */
  hardDelete(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/hard`);
  }

  /** Crea un utente (solo amministratori): attivo subito, con password temporanea da cambiare al primo accesso. */
  adminCreate(data: { name: string; lastName: string; email: string; username: string; password: string; isAdmin: boolean; active: boolean }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/auth/admin-create-user`, data);
  }

  /**
   * Updates user information
   */
  updateUser(userId: string, data: Partial<UserDTO>): Observable<UserDTO> {
    return this.http.put<UserDTO>(`${this.apiUrl}/users/${userId}`, data);
  }

  /**
   * Maps a user to display format
   */
  private mapUserToDisplay(user: UserDTO): UserDisplay {
    const fullName = user.name && user.lastName 
      ? `${user.name} ${user.lastName}`
      : user.username;
    
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      lastName: user.lastName,
      fullName
    };
  }

  /**
   * Maps a user to list item format with full details
   */
  private mapUserToListItem(user: UserDTO): UserListItem {
    return {
      id: user.id,
      username: user.username,
      name: user.name || '',
      lastName: user.lastName || '',
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt) : null,
      isAdmin: user.isAdmin || false
    };
  }
}
