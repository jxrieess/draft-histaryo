import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VisitorPage } from './visitor.page';

describe('VisitorPage', () => {
  let component: VisitorPage;
  let fixture: ComponentFixture<VisitorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VisitorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
