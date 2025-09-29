import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Platform } from '@ionic/angular';
import { filter } from 'rxjs/operators';

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
    private platform: Platform
  ) {
    this.platform.ready().then(() => {
      this.initializeApp();
    });
  }

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      console.log('Navigation completed to:', event.url);
    });
  }

  private initializeApp(): void {
    if (this.hasInitialized) {
      return;
    }
    
    this.hasInitialized = true;
    
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
    const currentPath = window.location.pathname;
    
    console.log('App initializing:', { hasSeenOnboarding, currentPath });

    if (this.isAuthRoute(currentPath)) {
      console.log('Auth route detected, allowing access');
      return;
    }

    if (!hasSeenOnboarding) {
      if (currentPath !== '/onboarding') {
        console.log('First time user, redirecting to onboarding');
        this.router.navigateByUrl('/onboarding', { replaceUrl: true });
      }
    } else {
      if (currentPath === '/' || currentPath === '/onboarding') {
        console.log('Returning user, redirecting to login');
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }
    }
  }

  private isAuthRoute(path: string): boolean {
    const authRoutes = ['/login', '/register', '/forgot-password'];
    const isAuth = authRoutes.some(route => path.startsWith(route));
    console.log('Checking if auth route:', path, 'Result:', isAuth);
    return isAuth;
  }

  private handleRouteProtection(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
      
      if (!hasSeenOnboarding && !this.isAuthRoute(event.url) && event.url !== '/onboarding') {
        console.log('Redirecting to onboarding from:', event.url);
        this.router.navigateByUrl('/onboarding', { replaceUrl: true });
      }
    });
  }
}



