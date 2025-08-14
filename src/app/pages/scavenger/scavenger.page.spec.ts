import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScavengerPage } from './scavenger.page';

describe('ScavengerPage', () => {
  let component: ScavengerPage;
  let fixture: ComponentFixture<ScavengerPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ScavengerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
