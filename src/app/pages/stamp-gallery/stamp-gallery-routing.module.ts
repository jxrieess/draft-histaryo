import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StampGalleryPage } from './stamp-gallery.page';

const routes: Routes = [
  {
    path: '',
    component: StampGalleryPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StampGalleryPageRoutingModule {}
