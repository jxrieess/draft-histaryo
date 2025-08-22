import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ArExperiencePageRoutingModule } from './ar-experience-routing.module';

import { ArExperiencePage } from './ar-experience.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ArExperiencePageRoutingModule
  ],
  declarations: [ArExperiencePage]
})
export class ArExperiencePageModule {}
