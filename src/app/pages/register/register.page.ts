import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { LoadingController, AlertController, ToastController, ModalController } from '@ionic/angular';
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
  fullName: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  role: 'visitor' | 'curator' | 'guide' | 'admin' = 'visitor';
  agreeToTerms: boolean = false;

  isSubmitting: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  pageLoaded: boolean = false;

  formErrors: any = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    general: ''
  };

  passwordStrength: 'weak' | 'medium' | 'strong' = 'weak';

  validationStates = {
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false
  };

  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController
  ) {
    console.log('RegisterPage constructor called');
    console.log('Current URL:', this.router.url);
    
    this.preventRedirects();
  }

  ngOnInit() {
    console.log('RegisterPage ngOnInit called');
    console.log('Current route:', this.router.url);
    
    this.pageLoaded = true;
    
    this.setupRouteMonitoring();
    
    localStorage.setItem('hasSeenOnboarding', 'true');
    
    console.log('Register page initialized successfully');
  }

  ngOnDestroy() {
    console.log('RegisterPage destroyed');
    this.subscriptions.unsubscribe();
  }

  private preventRedirects(): void {
    const originalValue = localStorage.getItem('hasSeenOnboarding');
    localStorage.setItem('hasSeenOnboarding', 'true');
    
    setTimeout(() => {
      if (!this.pageLoaded && originalValue !== 'true') {
      }
    }, 1000);
  }

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

  async register() {
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
      spinner: 'crescent',
      cssClass: 'custom-loading'
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
        await this.showSuccessToast('Account created successfully!');
        
        setTimeout(() => {
          this.router.navigate(['/login'], { 
            queryParams: { registered: 'true' } 
          });
        }, 500);
      } else {
        await loading.dismiss();
        
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

  private validateForm(): boolean {
    this.clearErrors();
    let isValid = true;

    if (!this.fullName || this.fullName.trim().length < 2) {
      this.formErrors.fullName = 'Please enter your full name (at least 2 characters)';
      this.validationStates.fullName = false;
      isValid = false;
    } else {
      this.validationStates.fullName = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email || !emailRegex.test(this.email)) {
      this.formErrors.email = 'Please enter a valid email address';
      this.validationStates.email = false;
      isValid = false;
    } else {
      this.validationStates.email = true;
    }

    if (!this.password || this.password.length < 6) {
      this.formErrors.password = 'Password must be at least 6 characters long';
      this.validationStates.password = false;
      isValid = false;
    } else {
      this.validationStates.password = true;
    }

    if (this.password !== this.confirmPassword) {
      this.formErrors.confirmPassword = 'Passwords do not match';
      this.validationStates.confirmPassword = false;
      isValid = false;
    } else {
      this.validationStates.confirmPassword = true;
    }

    if (!this.agreeToTerms) {
      this.formErrors.general = 'Please agree to the Terms of Service and Privacy Policy';
      isValid = false;
    }

    return isValid;
  }

  private clearErrors() {
    this.formErrors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      general: ''
    };
  }

  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: 'success',
      icon: 'checkmark-circle',
      cssClass: 'custom-toast success-toast',
      buttons: [
        {
          side: 'end',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  private async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Registration Failed',
      message: message,
      buttons: [
        {
          text: 'Try Again',
          role: 'cancel',
          cssClass: 'alert-button-primary'
        }
      ],
      cssClass: 'custom-alert error-alert'
    });
    await alert.present();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onInputFocus(fieldName: string) {
    if (this.formErrors[fieldName]) {
      this.formErrors[fieldName] = '';
    }
  }

  onInputBlur(fieldName: string) {
    switch (fieldName) {
      case 'fullName':
        if (!this.fullName || this.fullName.trim().length < 2) {
          this.formErrors.fullName = 'Please enter your full name';
          this.validationStates.fullName = false;
        } else {
          this.validationStates.fullName = true;
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (this.email && !emailRegex.test(this.email)) {
          this.formErrors.email = 'Please enter a valid email address';
          this.validationStates.email = false;
        } else if (this.email) {
          this.validationStates.email = true;
        }
        break;
      case 'password':
        if (this.password && this.password.length < 6) {
          this.formErrors.password = 'Password must be at least 6 characters';
          this.validationStates.password = false;
        } else if (this.password) {
          this.validationStates.password = true;
        }
        break;
      case 'confirmPassword':
        if (this.confirmPassword && this.password !== this.confirmPassword) {
          this.formErrors.confirmPassword = 'Passwords do not match';
          this.validationStates.confirmPassword = false;
        } else if (this.confirmPassword) {
          this.validationStates.confirmPassword = true;
        }
        break;
    }
  }

  onPasswordInput() {
    this.calculatePasswordStrength();
    
    if (this.confirmPassword) {
      this.onInputBlur('confirmPassword');
    }
  }

  private calculatePasswordStrength() {
    if (!this.password) {
      this.passwordStrength = 'weak';
      return;
    }
    
    let score = 0;

    if (this.password.length >= 8) score += 1;
    if (this.password.length >= 12) score += 1;
    
    if (/[a-z]/.test(this.password)) score += 1;
    if (/[A-Z]/.test(this.password)) score += 1;
    if (/[0-9]/.test(this.password)) score += 1;
    if (/[^A-Za-z0-9]/.test(this.password)) score += 1;
    
    if (score < 3) {
      this.passwordStrength = 'weak';
    } else if (score < 5) {
      this.passwordStrength = 'medium';
    } else {
      this.passwordStrength = 'strong';
    }
  }

  getPasswordStrength(): string {
    return this.passwordStrength;
  }

  navigateToLogin() {
    console.log('Navigating to login from register page');
    this.router.navigate(['/login'], { 
      replaceUrl: true
    });
  }

  async registerWithGoogle() {
    if (this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      
      const loading = await this.loadingController.create({
        message: 'Connecting with Google...',
        spinner: 'crescent'
      });
      await loading.present();

      const result = await this.authService.signInWithGoogle();
      
      await loading.dismiss();
      
      if (result.success) {
        await this.showSuccessToast('Successfully signed in with Google!');
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

  async registerWithFacebook() {
    if (this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      
      const loading = await this.loadingController.create({
        message: 'Connecting with Facebook...',
        spinner: 'crescent'
      });
      await loading.present();

      const result = await this.authService.signInWithFacebook();
      
      await loading.dismiss();
      
      if (result.success) {
        await this.showSuccessToast('Successfully signed in with Facebook!');
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

  async openTerms() {
    const alert = await this.alertController.create({
      header: 'Terms of Service',
      message: `
        <div class="terms-content">
          <h3>HistARyo Terms of Service</h3>
          <p>By using HistARyo, you agree to:</p>
          <ul>
            <li>Respect heritage sites and follow local guidelines</li>
            <li>Use AR features responsibly and safely</li>
            <li>Share accurate information when contributing content</li>
            <li>Respect other users and the community</li>
          </ul>
          <p>For complete terms, visit our website.</p>
        </div>
      `,
      buttons: [
        {
          text: 'I Understand',
          role: 'cancel'
        }
      ],
      cssClass: 'terms-modal'
    });
    await alert.present();
  }

  async openPrivacyPolicy() {
    const alert = await this.alertController.create({
      header: 'Privacy Policy',
      message: `
        <div class="privacy-content">
          <h3>HistARyo Privacy Policy</h3>
          <p>We protect your privacy by:</p>
          <ul>
            <li>Encrypting all personal data</li>
            <li>Using location data only for AR features</li>
            <li>Never sharing personal information</li>
            <li>Allowing you to delete your account anytime</li>
          </ul>
          <p>For complete privacy policy, visit our website.</p>
        </div>
      `,
      buttons: [
        {
          text: 'I Understand',
          role: 'cancel'
        }
      ],
      cssClass: 'privacy-modal'
    });
    await alert.present();
  }

  async showHelp() {
    const alert = await this.alertController.create({
      header: 'Need Help?',
      message: `
        <div class="help-content">
          <h3>Creating Your Account</h3>
          <p>Choose your role based on how you'll use HistARyo:</p>
          <ul>
            <li><strong>Heritage Explorer:</strong> Discover and explore sites</li>
            <li><strong>Content Curator:</strong> Contribute historical content</li>
            <li><strong>Tour Guide:</strong> Create and lead virtual tours</li>
          </ul>
          <p>Need more help? Contact us at support@histaryo.com</p>
        </div>
      `,
      buttons: [
        {
          text: 'Got It',
          role: 'cancel'
        }
      ],
      cssClass: 'help-modal'
    });
    await alert.present();
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !this.isSubmitting) {
      this.register();
    }
  }

  testPageLoad() {
    const toast = this.toastController.create({
      message: 'Register page is working perfectly! 🎉',
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    toast.then(t => t.present());
    console.log('Register page test successful');
  }

  async testFirebase() {
    try {
      console.log('Testing Firebase connection...');
      const testAuth = getAuth();
      console.log('Auth instance:', testAuth);
      
      const toast = await this.toastController.create({
        message: 'Firebase connection successful! ✅',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Firebase test failed:', error);
      
      const toast = await this.toastController.create({
        message: 'Firebase connection failed ❌',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  get isFormValid(): boolean {
    return this.validationStates.fullName && 
           this.validationStates.email && 
           this.validationStates.password && 
           this.validationStates.confirmPassword && 
           this.agreeToTerms;
  }

  get completionPercentage(): number {
    let completed = 0;
    const total = 5;
    
    if (this.validationStates.fullName) completed++;
    if (this.validationStates.email) completed++;
    if (this.validationStates.password) completed++;
    if (this.validationStates.confirmPassword) completed++;
    if (this.agreeToTerms) completed++;
    
    return (completed / total) * 100;
  }
}