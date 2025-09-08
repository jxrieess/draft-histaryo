// // import { Component } from '@angular/core';
// // import { Router } from '@angular/router';
// // import { AuthService } from '../../services/auth.service';

// // @Component({
// //   selector: 'app-login',
// //   templateUrl: './login.page.html',
// //   styleUrls: ['./login.page.scss'],
// //   standalone: false
// // })
// // export class LoginPage {
// //   email = '';
// //   password = '';

// //   constructor(private auth: AuthService, private router: Router) {}

// //   async login() {
// //     const email = this.email.trim();
// //     const password = this.password;

// //     if (!email || !password) {
// //       alert('Please enter both email and password.');
// //       return;
// //     }

// //     try {
// //       await this.auth.login(email, password);
// //       this.router.navigateByUrl('/onboarding', { replaceUrl: true });
// //     } catch (err: unknown) {
// //       const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
// //       alert(message);
// //     }
// //   }
// // }





// // src/app/pages/auth/login/login.page.ts
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
//   isSubmitting = false;

//   constructor(private auth: AuthService, private router: Router) {}

//   async login() {
//     const email = this.email.trim();
//     const password = this.password;

//     if (!email || !password) {
//       alert('Please enter both email and password.');
//       return;
//     }
//     if (this.isSubmitting) return;
//     this.isSubmitting = true;

//     try {
//       await this.auth.login(email, password);

//       const hasSeen = localStorage.getItem('hasSeenOnboarding') === 'true';
//       if (hasSeen) {
//         this.router.navigateByUrl('/home', { replaceUrl: true });
//       } else {
//         localStorage.setItem('onboardingTarget', 'home');
//         this.router.navigateByUrl('/onboarding', { replaceUrl: true });
//       }
//     } catch (err: unknown) {
//       const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
//       alert(message);
//     } finally {
//       this.isSubmitting = false;
//     }
//   }
// }



import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  // Form properties
  email: string = '';
  password: string = '';

  // UI state
  isSubmitting: boolean = false;
  showPassword: boolean = false;
  rememberMe: boolean = false;

  // Validation
  formErrors: any = {
    email: '',
    password: '',
    general: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Check if user is already logged in
    this.checkAuthStatus();
    
    // Load remembered email if exists
    this.loadRememberedCredentials();
  }

  /**
   * Check authentication status
   */
  private async checkAuthStatus() {
    try {
      const isAuthenticated = await this.authService.isAuthenticated();
      if (isAuthenticated) {
        this.router.navigate(['/home'], { replaceUrl: true });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  }

  /**
   * Load remembered credentials
   */
  private loadRememberedCredentials() {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      this.email = rememberedEmail;
      this.rememberMe = true;
    }
  }

  /**
   * Login user
   */
  async login() {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Signing you in...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const result = await this.authService.signIn(
        this.email.trim().toLowerCase(),
        this.password
      );

      if (result.success) {
        // Handle remember me
        this.handleRememberMe();
        
        await loading.dismiss();
        await this.showSuccessMessage();
        
        // Navigate to home
        this.router.navigate(['/home'], { replaceUrl: true });
      } else {
        await loading.dismiss();
        this.formErrors.general = result.error || 'Login failed. Please try again.';
        await this.showErrorAlert(this.formErrors.general);
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Login error:', error);
      
      const errorMessage = this.getErrorMessage(error);
      this.formErrors.general = errorMessage;
      await this.showErrorAlert(errorMessage);
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Validate form
   */
  private validateForm(): boolean {
    this.clearErrors();
    let isValid = true;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email || !emailRegex.test(this.email)) {
      this.formErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation
    if (!this.password || this.password.length < 6) {
      this.formErrors.password = 'Password must be at least 6 characters long';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Clear form errors
   */
  private clearErrors() {
    this.formErrors = {
      email: '',
      password: '',
      general: ''
    };
  }

  /**
   * Handle remember me functionality
   */
  private handleRememberMe() {
    if (this.rememberMe) {
      localStorage.setItem('rememberedEmail', this.email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error.code) {
      return this.authService.getErrorMessage(error.code);
    }
    return error.message || 'Login failed. Please try again.';
  }

  /**
   * Show success message
   */
  private async showSuccessMessage() {
    const toast = await this.toastController.create({
      message: 'Welcome back!',
      duration: 2000,
      position: 'top',
      color: 'success',
      icon: 'checkmark-circle'
    });
    await toast.present();
  }

  /**
   * Show error alert
   */
  private async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Login Failed',
      message: message,
      buttons: ['OK'],
      cssClass: 'error-alert'
    });
    await alert.present();
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Handle input focus
   */
  onInputFocus(fieldName: string) {
    // Clear specific field error when user focuses on it
    if (this.formErrors[fieldName]) {
      this.formErrors[fieldName] = '';
    }
    // Clear general error as well
    if (this.formErrors.general) {
      this.formErrors.general = '';
    }
  }

  /**
   * Handle input blur (validation)
   */
  onInputBlur(fieldName: string) {
    switch (fieldName) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.email && !emailRegex.test(this.email)) {
          this.formErrors.email = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (this.password && this.password.length < 6) {
          this.formErrors.password = 'Password must be at least 6 characters';
        }
        break;
    }
  }

  /**
   * Navigate to register
   */
  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  /**
   * Handle forgot password
   */
  async forgotPassword() {
    if (!this.email) {
      const alert = await this.alertController.create({
        header: 'Email Required',
        message: 'Please enter your email address first.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      const alert = await this.alertController.create({
        header: 'Invalid Email',
        message: 'Please enter a valid email address.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Reset Password',
      message: `Send password reset instructions to ${this.email}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Send',
          handler: async () => {
            try {
              const loading = await this.loadingController.create({
                message: 'Sending reset email...'
              });
              await loading.present();

              const result = await this.authService.resetPassword(this.email);
              await loading.dismiss();

              if (result.success) {
                const successAlert = await this.alertController.create({
                  header: 'Email Sent',
                  message: 'Password reset instructions have been sent to your email.',
                  buttons: ['OK']
                });
                await successAlert.present();
              } else {
                throw new Error(result.error);
              }
            } catch (error: any) {
              const errorAlert = await this.alertController.create({
                header: 'Error',
                message: error.message || 'Failed to send reset email. Please try again.',
                buttons: ['OK']
              });
              await errorAlert.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  /**
   * Handle social login (Google)
   */
  async signInWithGoogle() {
    try {
      this.isSubmitting = true;
      const result = await this.authService.signInWithGoogle();
      
      if (result.success) {
        await this.showSuccessMessage();
        this.router.navigate(['/home'], { replaceUrl: true });
      } else {
        await this.showErrorAlert('Google sign-in failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      await this.showErrorAlert('Google sign-in failed. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Handle social login (Facebook)
   */
  async signInWithFacebook() {
    try {
      this.isSubmitting = true;
      const result = await this.authService.signInWithFacebook();
      
      if (result.success) {
        await this.showSuccessMessage();
        this.router.navigate(['/home'], { replaceUrl: true });
      } else {
        await this.showErrorAlert('Facebook sign-in failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Facebook sign-in error:', error);
      await this.showErrorAlert('Facebook sign-in failed. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Handle form submission via Enter key
   */
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.login();
    }
  }
}