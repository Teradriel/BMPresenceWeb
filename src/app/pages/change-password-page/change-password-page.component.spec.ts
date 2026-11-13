import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ChangePasswordPageComponent } from './change-password-page.component';
import { AuthService } from '../../services/auth.service';
import { clearSession, testProviders } from '../../testing';

describe('ChangePasswordPageComponent', () => {
  afterEach(() => clearSession());

  const create = async (forced: boolean) => {
    clearSession();
    await TestBed.configureTestingModule({
      imports: [ChangePasswordPageComponent],
      providers: [...testProviders, { provide: ActivatedRoute, useValue: { queryParams: of(forced ? { forced: 'true' } : {}) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ChangePasswordPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, auth: TestBed.inject(AuthService), router: TestBed.inject(Router) };
  };

  it('cambio forzato: mostra l’avviso e "Esci" invece di "Annulla"', async () => {
    const { fixture } = await create(true);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Devi cambiare la tua password');
    expect(text).toContain('Esci');
  });

  it('annullare un cambio forzato fa uscire', async () => {
    const { component, auth } = await create(true);
    spyOn(auth, 'logout');
    component.onCancel();
    expect(auth.logout).toHaveBeenCalled();
  });

  it('annullare un cambio volontario torna al profilo', async () => {
    const { component, router } = await create(false);
    spyOn(router, 'navigate');
    component.onCancel();
    expect(router.navigate).toHaveBeenCalledWith(['/user']);
  });

  it('con i campi vuoti non chiama il server', async () => {
    const { component, auth } = await create(false);
    spyOn(auth, 'changePassword');
    await component.onChangePassword();
    expect(component.errorMessage).not.toBe('');
    expect(auth.changePassword).not.toHaveBeenCalled();
  });
});
