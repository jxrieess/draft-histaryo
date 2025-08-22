// src/app/app.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private router: Router) {
    this.initializeApp();
  }

  private initializeApp(): void {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding') === 'true';
    const currentPath = window.location.pathname;

    // Don't redirect if already on specific auth routes
    if (this.isAuthRoute(currentPath)) {
      return;
    }

    // Handle onboarding logic
    if (!hasSeenOnboarding) {
      // First time user - show onboarding
      if (currentPath !== '/onboarding') {
        this.router.navigateByUrl('/onboarding', { replaceUrl: true });
      }
    } else {
      // Returning user - go to appropriate page
      if (currentPath === '/' || currentPath === '/onboarding') {
        // Check if user is logged in (you can enhance this based on your auth system)
        this.router.navigateByUrl('/home', { replaceUrl: true });
      }
    }
  }

  private isAuthRoute(path: string): boolean {
    const authRoutes = ['/login', '/register'];
    return authRoutes.some(route => path.startsWith(route));
  }
}