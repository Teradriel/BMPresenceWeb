import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { PrivacyPolicyPageComponent } from './privacy-policy-page.component';

describe('PrivacyPolicyPageComponent', () => {
  let component: PrivacyPolicyPageComponent;
  let fixture: ComponentFixture<PrivacyPolicyPageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPolicyPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicyPageComponent);
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
