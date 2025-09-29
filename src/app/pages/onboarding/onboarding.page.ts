import { Component, ViewChild, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { SwiperComponent } from 'swiper/angular';
import SwiperCore, { Pagination, Navigation, Autoplay } from 'swiper';
import { Subscription } from 'rxjs';

SwiperCore.use([Pagination, Navigation, Autoplay]);

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: false
})
export class OnboardingPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('swiperRef', { static: false }) swiperRef!: SwiperComponent;

  currentSlideIndex = 0;
  totalSlides = 3;

  isInitialized = false;
  isDestroyed = false;

  private subscriptions = new Subscription();

  isMobile = false;

  constructor(
    private router: Router,
    private platform: Platform
  ) {
    this.isMobile = this.platform.is('mobile');
  }

  ngOnInit(): void {
    this.checkOnboardingStatus();
    
    this.setupPlatformConfig();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeSwiper();
    }, 100);
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.subscriptions.unsubscribe();
    
    if (this.swiperRef?.swiperRef) {
      this.swiperRef.swiperRef.off('slideChange');
    }
  }

  private checkOnboardingStatus(): void {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding === 'true') {
      const target = localStorage.getItem('onboardingTarget') || 'home';
      this.redirectToTarget(target);
    }
  }

  private setupPlatformConfig(): void {
    if (this.platform.is('ios') && this.platform.is('mobile')) {
    } else if (this.platform.is('android')) {
    }
  }

  private initializeSwiper(): void {
    if (this.swiperRef?.swiperRef && !this.isDestroyed) {
      this.swiperRef.swiperRef.on('slideChange', () => {
        if (!this.isDestroyed) {
          this.currentSlideIndex = this.swiperRef.swiperRef.activeIndex;
          this.onSlideChanged();
        }
      });

      if (this.isMobile) {
        this.swiperRef.swiperRef.on('touchStart', () => {
          this.provideFeedback();
        });
      }

      this.isInitialized = true;
    }
  }

  onSlideChange(event: any): void {
    if (event?.activeIndex !== undefined) {
      this.currentSlideIndex = event.activeIndex;
      this.onSlideChanged();
    }
  }

  private onSlideChanged(): void {
    this.logSlideView(this.currentSlideIndex);
    this.provideFeedback();
  }

  nextSlide(): void {
    console.log('nextSlide() called'); 
    
    if (this.swiperRef?.swiperRef && this.isInitialized) {
      this.swiperRef.swiperRef.slideNext();
      this.provideFeedback();
    } else {
      console.warn('Swiper not initialized, manually advancing slide');
      this.currentSlideIndex = Math.min(this.currentSlideIndex + 1, this.totalSlides - 1);
    }
  }

  previousSlide(): void {
    console.log('previousSlide() called'); 
    
    if (this.swiperRef?.swiperRef && this.isInitialized) {
      this.swiperRef.swiperRef.slidePrev();
      this.provideFeedback();
    } else {
      console.warn('Swiper not initialized, manually going back');
      this.currentSlideIndex = Math.max(this.currentSlideIndex - 1, 0);
    }
  }

  goToSlide(index: number): void {
    console.log(`goToSlide(${index}) called`); 
    
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

  skip(): void {
    console.log('skip() called'); 
    this.logOnboardingSkipped(this.currentSlideIndex);
    this.finishOnboarding();
  }

  continueToApp(): void {
    console.log('continueToApp() called');
    this.logOnboardingCompleted();
    this.finishOnboarding();
  }

  goToLogin(): void {
    console.log('goToLogin() called - DEBUG');
    
    try {
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

  goToRegister(): void {
    console.log('goToRegister() called - DEBUG');
    
    try {
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

  testButtonClick(): void {
    alert('Button is clickable!');
    console.log('Test button clicked successfully');
  }

  private finishOnboarding(): void {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
      
      const target = localStorage.getItem('onboardingTarget') || 'home';
      localStorage.removeItem('onboardingTarget');
      
      this.redirectToTarget(target);
    } catch (error) {
      console.error('Error finishing onboarding:', error);
      this.router.navigateByUrl('/home', { replaceUrl: true });
    }
  }

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
      window.location.href = route;
    });
  }

  private provideFeedback(): void {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(10); 
      }
    } catch (error) {
    }
  }

  private logSlideView(slideIndex: number): void {
    console.log(`Onboarding slide viewed: ${slideIndex + 1}/${this.totalSlides}`);
  }

  private logOnboardingCompleted(): void {
    console.log('Onboarding completed successfully');
  }

  private logOnboardingSkipped(atSlide: number): void {
    console.log(`Onboarding skipped at slide: ${atSlide + 1}/${this.totalSlides}`);
  }

  private logNavigationEvent(destination: string): void {
    console.log(`Navigation to ${destination} from onboarding`);
  }

  onSwiperInitError(error: any): void {
    console.error('Swiper initialization error:', error);
    this.handleSwiperFallback();
  }

  private handleSwiperFallback(): void {
    console.log('Falling back to simple slide navigation');
  }

  get isLastSlide(): boolean {
    return this.currentSlideIndex === this.totalSlides - 1;
  }

  get isFirstSlide(): boolean {
    return this.currentSlideIndex === 0;
  }

  get progressPercentage(): number {
    return ((this.currentSlideIndex + 1) / this.totalSlides) * 100;
  }

  getSlideTitle(index: number): string {
    const titles = [
      'Welcome to HistARyo',
      'How it Works',
      'Get Started'
    ];
    return titles[index] || `Slide ${index + 1}`;
  }

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

  onVisibilityChange(): void {
    if (document.hidden) {
      console.log('Onboarding paused - tab not visible');
    } else {
      console.log('Onboarding resumed - tab visible');
    }
  }

  resetOnboarding(): void {
    localStorage.removeItem('hasSeenOnboarding');
    this.currentSlideIndex = 0;
    this.goToSlide(0);
    console.log('Onboarding reset');
  }
}