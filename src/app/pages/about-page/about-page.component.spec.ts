import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AboutPageComponent } from './about-page.component';

describe('AboutPageComponent', () => {
  let component: AboutPageComponent;
  let fixture: ComponentFixture<AboutPageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have isBusy property initialized to false', () => {
    expect(component.isBusy).toBe(false);
  });

  it('should open email client when onSupportClicked is called', () => {
    delete (window as any).location;
    (window as any).location = { href: '' };
    component.onSupportClicked();
    expect(window.location.href).toBe(
      'mailto:support@bmpresence.com?subject=Richiesta Supporto BMPresence'
    );
  });

  it('should show alert when onCheckUpdatesClicked is called', () => {
    spyOn(window, 'alert');
    component.onCheckUpdatesClicked();
    expect(window.alert).toHaveBeenCalledWith(
      'Stai utilizzando l\'ultima versione disponibile!'
    );
  });

  it('should navigate to terms of service', () => {
    spyOn(router, 'navigate');
    component.onTermsOfServiceTapped();
    expect(router.navigate).toHaveBeenCalledWith(['/terms-of-service']);
  });

  it('should navigate to privacy policy', () => {
    spyOn(router, 'navigate');
    component.onPrivacyPolicyTapped();
    expect(router.navigate).toHaveBeenCalledWith(['/privacy-policy']);
  });
});
