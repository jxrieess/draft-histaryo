import { TestBed } from '@angular/core/testing';

import { ScavengerService } from './scavenger.service';

describe('ScavengerService', () => {
  let service: ScavengerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScavengerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
