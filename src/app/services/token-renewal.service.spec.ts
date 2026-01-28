import { TestBed } from '@angular/core/testing';

import { TokenRenewalService } from './token-renewal.service';

describe('TokenRenewalService', () => {
  let service: TokenRenewalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenRenewalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
