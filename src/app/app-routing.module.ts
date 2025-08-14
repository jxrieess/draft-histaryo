import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';


const routes: Routes = [
  {
    path: '',
    redirectTo: 'onboarding',
    pathMatch: 'full'
  },
    { path: '**', redirectTo: 'onboarding' },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'landmark-details/:id',
    loadChildren: () => import('./pages/landmark-details/landmark-details.module').then( m => m.LandmarkDetailsPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'map',
    loadChildren: () => import('./pages/map/map.module').then( m => m.MapPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'scan',
    loadChildren: () => import('./pages/scan/scan.module').then( m => m.ScanPageModule)
  },
  {
    path: 'onboarding',
    loadChildren: () => import('./pages/onboarding/onboarding.module').then( m => m.OnboardingPageModule)
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/admin.module').then( m => m.AdminPageModule),
    canActivate: [RoleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'curator',
    loadChildren: () => import('./pages/curator/curator.module').then( m => m.CuratorPageModule),
    canActivate: [RoleGuard],
    data: { roles: ['curator'] }
  },
  {
    path: 'visitor',
    loadChildren: () => import('./pages/visitor/visitor.module').then( m => m.VisitorPageModule),
    canActivate: [RoleGuard],
    data: { roles: ['visitor'] }
  },
  {
    path: 'scavenger',
    loadChildren: () => import('./pages/scavenger/scavenger.module').then( m => m.ScavengerPageModule)
  },
  {
    path: 'stamp-gallery',
    loadChildren: () => import('./pages/stamp-gallery/stamp-gallery.module').then( m => m.StampGalleryPageModule)
  },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
