import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VisitorPage } from './visitor.page';

const routes: Routes = [
  {
    path: '',
    component: VisitorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VisitorPageRoutingModule {}
