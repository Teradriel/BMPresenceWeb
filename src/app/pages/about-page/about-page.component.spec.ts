import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AboutPageComponent } from './about-page.component';
import { testProviders } from '../../testing';

describe('AboutPageComponent', () => {
  let component: AboutPageComponent;
  let fixture: ComponentFixture<AboutPageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AboutPageComponent], providers: testProviders }).compileComponents();
    fixture = TestBed.createComponent(AboutPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('mostra la versione 2.0.0', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2.0.0');
  });

  it('offre il contatto con il supporto (non lo si preme: aprirebbe il client di posta)', () => {
    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labels.some((l) => l?.startsWith('Contatta il supporto'))).toBeTrue();
    expect(typeof component.onSupportClicked).toBe('function');
  });

  it('naviga a Termini di servizio e Privacy', () => {
    spyOn(router, 'navigate');
    component.onTermsOfServiceTapped();
    expect(router.navigate).toHaveBeenCalledWith(['/terms-of-service']);
    component.onPrivacyPolicyTapped();
    expect(router.navigate).toHaveBeenCalledWith(['/privacy-policy']);
  });

  it('il link GitHub apre le issue del repo', () => {
    const a = (fixture.nativeElement as HTMLElement).querySelector('a[href*="github.com"]') as HTMLAnchorElement;
    expect(a.href).toContain('Teradriel/BMPresence/issues');
    expect(a.rel).toContain('noopener');
  });
});
