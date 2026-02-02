import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { firstValueFrom } from 'rxjs';

interface UpdateUserData {
  name: string;
  lastName: string;
  username: string;
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
    // Obtener el usuario actual
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.initializeForm(user);
      }
    });
  }

  /**
   * Inicializa el formulario con los datos del usuario actual
   */
  private initializeForm(user: User): void {
    this.editForm = this.fb.group({
      name: [user.name || '', [Validators.required, Validators.minLength(2)]],
      lastName: [user.lastName || '', [Validators.required, Validators.minLength(2)]],
      username: [user.username, [Validators.required, Validators.minLength(3)]]
    });
  }

  /**
   * Guarda los cambios del perfil del usuario
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
      
      // Llamada al servicio de usuario
      const updatedUser = await firstValueFrom(
        this.userService.updateUser(this.currentUser.id, updateData)
      );

      // Actualizar el usuario en el servicio de autenticación
      this.authService.updateCurrentUser(updatedUser);

      // Navegar de vuelta a la página de perfil
      await this.router.navigate(['/user']);
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Error al actualizar el perfil';
      console.error('Error updating user:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Cancela la edición y vuelve a la página anterior
   */
  cancel(): void {
    this.router.navigate(['/user']);
  }

  /**
   * Marca todos los campos del formulario como tocados para mostrar errores
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Verifica si un campo tiene errores y ha sido tocado
   */
  hasError(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Obtiene el mensaje de error para un campo específico
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
