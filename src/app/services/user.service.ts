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
  createdAt?: Date;
  lastActiveAt?: Date | null;
}

export interface UserDisplay {
  id: string;
  username: string;
  name?: string;
  lastName?: string;
  fullName: string;
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
    return this.http.get<UserDTO[]>(`${this.apiUrl}/users`).pipe(
      map(users => users
        .filter(u => u.active)
        .map(u => this.mapUserToDisplay(u))
      )
    );
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
}
