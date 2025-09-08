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
//   isSubmitting = false;

//   constructor(private auth: AuthService, private router: Router) {}

//   async register() {
//     const email = this.email.trim();
//     const password = this.password;

//     if (!email || !password) {
//       alert('Please fill in all fields.');
//       return;
//     }
//     if (this.isSubmitting) return;
//     this.isSubmitting = true;

//     try {
//       await this.auth.register(email, password, this.role);

//       localStorage.setItem('hasSeenOnboarding', 'true');
//       localStorage.removeItem('onboardingTarget');

//       this.router.navigateByUrl('/home', { replaceUrl: true });
//     } catch (err: unknown) {
//       const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
//       alert(message);
//     } finally {
//       this.isSubmitting = false;
//     }
//   }
// }





import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { LoadingController, AlertController, ToastController } from '@ionic/angular';
import { AuthService, UserData } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { getAuth } from 'firebase/auth';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnInit, OnDestroy {
  // Form properties
  fullName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  role: 'visitor' | 'curator' | 'guide' | 'admin' = 'visitor';
  agreeToTerms: boolean = false;

  // UI state
  isSubmitting: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  pageLoaded: boolean = false;

  // Validation
  formErrors: any = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    general: ''
  };

  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    console.log('RegisterPage constructor called');
    console.log('Current URL:', this.router.url);
    
    // Prevent any immediate redirects during construction
    this.preventRedirects();
  }

  ngOnInit() {
    console.log('RegisterPage ngOnInit called');
    console.log('Current route:', this.router.url);
    
    // Mark page as loaded
    this.pageLoaded = true;
    
    // Set up route monitoring
    this.setupRouteMonitoring();
    
    // Mark onboarding as seen when register page loads
    localStorage.setItem('hasSeenOnboarding', 'true');
    
    console.log('Register page initialized successfully');
  }

  ngOnDestroy() {
    console.log('RegisterPage destroyed');
    this.subscriptions.unsubscribe();
  }

  /**
   * Prevent redirects during page load
   */
  private preventRedirects(): void {
    // Temporarily set onboarding as seen to prevent app.component redirects
    const originalValue = localStorage.getItem('hasSeenOnboarding');
    localStorage.setItem('hasSeenOnboarding', 'true');
    
    // Restore original value after component loads (if needed)
    setTimeout(() => {
      if (!this.pageLoaded && originalValue !== 'true') {
        // Only restore if page hasn't loaded yet and user hadn't seen onboarding
        // localStorage.setItem('hasSeenOnboarding', originalValue || 'false');
      }
    }, 1000);
  }

  /**
   * Set up route monitoring for debugging
   */
  private setupRouteMonitoring(): void {
    const routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      console.log('Route changed while on register page:', event.url);
      
      if (event.url !== '/register') {
        console.warn('Register page was redirected to:', event.url);
      }
    });

    this.subscriptions.add(routeSub);
  }

  /**
   * Register user
   */
  async register() {
  // Check internet connectivity
  if (!navigator.onLine) {
    await this.showErrorAlert('No internet connection. Please check your network and try again.');
    return;
  }

  if (!this.validateForm()) {
    return;
  }

  this.isSubmitting = true;
  const loading = await this.loadingController.create({
    message: 'Creating your account...',
    spinner: 'crescent'
  });
  await loading.present();

  try {
    const userData: UserData = {
      fullName: this.fullName.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password,
      role: this.role
    };

    const result = await this.authService.register(userData);

    if (result.success) {
      await loading.dismiss();
      await this.showSuccessMessage();
      this.router.navigate(['/login']);
    } else {
      await loading.dismiss();
      
      // Handle specific network errors
      if (result.error?.includes('network')) {
        this.formErrors.general = 'Connection failed. Please check your internet connection and try again.';
      } else {
        this.formErrors.general = result.error || 'Registration failed. Please try again.';
      }
      
      await this.showErrorAlert(this.formErrors.general);
    }
  } catch (error: any) {
    await loading.dismiss();
    console.error('Registration error:', error);
    
    let errorMessage = 'Registration failed. Please try again.';
    
    if (error.message?.includes('network') || error.code === 'auth/network-request-failed') {
      errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
    }
    
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

    // Full Name validation
    if (!this.fullName || this.fullName.trim().length < 2) {
      this.formErrors.fullName = 'Please enter your full name (at least 2 characters)';
      isValid = false;
    }

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

    // Confirm password validation
    if (this.password !== this.confirmPassword) {
      this.formErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Terms agreement validation
    if (!this.agreeToTerms) {
      this.formErrors.general = 'Please agree to the Terms of Service and Privacy Policy';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Clear form errors
   */
  private clearErrors() {
    this.formErrors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: ''
    };
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (error.code) {
      return this.authService.getErrorMessage(error.code);
    }
    return error.message || 'Registration failed. Please try again.';
  }

  /**
   * Show success message
   */
  private async showSuccessMessage() {
    const toast = await this.toastController.create({
      message: 'Account created successfully! Please log in.',
      duration: 3000,
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
      header: 'Registration Failed',
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
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Handle input focus
   */
  onInputFocus(fieldName: string) {
    // Clear specific field error when user focuses on it
    if (this.formErrors[fieldName]) {
      this.formErrors[fieldName] = '';
    }
  }

  /**
   * Handle input blur (validation)
   */
  onInputBlur(fieldName: string) {
    switch (fieldName) {
      case 'fullName':
        if (!this.fullName || this.fullName.trim().length < 2) {
          this.formErrors.fullName = 'Please enter your full name';
        }
        break;
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
      case 'confirmPassword':
        if (this.confirmPassword && this.password !== this.confirmPassword) {
          this.formErrors.confirmPassword = 'Passwords do not match';
        }
        break;
    }
  }

  /**
   * Navigate to login
   */
  navigateToLogin() {
    console.log('Navigating to login from register page');
    this.router.navigate(['/login']);
  }

  /**
   * Handle social registration (Google)
   */
  async registerWithGoogle() {
    try {
      this.isSubmitting = true;
      const result = await this.authService.signInWithGoogle();
      
      if (result.success) {
        this.router.navigate(['/home']);
      } else {
        await this.showErrorAlert('Google registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Google registration error:', error);
      await this.showErrorAlert('Google registration failed. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Handle social registration (Facebook)
   */
  async registerWithFacebook() {
    try {
      this.isSubmitting = true;
      const result = await this.authService.signInWithFacebook();
      
      if (result.success) {
        this.router.navigate(['/home']);
      } else {
        await this.showErrorAlert('Facebook registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Facebook registration error:', error);
      await this.showErrorAlert('Facebook registration failed. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Check password strength
   */
  getPasswordStrength(): string {
    if (!this.password) return '';
    
    if (this.password.length < 6) return 'weak';
    if (this.password.length < 8) return 'medium';
    
    const hasUpperCase = /[A-Z]/.test(this.password);
    const hasLowerCase = /[a-z]/.test(this.password);
    const hasNumbers = /\d/.test(this.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(this.password);
    
    const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
      .filter(Boolean).length;
    
    if (strength >= 3) return 'strong';
    if (strength >= 2) return 'medium';
    return 'weak';
  }

  /**
   * Handle form submission via Enter key
   */
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.register();
    }
  }

  /**
   * Test method to verify page is working
   */
  testPageLoad() {
    alert('Register page is working!');
    console.log('Register page test successful');
  }
  // Add to register.page.ts for testing
async testFirebase() {
  try {
    console.log('Testing Firebase connection...');
    const testAuth = getAuth();
    console.log('Auth instance:', testAuth);
    alert('Firebase connection successful!');
  } catch (error) {
    console.error('Firebase test failed:', error);
    alert('Firebase connection failed: ' + error);
  }
}
}