import { TestBed } from '@angular/core/testing';
import { EditUserPageComponent } from './edit-user-page.component';
import { ME, clearSession, seedSession, testProviders } from '../../testing';

describe('EditUserPageComponent', () => {
  afterEach(() => clearSession());

  const create = async () => {
    seedSession(null);
    await TestBed.configureTestingModule({ imports: [EditUserPageComponent], providers: testProviders }).compileComponents();
    const fixture = TestBed.createComponent(EditUserPageComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('parte dai dati dell’utente collegato e il form non è modificato', async () => {
    const fixture = await create();
    const form = fixture.componentInstance.editForm;
    expect(form.value).toEqual({ name: ME.name, lastName: ME.lastName, username: ME.username });
    expect(form.pristine).toBeTrue();
  });

  it('Salva è spento finché non c’è una modifica valida', async () => {
    const fixture = await create();
    const save = (fixture.nativeElement as HTMLElement).querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(save.disabled).toBeTrue();
    fixture.componentInstance.editForm.get('name')!.setValue('Luca Maria');
    fixture.componentInstance.editForm.markAsDirty();
    fixture.detectChanges();
    expect(save.disabled).toBeFalse();
    fixture.componentInstance.editForm.get('name')!.setValue('L');
    fixture.detectChanges();
    expect(save.disabled).toBeTrue();
  });
});
