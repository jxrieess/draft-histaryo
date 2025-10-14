import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SubmitContentPage } from './submit-content.page';

const routes: Routes = [
  {
    path: '',
    component: SubmitContentPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SubmitContentPageRoutingModule {}
