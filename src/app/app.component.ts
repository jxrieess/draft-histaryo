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
    const seen = localStorage.getItem('hasSeenOnboarding');

    // Current URL at app bootstrap (may be '/')
    const current = window.location.pathname || '';

    const isAuthRoute =
      current.startsWith('/login') || current.startsWith('/register');

    // If already trying to open login/register, do nothing
    if (isAuthRoute) return;

    // If already seen onboarding and you're on /onboarding, push to /home
    if (seen && current.startsWith('/onboarding')) {
      this.router.navigateByUrl('/home', { replaceUrl: true });
      return;
    }

    // If first time and you're at root or something else, show onboarding
    if (!seen && (current === '/' || current === '')) {
      this.router.navigateByUrl('/onboarding', { replaceUrl: true });
    }
  }
}



// import { Component } from '@angular/core';
// import { Router } from '@angular/router';
// import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// @Component({
//   selector: 'app-root',
//   template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>',
// })
// export class AppComponent {
//   constructor(private router: Router) {
//     const auth = getAuth();
//     const hasSeen = localStorage.getItem('hasSeenOnboarding') === 'true';

//     onAuthStateChanged(auth, (user: User | null) => {
//       const current = window.location.pathname || '';
//       const isAuthRoute = current.startsWith('/login') || current.startsWith('/register');

//       if (isAuthRoute) return;

//       if (!hasSeen) {
//         localStorage.setItem('onboardingTarget', 'login');
//         this.router.navigateByUrl('/onboarding', { replaceUrl: true });
//         return;
//       }

//       if (user) {
//         this.router.navigateByUrl('/home', { replaceUrl: true });
//       } else {
//         this.router.navigateByUrl('/login', { replaceUrl: true });
//       }
//     });
//   }
// }
