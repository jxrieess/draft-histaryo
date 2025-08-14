import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ScavengerPage } from './scavenger.page';

const routes: Routes = [
  {
    path: '',
    component: ScavengerPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScavengerPageRoutingModule {}
