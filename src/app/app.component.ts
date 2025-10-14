import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Platform } from '@ionic/angular';
import { filter } from 'rxjs/operators';
import { LandmarkService } from './services/landmark.service';
import { db } from './firebase.config';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private hasInitialized = false;

  constructor(
    private router: Router,
    private platform: Platform,
    private landmarkService: LandmarkService
  ) {
    this.platform.ready().then(() => {
      this.initializeApp();
    });
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd) => {
        });
  }

  private initializeApp(): void {
    if (this.hasInitialized) {
      return;
    }
    
    this.hasInitialized = true;
    
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
        const currentPath = window.location.pathname;

        if (this.isAuthRoute(currentPath)) {
          return;
        }

        if (!hasSeenOnboarding) {
          if (currentPath !== '/onboarding') {
            this.router.navigateByUrl('/onboarding', { replaceUrl: true });
          }
        } else {
          if (currentPath === '/' || currentPath === '/onboarding') {
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        }
  }

  private isAuthRoute(path: string): boolean {
    const authRoutes = ['/login', '/register', '/forgot-password'];
      const isAuth = authRoutes.some(route => path.startsWith(route));
      return isAuth;
  }

  private handleRouteProtection(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
      
      if (!hasSeenOnboarding && !this.isAuthRoute(event.url) && event.url !== '/onboarding') {
        this.router.navigateByUrl('/onboarding', { replaceUrl: true });
      }
    });
  }
}



