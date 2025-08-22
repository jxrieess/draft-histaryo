import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { SwiperComponent } from 'swiper/angular';
import SwiperCore, { Pagination, Navigation } from 'swiper';

SwiperCore.use([Pagination, Navigation]);

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: false
})
export class OnboardingPage implements AfterViewInit {
  @ViewChild('swiperRef', { static: false }) swiperRef!: SwiperComponent;

  currentSlideIndex = 0;
  totalSlides = 3;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    if (this.swiperRef && this.swiperRef.swiperRef) {
      this.swiperRef.swiperRef.on('slideChange', () => {
        this.currentSlideIndex = this.swiperRef.swiperRef.activeIndex;
      });
    }
  }

  onSlideChange(event: any): void {
    if (event && event.activeIndex !== undefined) {
      this.currentSlideIndex = event.activeIndex;
      
      if (this.currentSlideIndex === this.totalSlides - 1) {
        setTimeout(() => {
          this.finishOnboarding();
        }, 2000);
      }
    }
  }

  skip(): void {
    this.finishOnboarding();
  }

  nextSlide(): void {
    if (this.swiperRef && this.swiperRef.swiperRef) {
      this.swiperRef.swiperRef.slideNext();
    }
  }

  previousSlide(): void {
    if (this.swiperRef && this.swiperRef.swiperRef) {
      this.swiperRef.swiperRef.slidePrev();
    }
  }

  goToSlide(index: number): void {
    if (this.swiperRef && this.swiperRef.swiperRef) {
      this.swiperRef.swiperRef.slideTo(index);
    }
  }

  private finishOnboarding(): void {
    localStorage.setItem('hasSeenOnboarding', 'true');

    const target = localStorage.getItem('onboardingTarget') || 'home';
    localStorage.removeItem('onboardingTarget');

    if (target === 'home') {
      this.router.navigateByUrl('/home', { replaceUrl: true });
    } else if (target === 'login') {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } else {
      this.router.navigateByUrl('/home', { replaceUrl: true });
    }
  }

  goToLogin(): void {
    localStorage.setItem('hasSeenOnboarding', 'true');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  goToRegister(): void {
    localStorage.setItem('hasSeenOnboarding', 'true');
    this.router.navigateByUrl('/register', { replaceUrl: true });
  }

  continueToApp(): void {
    this.finishOnboarding();
  }

  get isLastSlide(): boolean {
    return this.currentSlideIndex === this.totalSlides - 1;
  }

  get isFirstSlide(): boolean {
    return this.currentSlideIndex === 0;
  }
}