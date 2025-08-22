import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ArExperiencePage } from './ar-experience.page';

const routes: Routes = [
  {
    path: '',
    component: ArExperiencePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ArExperiencePageRoutingModule {}
