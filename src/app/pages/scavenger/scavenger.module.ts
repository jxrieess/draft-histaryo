import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { ScavengerPageRoutingModule } from './scavenger-routing.module';

import { ScavengerPage } from './scavenger.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    ScavengerPageRoutingModule
  ],
  declarations: [ScavengerPage], 
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ScavengerPageModule {}
