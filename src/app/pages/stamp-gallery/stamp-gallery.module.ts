import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { StampGalleryPageRoutingModule } from './stamp-gallery-routing.module';

import { StampGalleryPage } from './stamp-gallery.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StampGalleryPageRoutingModule
  ],
  declarations: [StampGalleryPage]
})
export class StampGalleryPageModule {}
