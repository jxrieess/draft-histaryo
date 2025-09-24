// // src/app/app.component.ts
// import { Component } from '@angular/core';
// import { Router } from '@angular/router';

// @Component({
//   selector: 'app-root',
//   templateUrl: 'app.component.html',
//   styleUrls: ['app.component.scss'],
//   standalone: false,
// })
// export class AppComponent {
//   constructor(private router: Router) {
//     this.initializeApp();
//   }

//   private initializeApp(): void {
//     const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
//     const currentPath = window.location.pathname;

//     // Don't redirect if already on specific auth routes
//     if (this.isAuthRoute(currentPath)) {
//       return;
//     }

//     // Handle onboarding logic
//     if (!hasSeenOnboarding) {
//       // First time user - show onboarding
//       if (currentPath !== '/onboarding') {
//         this.router.navigateByUrl('/onboarding', { replaceUrl: true });
//       }
//     } else {
//       // Returning user - go to appropriate page
//       if (currentPath === '/' || currentPath === '/onboarding') {
//         // Check if user is logged in (you can enhance this based on your auth system)
//         this.router.navigateByUrl('/home', { replaceUrl: true });
//       }
//     }
//   }

//   private isAuthRoute(path: string): boolean {
//     const authRoutes = ['/login', '/register'];
//     return authRoutes.some(route => path.startsWith(route));
//   }
// }





// src/app/app.component.ts
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
    // Listen to route changes for debugging
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

    // Allow direct access to auth routes without interference
    if (this.isAuthRoute(currentPath)) {
      console.log('Auth route detected, allowing access');
      return;
    }

    // First time users: onboarding flow
    if (!hasSeenOnboarding) {
      if (currentPath !== '/onboarding') {
        console.log('First time user, redirecting to onboarding');
        this.router.navigateByUrl('/onboarding', { replaceUrl: true });
      }
    } else {
      // Returning users: skip onboarding, go to login
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

  /**
   * Handle deep links and route protection
   */
  private handleRouteProtection(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
      
      // Only redirect to onboarding if user hasn't seen it AND they're not on auth routes
      if (!hasSeenOnboarding && !this.isAuthRoute(event.url) && event.url !== '/onboarding') {
        console.log('Redirecting to onboarding from:', event.url);
        this.router.navigateByUrl('/onboarding', { replaceUrl: true });
      }
    });
  }
}



