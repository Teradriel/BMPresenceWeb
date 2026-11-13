import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../../services/auth.service';
import { clearSession, testProviders } from '../../testing';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let component: LoginPageComponent;
  let auth: AuthService;
  let router: Router;

  const create = async (queryParams: Record<string, string> = {}) => {
    clearSession();
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [...testProviders, { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } }],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  };

  afterEach(() => clearSession());

  it('senza dati mostra l’errore e non chiama il server', async () => {
    await create();
    spyOn(auth, 'login');
    await component.onLogin();
    expect(component.errorMessage).toBe('Inserisci nome utente e password');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('login riuscito: va alla pagina richiesta', async () => {
    await create({ returnUrl: '/user' });
    spyOn(auth, 'login').and.resolveTo();
    component.username = 'luca';
    component.password = 'segreta';
    await component.onLogin();
    expect(router.navigate).toHaveBeenCalledWith(['/user']);
  });

  it('password da cambiare: va al cambio password', async () => {
    await create();
    spyOn(auth, 'login').and.resolveTo();
    spyOn(auth, 'mustChangePassword').and.returnValue(true);
    component.username = 'luca';
    component.password = 'temp';
    await component.onLogin();
    expect(router.navigate).toHaveBeenCalledWith(['/change-password'], { queryParams: { forced: 'true' } });
  });

  it('credenziali errate: mostra il messaggio del server', async () => {
    await create();
    spyOn(auth, 'login').and.rejectWith(new Error('Nome utente o password non corretti'));
    component.username = 'luca';
    component.password = 'x';
    await component.onLogin();
    expect(component.errorMessage).toBe('Nome utente o password non corretti');
    expect(component.isBusy).toBeFalse();
  });

  it('dopo una sessione scaduta avvisa di accedere di nuovo', async () => {
    await create({ expired: '1' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sessione scaduta');
  });
});
