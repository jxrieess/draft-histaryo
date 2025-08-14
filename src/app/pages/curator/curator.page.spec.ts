import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CuratorPage } from './curator.page';

describe('CuratorPage', () => {
  let component: CuratorPage;
  let fixture: ComponentFixture<CuratorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CuratorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
