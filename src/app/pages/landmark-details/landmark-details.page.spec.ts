import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandmarkDetailsPage } from './landmark-details.page';

describe('LandmarkDetailsPage', () => {
  let component: LandmarkDetailsPage;
  let fixture: ComponentFixture<LandmarkDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LandmarkDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
