import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StampGalleryPage } from './stamp-gallery.page';

describe('StampGalleryPage', () => {
  let component: StampGalleryPage;
  let fixture: ComponentFixture<StampGalleryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StampGalleryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
