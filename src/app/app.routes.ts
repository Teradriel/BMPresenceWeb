import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { ChangePasswordPageComponent } from './pages/change-password-page/change-password-page.component';
import { MainPageComponent } from './pages/main-page/main-page.component';
import { AboutPageComponent } from './pages/about-page/about-page.component';
import { UserPageComponent } from './pages/user-page/user-page.component';
import { EditUserPageComponent } from './pages/edit-user-page/edit-user-page.component';
import { UsersListPageComponent } from './pages/users-list-page/users-list-page.component';
import { PrivacyPolicyPageComponent } from './pages/privacy-policy-page/privacy-policy-page.component';
import { TermsOfServicePageComponent } from './pages/terms-of-service-page/terms-of-service-page.component';
import { authGuard, loginGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent, canActivate: [loginGuard] },
  { path: 'register', component: RegisterPageComponent, canActivate: [loginGuard] },
  { path: 'change-password', component: ChangePasswordPageComponent, canActivate: [authGuard] },
  { path: 'main', component: MainPageComponent, canActivate: [authGuard] },
  { path: 'user', component: UserPageComponent, canActivate: [authGuard] },
  { path: 'edit-user', component: EditUserPageComponent, canActivate: [authGuard] },
  { path: 'users-list', component: UsersListPageComponent, canActivate: [adminGuard] },
  { path: 'about', component: AboutPageComponent, canActivate: [authGuard] },
  { path: 'privacy-policy', component: PrivacyPolicyPageComponent, canActivate: [authGuard] },
  { path: 'terms-of-service', component: TermsOfServicePageComponent, canActivate: [authGuard] }
];
