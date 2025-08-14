import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LandmarkDetailsPage } from './landmark-details.page';

const routes: Routes = [
  {
    path: '',
    component: LandmarkDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LandmarkDetailsPageRoutingModule {}
