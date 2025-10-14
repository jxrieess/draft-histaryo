import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const allowedRoles = route.data['roles'] as string[];
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/login']);
      return false;
    }

    const userProfile = this.authService.getCurrentUserProfile();
    if (!userProfile) {
      this.router.navigate(['/login']);
      return false;
    }

    if (allowedRoles.includes(userProfile.role)) {
      return true;
    }

    alert('Access denied.');
    this.router.navigate(['/unauthorized']);
    return false;
  }
}