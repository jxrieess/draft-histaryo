import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { auth, db } from '../firebase.config';
import { doc, getDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class RoleGuard implements CanActivate {
  constructor(private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const user = auth.currentUser;
    const allowedRoles = route.data['roles'] as string[];

    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      this.router.navigate(['/login']);
      return false;
    }

    const userRole = userDoc.data()['role'];
    if (allowedRoles.includes(userRole)) {
      return true;
    }

    alert('Access denied.');
    this.router.navigate(['/unauthorized']);
    return false;
  }
}