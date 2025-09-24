import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, AlertController, ToastController, AnimationController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';

  isSubmitting: boolean = false;
  showPassword: boolean = false;
  rememberMe: boolean = false;
  emailFocused: boolean = false;
  passwordFocused: boolean = false;

  formErrors: any = {
    email: '',
    password: '',
    general: ''
  };

  private animationElements: any = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastController: ToastController,
    private animationCtrl: AnimationController
  ) {}

  ngOnInit() {
    this.checkAuthStatus();
    this.loadRememberedCredentials();
    this.initializeAnimations();
  }

  private initializeAnimations() {
    setTimeout(() => {
      const authContainer = document.querySelector('.auth-container');
      if (authContainer) {
        const animation = this.animationCtrl.create()
          .addElement(authContainer)
          .duration(800)
          .easing('cubic-bezier(0.4, 0, 0.2, 1)')
          .fromTo('opacity', '0', '1')
          .fromTo('transform', 'translateY(50px) scale(0.9)', 'translateY(0) scale(1)');
        
        animation.play();
      }
    }, 100);
  }

  private async checkAuthStatus() {
    try {
      const isAuthenticated = await this.authService.isAuthenticated();
      if (isAuthenticated) {
        await this.showSuccessMessage('Already signed in! Redirecting...');
        setTimeout(() => {
          this.router.navigate(['/home'], { replaceUrl: true });
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  }

  private loadRememberedCredentials() {
    const rememberedEmail = localStorage.getItem('histaryo_remembered_email');
    const rememberMeStatus = localStorage.getItem('histaryo_remember_me');
    
    if (rememberedEmail && rememberMeStatus === 'true') {
      this.email = rememberedEmail;
      this.rememberMe = true;
    }
  }

  async login() {
    if (!this.validateForm()) {
      this.shakeForm();
      return;
    }

    this.isSubmitting = true;
    const loading = await this.loadingController.create({
      message: 'Exploring your heritage journey...',
      spinner: 'crescent',
      cssClass: 'heritage-loading'
    });
    await loading.present();

    try {
      const result = await this.authService.signIn(
        this.email.trim().toLowerCase(),
        this.password
      );

      if (result.success) {
        this.handleRememberMe();
        
        await loading.dismiss();
        await this.showSuccessMessage('Welcome back to your heritage journey!');
        
        await this.animateOutAndNavigate('/home');
      } else {
        await loading.dismiss();
        this.formErrors.general = result.error || 'Login failed. Please check your credentials and try again.';
        await this.showErrorAlert(this.formErrors.general);
        this.shakeForm();
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Login error:', error);
      
      const errorMessage = this.getErrorMessage(error);
      this.formErrors.general = errorMessage;
      await this.showErrorAlert(errorMessage);
      this.shakeForm();
    } finally {
      this.isSubmitting = false;
    }
  }

  private validateForm(): boolean {
    this.clearErrors();
    let isValid = true;

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!this.email) {
      this.formErrors.email = 'Email address is required';
      isValid = false;
    } else if (!emailRegex.test(this.email)) {
      this.formErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!this.password) {
      this.formErrors.password = 'Password is required';
      isValid = false;
    } else if (this.password.length < 6) {
      this.formErrors.password = 'Password must be at least 6 characters long';
      isValid = false;
    }

    return isValid;
  }

  private shakeForm() {
    const formElement = document.querySelector('.auth-form');
    if (formElement) {
      const animation = this.animationCtrl.create()
        .addElement(formElement)
        .duration(600)
        .iterations(1)
        .keyframes([
          { offset: 0, transform: 'translateX(0px)' },
          { offset: 0.1, transform: 'translateX(-10px)' },
          { offset: 0.2, transform: 'translateX(10px)' },
          { offset: 0.3, transform: 'translateX(-10px)' },
          { offset: 0.4, transform: 'translateX(10px)' },
          { offset: 0.5, transform: 'translateX(-5px)' },
          { offset: 0.6, transform: 'translateX(5px)' },
          { offset: 1, transform: 'translateX(0px)' }
        ]);
      
      animation.play();
    }
  }

  private async animateOutAndNavigate(route: string) {
    const authContainer = document.querySelector('.auth-container');
    if (authContainer) {
      const animation = this.animationCtrl.create()
        .addElement(authContainer)
        .duration(600)
        .easing('cubic-bezier(0.4, 0, 0.2, 1)')
        .fromTo('opacity', '1', '0')
        .fromTo('transform', 'translateY(0) scale(1)', 'translateY(-30px) scale(1.05)');
      
      await animation.play();
    }
    
    this.router.navigate([route], { replaceUrl: true });
  }

  private clearErrors() {
    this.formErrors = {
      email: '',
      password: '',
      general: ''
    };
  }

  private handleRememberMe() {
    if (this.rememberMe) {
      localStorage.setItem('histaryo_remembered_email', this.email);
      localStorage.setItem('histaryo_remember_me', 'true');
    } else {
      localStorage.removeItem('histaryo_remembered_email');
      localStorage.removeItem('histaryo_remember_me');
    }
  }

  private getErrorMessage(error: any): string {
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'No account found with this email address. Please check your email or create a new account.',
      'auth/wrong-password': 'Incorrect password. Please try again or use the "Forgot Password" option.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/too-many-requests': 'Too many failed attempts. Please wait a moment before trying again.',
      'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
      'auth/invalid-credential': 'Invalid email or password. Please check your credentials and try again.'
    };

    if (error.code && errorMessages[error.code]) {
      return errorMessages[error.code];
    }

    return error.message || 'Login failed. Please try again.';
  }

  private async showSuccessMessage(message: string = 'Welcome back to your heritage journey!') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: 'success',
      icon: 'checkmark-circle',
      cssClass: 'heritage-success-toast',
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
      header: 'Authentication Failed',
      message: message,
      buttons: [
        {
          text: 'Try Again',
          role: 'cancel',
          cssClass: 'heritage-alert-button'
        }
      ],
      cssClass: 'heritage-error-alert'
    });
    await alert.present();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    
    const toggleButton = document.querySelector('.password-toggle');
    if (toggleButton) {
      const animation = this.animationCtrl.create()
        .addElement(toggleButton)
        .duration(200)
        .easing('ease-in-out')
        .keyframes([
          { offset: 0, transform: 'scale(1)' },
          { offset: 0.5, transform: 'scale(1.2)' },
          { offset: 1, transform: 'scale(1)' }
        ]);
      
      animation.play();
    }
  }

  onInputFocus(fieldName: string) {
    if (this.formErrors[fieldName]) {
      this.formErrors[fieldName] = '';
    }
    if (this.formErrors.general) {
      this.formErrors.general = '';
    }

    this.animateInputFocus(fieldName, true);
  }

  onInputBlur(fieldName: string) {
    this.animateInputFocus(fieldName, false);

    switch (fieldName) {
      case 'email':
        if (this.email) {
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          if (!emailRegex.test(this.email)) {
            this.formErrors.email = 'Please enter a valid email address';
          }
        }
        break;
      case 'password':
        if (this.password && this.password.length < 6) {
          this.formErrors.password = 'Password must be at least 6 characters';
        }
        break;
    }
  }

  private animateInputFocus(fieldName: string, focused: boolean) {
    const inputElement = document.querySelector(`.form-group:has([name="${fieldName}"]) .custom-input`);
    if (inputElement) {
      const animation = this.animationCtrl.create()
        .addElement(inputElement)
        .duration(300)
        .easing('cubic-bezier(0.4, 0, 0.2, 1)');

      if (focused) {
        animation.fromTo('transform', 'translateY(0)', 'translateY(-2px)')
                 .fromTo('box-shadow', '0 4px 20px rgba(27, 54, 93, 0.1)', '0 0 30px rgba(212, 175, 55, 0.3)');
      } else {
        animation.fromTo('transform', 'translateY(-2px)', 'translateY(0)')
                 .fromTo('box-shadow', '0 0 30px rgba(212, 175, 55, 0.3)', '0 4px 20px rgba(27, 54, 93, 0.1)');
      }

      animation.play();
    }
  }

  navigateToRegister() {
    this.animateOutAndNavigate('/register');
  }

  async forgotPassword() {
    if (!this.email) {
      const alert = await this.alertController.create({
        header: 'Email Required',
        message: 'Please enter your email address first, then tap "Forgot Password" to receive reset instructions.',
        buttons: [
          {
            text: 'OK',
            cssClass: 'heritage-alert-button'
          }
        ],
        cssClass: 'heritage-info-alert'
      });
      await alert.present();
      
      setTimeout(() => {
        const emailInput = document.querySelector('ion-input[name="email"]');
        if (emailInput) {
          (emailInput as any).setFocus();
        }
      }, 500);
      return;
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(this.email)) {
      const alert = await this.alertController.create({
        header: 'Invalid Email',
        message: 'Please enter a valid email address to receive password reset instructions.',
        buttons: [
          {
            text: 'OK',
            cssClass: 'heritage-alert-button'
          }
        ],
        cssClass: 'heritage-error-alert'
      });
      await alert.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Reset Your Password',
      message: `We'll send password reset instructions to:<br><strong>${this.email}</strong><br><br>Check your email (including spam folder) for the reset link.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'heritage-alert-button-secondary'
        },
        {
          text: 'Send Instructions',
          cssClass: 'heritage-alert-button',
          handler: async () => {
            try {
              const loading = await this.loadingController.create({
                message: 'Sending reset instructions...',
                spinner: 'crescent',
                cssClass: 'heritage-loading'
              });
              await loading.present();

              const result = await this.authService.resetPassword(this.email);
              await loading.dismiss();

              if (result.success) {
                const successAlert = await this.alertController.create({
                  header: 'Instructions Sent!',
                  message: 'Password reset instructions have been sent to your email. Please check your inbox (and spam folder) for the reset link.',
                  buttons: [
                    {
                      text: 'OK',
                      cssClass: 'heritage-alert-button'
                    }
                  ],
                  cssClass: 'heritage-success-alert'
                });
                await successAlert.present();
              } else {
                throw new Error(result.error);
              }
            } catch (error: any) {
              const errorAlert = await this.alertController.create({
                header: 'Reset Failed',
                message: error.message || 'Failed to send reset instructions. Please try again or contact support.',
                buttons: [
                  {
                    text: 'OK',
                    cssClass: 'heritage-alert-button'
                  }
                ],
                cssClass: 'heritage-error-alert'
              });
              await errorAlert.present();
            }
          }
        }
      ],
      cssClass: 'heritage-confirm-alert'
    });
    await alert.present();
  }

  async signInWithGoogle() {
    if (this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      const result = await this.authService.signInWithGoogle();
      
      if (result.success) {
        await this.showSuccessMessage('Successfully signed in with Google!');
        await this.animateOutAndNavigate('/home');
      } else {
        await this.showErrorAlert('Google sign-in failed. Please try again or use email/password.');
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      await this.showErrorAlert('Google sign-in encountered an error. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  async signInWithFacebook() {
    if (this.isSubmitting) return;

    try {
      this.isSubmitting = true;
      const result = await this.authService.signInWithFacebook();
      
      if (result.success) {
        await this.showSuccessMessage('Successfully signed in with Facebook!');
        await this.animateOutAndNavigate('/home');
      } else {
        await this.showErrorAlert('Facebook sign-in failed. Please try again or use email/password.');
      }
    } catch (error: any) {
      console.error('Facebook sign-in error:', error);
      await this.showErrorAlert('Facebook sign-in encountered an error. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.login();
    }
  }

  async continueAsGuest() {
    const alert = await this.alertController.create({
      header: 'Continue as Guest',
      message: 'Explore HistARyo with limited features. You can create an account later to save your progress and unlock all features.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'heritage-alert-button-secondary'
        },
        {
          text: 'Continue as Guest',
          cssClass: 'heritage-alert-button',
          handler: () => {
            this.router.navigate(['/home'], { 
              replaceUrl: true,
              queryParams: { mode: 'guest' }
            });
          }
        }
      ],
      cssClass: 'heritage-confirm-alert'
    });
    await alert.present();
  }
}