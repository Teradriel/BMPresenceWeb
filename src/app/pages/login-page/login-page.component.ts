import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isBusy: boolean = false;
  returnUrl: string = '/main';

  constructor() {
    // Get return URL if exists
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/main';
  }

  async onLogin() {
    this.errorMessage = '';
    
    if (!this.username || !this.password) {
      this.errorMessage = 'Inserisci nome utente e password';
      return;
    }

    this.isBusy = true;

    try {
      await this.authService.login(this.username, this.password);
      
      // Check if user must change password
      const mustChange = this.authService.mustChangePassword();
      console.log('🔍 Must change password?', mustChange);
      
      if (mustChange) {
        console.log('🚀 Redirecting to change-password');
        // Redirect to forced password change
        this.router.navigate(['/change-password'], { 
          queryParams: { forced: 'true' }
        });
        return;
      }
      
      console.log('🚀 Redirecting to', this.returnUrl);
      // If login successful and no password change required, redirect to return URL or main
      this.router.navigate([this.returnUrl]);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nome utente o password non corretti';
    } finally {
      this.isBusy = false;
    }
  }

  onRegister() {
    this.router.navigate(['/register']);
  }
}
