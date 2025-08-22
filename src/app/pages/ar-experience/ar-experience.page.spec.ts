import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArExperiencePage } from './ar-experience.page';

describe('ArExperiencePage', () => {
  let component: ArExperiencePage;
  let fixture: ComponentFixture<ArExperiencePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ArExperiencePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
