import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CuratorPage } from './curator.page';

const routes: Routes = [
  {
    path: '',
    component: CuratorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CuratorPageRoutingModule {}
