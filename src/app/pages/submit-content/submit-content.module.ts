import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SubmitContentPageRoutingModule } from './submit-content-routing.module';

import { SubmitContentPage } from './submit-content.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SubmitContentPageRoutingModule
  ],
  declarations: [SubmitContentPage]
})
export class SubmitContentPageModule {}
