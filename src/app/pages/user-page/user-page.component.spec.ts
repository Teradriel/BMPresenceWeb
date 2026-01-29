import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPageComponent } from './user-page.component';

describe('UserPageComponent', () => {
  let component: UserPageComponent;
  let fixture: ComponentFixture<UserPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have isBusy property initialized to false', () => {
    expect(component.isBusy).toBe(false);
  });

  it('should have a user object', () => {
    expect(component.user).toBeDefined();
    expect(component.user.name).toBeTruthy();
    expect(component.user.lastName).toBeTruthy();
    expect(component.user.username).toBeTruthy();
  });

  it('should format dates correctly', () => {
    const testDate = new Date('2024-01-15T10:30:00');
    const formatted = component.formatDate(testDate);
    expect(formatted).toContain('15/01/2024');
    expect(formatted).toContain('10:30');
  });

  it('should return empty string for null date', () => {
    const formatted = component.formatDate(null);
    expect(formatted).toBe('');
  });

  it('should call onEditProfile when edit button is clicked', () => {
    spyOn(component, 'onEditProfile');
    component.onEditProfile();
    expect(component.onEditProfile).toHaveBeenCalled();
  });

  it('should call onChangePassword when change password button is clicked', () => {
    spyOn(component, 'onChangePassword');
    component.onChangePassword();
    expect(component.onChangePassword).toHaveBeenCalled();
  });

  it('should show confirm dialog and call logout', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(console, 'log');
    component.onLogout();
    expect(window.confirm).toHaveBeenCalledWith('Sei sicuro di voler uscire dall\'account?');
    expect(console.log).toHaveBeenCalledWith('Logout clicked');
  });

  it('should not logout if user cancels', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    spyOn(console, 'log');
    component.onLogout();
    expect(window.confirm).toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });
});
