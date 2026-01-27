import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { TermsOfServicePageComponent } from './terms-of-service-page.component';

describe('TermsOfServicePageComponent', () => {
  let component: TermsOfServicePageComponent;
  let fixture: ComponentFixture<TermsOfServicePageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsOfServicePageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TermsOfServicePageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to about page on accept', () => {
    spyOn(router, 'navigate');
    component.onAccept();
    expect(router.navigate).toHaveBeenCalledWith(['/about']);
  });
});
