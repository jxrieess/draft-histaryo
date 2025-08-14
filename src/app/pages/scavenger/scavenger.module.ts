import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ScavengerPageRoutingModule } from './scavenger-routing.module';

import { ScavengerPage } from './scavenger.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScavengerPageRoutingModule
  ],
  declarations: [ScavengerPage]
})
export class ScavengerPageModule {}
