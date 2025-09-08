// import { Component, ViewChild, AfterViewInit } from '@angular/core';
// import { Router } from '@angular/router';
// import { SwiperComponent } from 'swiper/angular';
// import SwiperCore, { Pagination, Navigation } from 'swiper';

// SwiperCore.use([Pagination, Navigation]);

// @Component({
//   selector: 'app-onboarding',
//   templateUrl: './onboarding.page.html',
//   styleUrls: ['./onboarding.page.scss'],
//   standalone: false
// })
// export class OnboardingPage implements AfterViewInit {
//   @ViewChild('swiperRef', { static: false }) swiperRef!: SwiperComponent;

//   currentSlideIndex = 0;
//   totalSlides = 3;

//   constructor(private router: Router) {}

//   ngAfterViewInit(): void {
//     if (this.swiperRef && this.swiperRef.swiperRef) {
//       this.swiperRef.swiperRef.on('slideChange', () => {
//         this.currentSlideIndex = this.swiperRef.swiperRef.activeIndex;
//       });
//     }
//   }

//   onSlideChange(event: any): void {
//     if (event && event.activeIndex !== undefined) {
//       this.currentSlideIndex = event.activeIndex;
      
//       if (this.currentSlideIndex === this.totalSlides - 1) {
//         setTimeout(() => {
//           this.finishOnboarding();
//         }, 2000);
//       }
//     }
//   }

//   skip(): void {
//     this.finishOnboarding();
//   }

//   nextSlide(): void {
//     if (this.swiperRef && this.swiperRef.swiperRef) {
//       this.swiperRef.swiperRef.slideNext();
//     }
//   }

//   previousSlide(): void {
//     if (this.swiperRef && this.swiperRef.swiperRef) {
//       this.swiperRef.swiperRef.slidePrev();
//     }
//   }

//   goToSlide(index: number): void {
//     if (this.swiperRef && this.swiperRef.swiperRef) {
//       this.swiperRef.swiperRef.slideTo(index);
//     }
//   }

//   private finishOnboarding(): void {
//     localStorage.setItem('hasSeenOnboarding', 'true');

//     const target = localStorage.getItem('onboardingTarget') || 'home';
//     localStorage.removeItem('onboardingTarget');

//     if (target === 'home') {
//       this.router.navigateByUrl('/home', { replaceUrl: true });
//     } else if (target === 'login') {
//       this.router.navigateByUrl('/login', { replaceUrl: true });
//     } else {
//       this.router.navigateByUrl('/home', { replaceUrl: true });
//     }
//   }

//   goToLogin(): void {
//     localStorage.setItem('hasSeenOnboarding', 'true');
//     this.router.navigateByUrl('/login', { replaceUrl: true });
//   }

//   goToRegister(): void {
//     localStorage.setItem('hasSeenOnboarding', 'true');
//     this.router.navigateByUrl('/register', { replaceUrl: true });
//   }

//   continueToApp(): void {
//     this.finishOnboarding();
//   }

//   get isLastSlide(): boolean {
//     return this.currentSlideIndex === this.totalSlides - 1;
//   }

//   get isFirstSlide(): boolean {
//     return this.currentSlideIndex === 0;
//   }
// }




import { Component, ViewChild, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { SwiperComponent } from 'swiper/angular';
import SwiperCore, { Pagination, Navigation, Autoplay } from 'swiper';
import { Subscription } from 'rxjs';

// Configure Swiper modules
SwiperCore.use([Pagination, Navigation, Autoplay]);

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: false
})
export class OnboardingPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('swiperRef', { static: false }) swiperRef!: SwiperComponent;

  // Slide management
  currentSlideIndex = 0;
  totalSlides = 3;
  
  // Component state
  isInitialized = false;
  isDestroyed = false;
  
  // Subscriptions
  private subscriptions = new Subscription();
  
  // Platform detection
  isMobile = false;

  constructor(
    private router: Router,
    private platform: Platform
  ) {
    this.isMobile = this.platform.is('mobile');
  }

  ngOnInit(): void {
    // Check if user has already seen onboarding
    this.checkOnboardingStatus();
    
    // Set up platform-specific configurations
    this.setupPlatformConfig();
  }

  ngAfterViewInit(): void {
    // Small delay to ensure Swiper is fully initialized
    setTimeout(() => {
      this.initializeSwiper();
    }, 100);
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.subscriptions.unsubscribe();
    
    // Clean up swiper listeners
    if (this.swiperRef?.swiperRef) {
      this.swiperRef.swiperRef.off('slideChange');
    }
  }

  /**
   * Check if user has already seen onboarding
   */
  private checkOnboardingStatus(): void {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding === 'true') {
      // User has seen onboarding before, redirect appropriately
      const target = localStorage.getItem('onboardingTarget') || 'home';
      this.redirectToTarget(target);
    }
  }

  /**
   * Setup platform-specific configurations
   */
  private setupPlatformConfig(): void {
    // Disable certain features on older devices or specific platforms
    if (this.platform.is('ios') && this.platform.is('mobile')) {
      // iOS specific configurations
    } else if (this.platform.is('android')) {
      // Android specific configurations
    }
  }

  /**
   * Initialize Swiper after view init
   */
  private initializeSwiper(): void {
    if (this.swiperRef?.swiperRef && !this.isDestroyed) {
      // Add slide change listener
      this.swiperRef.swiperRef.on('slideChange', () => {
        if (!this.isDestroyed) {
          this.currentSlideIndex = this.swiperRef.swiperRef.activeIndex;
          this.onSlideChanged();
        }
      });

      // Add touch events for better mobile experience
      if (this.isMobile) {
        this.swiperRef.swiperRef.on('touchStart', () => {
          // Haptic feedback on touch start (if available)
          this.provideFeedback();
        });
      }

      this.isInitialized = true;
    }
  }

  /**
   * Handle slide change events
   */
  onSlideChange(event: any): void {
    if (event?.activeIndex !== undefined) {
      this.currentSlideIndex = event.activeIndex;
      this.onSlideChanged();
    }
  }

  /**
   * Called when slide changes
   */
  private onSlideChanged(): void {
    // Log analytics event
    this.logSlideView(this.currentSlideIndex);
    
    // Provide haptic feedback
    this.provideFeedback();
  }

  /**
   * Navigate to next slide
   */
  nextSlide(): void {
    console.log('nextSlide() called'); // Debug log
    
    if (this.swiperRef?.swiperRef && this.isInitialized) {
      this.swiperRef.swiperRef.slideNext();
      this.provideFeedback();
    } else {
      console.warn('Swiper not initialized, manually advancing slide');
      this.currentSlideIndex = Math.min(this.currentSlideIndex + 1, this.totalSlides - 1);
    }
  }

  /**
   * Navigate to previous slide
   */
  previousSlide(): void {
    console.log('previousSlide() called'); // Debug log
    
    if (this.swiperRef?.swiperRef && this.isInitialized) {
      this.swiperRef.swiperRef.slidePrev();
      this.provideFeedback();
    } else {
      console.warn('Swiper not initialized, manually going back');
      this.currentSlideIndex = Math.max(this.currentSlideIndex - 1, 0);
    }
  }

  /**
   * Navigate to specific slide
   */
  goToSlide(index: number): void {
    console.log(`goToSlide(${index}) called`); // Debug log
    
    if (index < 0 || index >= this.totalSlides) {
      console.warn('Invalid slide index:', index);
      return;
    }

    if (this.swiperRef?.swiperRef && this.isInitialized) {
      this.swiperRef.swiperRef.slideTo(index);
      this.provideFeedback();
    } else {
      this.currentSlideIndex = index;
    }
  }

  /**
   * Skip onboarding and go to main app
   */
  skip(): void {
    console.log('skip() called'); // Debug log
    this.logOnboardingSkipped(this.currentSlideIndex);
    this.finishOnboarding();
  }

  /**
   * Continue to main app from final slide
   */
  continueToApp(): void {
    console.log('continueToApp() called'); // Debug log
    this.logOnboardingCompleted();
    this.finishOnboarding();
  }

  /**
   * Navigate to login page
   */
  goToLogin(): void {
    console.log('goToLogin() called - DEBUG');
    
    try {
      // Mark onboarding as complete
      localStorage.setItem('hasSeenOnboarding', 'true');
      this.logNavigationEvent('login');
      
      this.router.navigate(['/login']).then(success => {
        if (success) {
          console.log('Navigation to login successful');
        } else {
          console.error('Navigation to login failed');
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      }).catch(error => {
        console.error('Login navigation error:', error);
        this.router.navigateByUrl('/login', { replaceUrl: true });
      });
    } catch (error) {
      console.error('Error in goToLogin():', error);
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  /**
   * Navigate to registration page
   */
  goToRegister(): void {
    console.log('goToRegister() called - DEBUG');
    
    try {
      // Mark onboarding as complete for first-time users
      localStorage.setItem('hasSeenOnboarding', 'true');
      this.logNavigationEvent('register');
      
      this.router.navigate(['/register']).then(success => {
        if (success) {
          console.log('Navigation to register successful');
        } else {
          console.error('Navigation to register failed');
          this.router.navigateByUrl('/register', { replaceUrl: true });
        }
      }).catch(error => {
        console.error('Register navigation error:', error);
        this.router.navigateByUrl('/register', { replaceUrl: true });
      });
    } catch (error) {
      console.error('Error in goToRegister():', error);
      this.router.navigateByUrl('/register', { replaceUrl: true });
    }
  }

  /**
   * Test button click for debugging
   */
  testButtonClick(): void {
    alert('Button is clickable!');
    console.log('Test button clicked successfully');
  }

  /**
   * Finish onboarding and redirect
   */
  private finishOnboarding(): void {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
      
      const target = localStorage.getItem('onboardingTarget') || 'home';
      localStorage.removeItem('onboardingTarget');
      
      this.redirectToTarget(target);
    } catch (error) {
      console.error('Error finishing onboarding:', error);
      // Fallback to home page
      this.router.navigateByUrl('/home', { replaceUrl: true });
    }
  }

  /**
   * Redirect to target page
   */
  private redirectToTarget(target: string): void {
    const targetMap: { [key: string]: string } = {
      'home': '/home',
      'login': '/login',
      'register': '/register',
      'explore': '/explore'
    };

    const route = targetMap[target] || '/home';
    
    this.router.navigateByUrl(route, { replaceUrl: true }).catch(error => {
      console.error('Redirect error:', error);
      // Ultimate fallback
      window.location.href = route;
    });
  }

  /**
   * Provide haptic feedback if available
   */
  private provideFeedback(): void {
    try {
      // Check if device supports haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10); // Short vibration
      }
    } catch (error) {
      // Haptic feedback not available, continue silently
    }
  }

  /**
   * Log slide view for analytics
   */
  private logSlideView(slideIndex: number): void {
    console.log(`Onboarding slide viewed: ${slideIndex + 1}/${this.totalSlides}`);
    
    // Here you could send analytics events to your service
    // Example: this.analytics.logEvent('onboarding_slide_view', { slide: slideIndex });
  }

  /**
   * Log onboarding completion
   */
  private logOnboardingCompleted(): void {
    console.log('Onboarding completed successfully');
    
    // Analytics event for completed onboarding
    // Example: this.analytics.logEvent('onboarding_completed');
  }

  /**
   * Log onboarding skip
   */
  private logOnboardingSkipped(atSlide: number): void {
    console.log(`Onboarding skipped at slide: ${atSlide + 1}/${this.totalSlides}`);
    
    // Analytics event for skipped onboarding
    // Example: this.analytics.logEvent('onboarding_skipped', { at_slide: atSlide });
  }

  /**
   * Log navigation events
   */
  private logNavigationEvent(destination: string): void {
    console.log(`Navigation to ${destination} from onboarding`);
    
    // Analytics event for navigation
    // Example: this.analytics.logEvent('onboarding_navigation', { destination });
  }

  /**
   * Handle swiper initialization error
   */
  onSwiperInitError(error: any): void {
    console.error('Swiper initialization error:', error);
    
    // Fallback: show all slides as a simple list
    this.handleSwiperFallback();
  }

  /**
   * Handle swiper fallback when initialization fails
   */
  private handleSwiperFallback(): void {
    console.log('Falling back to simple slide navigation');
    // You could implement a simple slide-by-slide navigation here
  }

  /**
   * Check if current slide is the last one
   */
  get isLastSlide(): boolean {
    return this.currentSlideIndex === this.totalSlides - 1;
  }

  /**
   * Check if current slide is the first one
   */
  get isFirstSlide(): boolean {
    return this.currentSlideIndex === 0;
  }

  /**
   * Get current slide progress percentage
   */
  get progressPercentage(): number {
    return ((this.currentSlideIndex + 1) / this.totalSlides) * 100;
  }

  /**
   * Get slide title for accessibility
   */
  getSlideTitle(index: number): string {
    const titles = [
      'Welcome to HistARyo',
      'How it Works',
      'Get Started'
    ];
    return titles[index] || `Slide ${index + 1}`;
  }

  /**
   * Handle keyboard navigation
   */
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        if (!this.isFirstSlide) {
          this.previousSlide();
        }
        break;
      case 'ArrowRight':
        if (!this.isLastSlide) {
          this.nextSlide();
        }
        break;
      case 'Escape':
        this.skip();
        break;
      case 'Enter':
      case ' ':
        if (this.isLastSlide) {
          this.continueToApp();
        } else {
          this.nextSlide();
        }
        break;
    }
  }

  /**
   * Handle visibility change (user switches tabs/apps)
   */
  onVisibilityChange(): void {
    if (document.hidden) {
      // Pause any animations or auto-advance
      console.log('Onboarding paused - tab not visible');
    } else {
      // Resume animations
      console.log('Onboarding resumed - tab visible');
    }
  }

  /**
   * Reset onboarding (for testing purposes)
   */
  resetOnboarding(): void {
    localStorage.removeItem('hasSeenOnboarding');
    this.currentSlideIndex = 0;
    this.goToSlide(0);
    console.log('Onboarding reset');
  }
}