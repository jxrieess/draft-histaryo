// // src/app/pages/onboarding/onboarding.page.ts
// import { Component, ViewChild } from '@angular/core';
// import { Router } from '@angular/router';
// import SwiperCore, { SwiperOptions, Pagination } from 'swiper';
// import { SwiperComponent } from 'swiper/angular';

// SwiperCore.use([Pagination]);

// @Component({
//   selector: 'app-onboarding',
//   templateUrl: './onboarding.page.html',
//   styleUrls: ['./onboarding.page.scss'],
//   standalone: false
// })
// export class OnboardingPage {
//   @ViewChild('swiperRef', { static: false }) swiperRef!: SwiperComponent;

//   slideOpts: SwiperOptions = {
//     pagination: { clickable: true },
//     spaceBetween: 50,
//     loop: false,
//   };

//   constructor(private router: Router) {}

//   onSlideChange(swiper: any) {
//     // Optional: auto-go-home on last slide
//     if (swiper.activeIndex === 2) {
//       localStorage.setItem('hasSeenOnboarding', 'true');
//       setTimeout(() => this.router.navigate(['/home']), 500);
//     }
//   }

//   skip() {
//     localStorage.setItem('hasSeenOnboarding', 'true');
//     this.router.navigate(['/home']);
//   }
// }

// src/app/pages/onboarding/onboarding.page.ts
import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import SwiperCore, { SwiperOptions, Pagination } from 'swiper';
import { SwiperComponent } from 'swiper/angular';

SwiperCore.use([Pagination]);

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: false
})
export class OnboardingPage {
  @ViewChild('swiperRef', { static: false }) swiperRef!: SwiperComponent;

  slideOpts: SwiperOptions = {
    pagination: { clickable: true },
    spaceBetween: 50,
    loop: false,
  };

  constructor(private router: Router) {}

  onSlideChange(swiper: any) {
    // Auto-finish when reaching 3rd slide (index 2)
    if (swiper.activeIndex === 2) this.finishOnboarding();
  }

  skip() {
    this.finishOnboarding();
  }

  private finishOnboarding() {
    localStorage.setItem('hasSeenOnboarding', 'true');

    const target = localStorage.getItem('onboardingTarget') || 'login';
    localStorage.removeItem('onboardingTarget');

    const path = target === 'home' ? '/home' : '/login';
    this.router.navigateByUrl(path, { replaceUrl: true });
  }
}

