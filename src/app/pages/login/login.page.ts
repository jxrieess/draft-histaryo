// import { Component } from '@angular/core';
// import { Router } from '@angular/router';
// import { AuthService } from '../../services/auth.service';

// @Component({
//   selector: 'app-login',
//   templateUrl: './login.page.html',
//   styleUrls: ['./login.page.scss'],
//   standalone: false
// })
// export class LoginPage {
//   email = '';
//   password = '';

//   constructor(private auth: AuthService, private router: Router) {}

//   async login() {
//     const email = this.email.trim();
//     const password = this.password;

//     if (!email || !password) {
//       alert('Please enter both email and password.');
//       return;
//     }

//     try {
//       await this.auth.login(email, password);
//       this.router.navigateByUrl('/onboarding', { replaceUrl: true });
//     } catch (err: unknown) {
//       const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
//       alert(message);
//     }
//   }
// }





// src/app/pages/auth/login/login.page.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  email = '';
  password = '';
  isSubmitting = false;

  constructor(private auth: AuthService, private router: Router) {}

  async login() {
    const email = this.email.trim();
    const password = this.password;

    if (!email || !password) {
      alert('Please enter both email and password.');
      return;
    }
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      await this.auth.login(email, password);

      const hasSeen = localStorage.getItem('hasSeenOnboarding') === 'true';
      if (hasSeen) {
        this.router.navigateByUrl('/home', { replaceUrl: true });
      } else {
        // Show onboarding after login, and finish at Home
        localStorage.setItem('onboardingTarget', 'home');
        this.router.navigateByUrl('/onboarding', { replaceUrl: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      alert(message);
    } finally {
      this.isSubmitting = false;
    }
  }
}

