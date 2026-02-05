import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserService, UserDTO } from '../../services/user.service';
import { firstValueFrom } from 'rxjs';

interface UpdateUserData {
  name: string;
  lastName: string;
  username: string;
}

function mapDtoToUser(dto: UserDTO): User {
  return {
    id: dto.id,
    username: dto.username,
    email: dto.email,
    name: dto.name,
    lastName: dto.lastName,
    isAdmin: dto.isAdmin,
    active: dto.active,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : undefined,
    lastActiveAt: dto.lastActiveAt ? new Date(dto.lastActiveAt) : null
  };
}

@Component({
  selector: 'app-edit-user-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-user-page.component.html',
  styleUrls: ['./edit-user-page.component.css']
})
export class EditUserPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);

  editForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  currentUser: User | null = null;

  ngOnInit(): void {
    // Get current user
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.initializeForm(user);
      }
    });
  }

  /**
   * Initializes the form with current user data
   */
  private initializeForm(user: User): void {
    this.editForm = this.fb.group({
      name: [user.name || '', [Validators.required, Validators.minLength(2)]],
      lastName: [user.lastName || '', [Validators.required, Validators.minLength(2)]],
      username: [user.username, [Validators.required, Validators.minLength(3)]]
    });
  }

  /**
   * Saves user profile changes
   */
  async saveChanges(): Promise<void> {
    if (this.editForm.invalid || !this.currentUser) {
      this.markFormGroupTouched(this.editForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const updateData: UpdateUserData = this.editForm.value;
      
      // Call user service
      const updatedUserDto = await firstValueFrom(
        this.userService.updateUser(this.currentUser.id, updateData)
      );

      // Convert DTO to User and update in authentication service
      const updatedUser = mapDtoToUser(updatedUserDto);
      this.authService.updateCurrentUser(updatedUser);

      // Navigate back to profile page
      await this.router.navigate(['/user']);
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Errore durante l’aggiornamento del profilo';
      console.error('Error updating user:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Cancels editing and returns to previous page
   */
  cancel(): void {
    this.router.navigate(['/user']);
  }

  /**
   * Marks all form fields as touched to show errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Checks if a field has errors and has been touched
   */
  hasError(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Gets the error message for a specific field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.editForm.get(fieldName);
    
    if (!field || !field.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return 'Este campo es obligatorio';
    }
    
    if (field.errors['minLength']) {
      const minLength = field.errors['minLength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }

    return '';
  }
}
