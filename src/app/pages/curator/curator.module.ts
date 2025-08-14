import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CuratorPageRoutingModule } from './curator-routing.module';

import { CuratorPage } from './curator.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CuratorPageRoutingModule
  ],
  declarations: [CuratorPage]
})
export class CuratorPageModule {}
