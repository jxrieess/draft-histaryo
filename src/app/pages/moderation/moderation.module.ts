import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ModerationPageRoutingModule } from './moderation-routing.module';

import { ModerationPage } from './moderation.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ModerationPageRoutingModule
  ],
  declarations: [ModerationPage]
})
export class ModerationPageModule {}

