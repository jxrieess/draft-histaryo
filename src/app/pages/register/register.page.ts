// import { Component } from '@angular/core';
// import { Router } from '@angular/router';
// import { AuthService } from '../../services/auth.service';

// @Component({
//   selector: 'app-register',
//   templateUrl: './register.page.html',
//   styleUrls: ['./register.page.scss'],
//   standalone: false
// })
// export class RegisterPage {
//   email = '';
//   password = '';
//   role: 'visitor' | 'curator' = 'visitor';

//   constructor(private auth: AuthService, private router: Router) {}

//   async register() {
//     const email = this.email.trim();
//     const password = this.password;

//     if (!email || !password) {
//       alert('Please fill in all fields.');
//       return;
//     }

//     try {
//       await this.auth.register(email, password, this.role);
//       this.router.navigate(['/login']);
//     } catch (err: unknown) {
//       const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
//       alert(message);
//     }
//   }
// }




// src/app/pages/auth/register/register.page.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {
  email = '';
  password = '';
  role: 'visitor' | 'curator' = 'visitor';
  isSubmitting = false;

  constructor(private auth: AuthService, private router: Router) {}

  async register() {
    const email = this.email.trim();
    const password = this.password;

    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      await this.auth.register(email, password, this.role);

      // Ensure onboarding won't ever show again
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.removeItem('onboardingTarget');

      this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      alert(message);
    } finally {
      this.isSubmitting = false;
    }
  }
}

