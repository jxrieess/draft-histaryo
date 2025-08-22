import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubmitTipPage } from './submit-tip.page';

describe('SubmitTipPage', () => {
  let component: SubmitTipPage;
  let fixture: ComponentFixture<SubmitTipPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SubmitTipPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
