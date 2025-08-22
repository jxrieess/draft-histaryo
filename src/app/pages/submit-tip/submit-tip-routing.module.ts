import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SubmitTipPage } from './submit-tip.page';

const routes: Routes = [
  {
    path: '',
    component: SubmitTipPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SubmitTipPageRoutingModule {}
