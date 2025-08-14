import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LandmarkDetailsPageRoutingModule } from './landmark-details-routing.module';

import { LandmarkDetailsPage } from './landmark-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LandmarkDetailsPageRoutingModule
  ],
  declarations: [LandmarkDetailsPage]
})
export class LandmarkDetailsPageModule {}
