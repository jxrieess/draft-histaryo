import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ModerationPage } from './moderation.page';
import { RoleGuard } from '../../guards/role.guard';

const routes: Routes = [
  {
    path: '',
    component: ModerationPage,
    canActivate: [RoleGuard],
    data: { roles: ['curator', 'admin'] }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ModerationPageRoutingModule {}

