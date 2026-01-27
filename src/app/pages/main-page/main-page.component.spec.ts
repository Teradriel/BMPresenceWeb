import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainPageComponent } from './main-page.component';

describe('MainPageComponent', () => {
  let component: MainPageComponent;
  let fixture: ComponentFixture<MainPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have title "Presenze 8:30"', () => {
    expect(component.title).toBe('Presenze 8:30');
  });

  it('should refresh calendar on button click', () => {
    spyOn(component, 'refreshCalendar');
    const button = fixture.nativeElement.querySelector('.refresh-button');
    button.click();
    expect(component.refreshCalendar).toHaveBeenCalled();
  });

  it('should show loading spinner when isBusy is true', () => {
    component.isBusy = true;
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.loading-overlay');
    expect(spinner).toBeTruthy();
  });

  it('should hide loading spinner when isBusy is false', () => {
    component.isBusy = false;
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('.loading-overlay');
    expect(spinner).toBeFalsy();
  });
});
