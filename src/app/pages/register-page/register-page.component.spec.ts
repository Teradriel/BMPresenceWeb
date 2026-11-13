import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RegisterPageComponent } from './register-page.component';
import { AuthService } from '../../services/auth.service';
import { clearSession, testProviders } from '../../testing';

describe('RegisterPageComponent', () => {
  let fixture: ComponentFixture<RegisterPageComponent>;
  let component: RegisterPageComponent;
  let auth: AuthService;
  let router: Router;

  beforeEach(async () => {
    clearSession();
    await TestBed.configureTestingModule({ imports: [RegisterPageComponent], providers: testProviders }).compileComponents();
    fixture = TestBed.createComponent(RegisterPageComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  const fill = (over: Partial<RegisterPageComponent> = {}) =>
    Object.assign(component, { name: 'Giulia', lastName: 'Zanatta', username: 'giulia.zanatta', email: '', password: 'segreta', confirmPassword: 'segreta' }, over);

  it('pretende tutti i campi, 6 caratteri e due password uguali', async () => {
    spyOn(auth, 'register');
    fill({ name: '' });
    await component.onRegister();
    expect(component.errorMessage).toBe('Tutti i campi sono obbligatori');
    fill({ name: 'Giulia', password: 'corta', confirmPassword: 'corta' });
    await component.onRegister();
    expect(component.errorMessage).toContain('almeno 6');
    fill({ password: 'segreta', confirmPassword: 'diversa' });
    await component.onRegister();
    expect(component.errorMessage).toBe('Le password non corrispondono');
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('senza email la ricava da nome e cognome', async () => {
    const spy = spyOn(auth, 'register').and.resolveTo();
    fill();
    await component.onRegister();
    expect(spy.calls.mostRecent().args[0].email).toBe('giulia.zanatta@bluemobility.it');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('con l’email scritta usa quella', async () => {
    const spy = spyOn(auth, 'register').and.resolveTo();
    fill({ email: 'g.zanatta@bluemobility.it' });
    await component.onRegister();
    expect(spy.calls.mostRecent().args[0].email).toBe('g.zanatta@bluemobility.it');
  });
});
