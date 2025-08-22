import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SubmitTipPageRoutingModule } from './submit-tip-routing.module';

import { SubmitTipPage } from './submit-tip.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SubmitTipPageRoutingModule
  ],
  declarations: [SubmitTipPage]
})
export class SubmitTipPageModule {}
