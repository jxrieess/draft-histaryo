import { TestBed } from '@angular/core/testing';

import { ArExperienceService } from './ar-experience.service';

describe('ArExperienceService', () => {
  let service: ArExperienceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArExperienceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
