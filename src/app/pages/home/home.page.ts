// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { Router } from '@angular/router';
// import { NavController, ToastController, AlertController } from '@ionic/angular';
// import { Subscription } from 'rxjs';

// // Interface definitions
// interface Landmark {
//   id: string;
//   name: string;
//   description: string;
//   imageUrl?: string;
//   city?: string;
//   difficulty?: 'easy' | 'medium' | 'hard';
//   arContent?: boolean;
//   scavengerHunt?: boolean;
//   estimatedTime?: number; // in minutes
//   tags?: string[];
//   category?: string;
//   latitude?: number;
//   longitude?: number;
// }

// @Component({
//   selector: 'app-home',
//   templateUrl: './home.page.html',
//   styleUrls: ['./home.page.scss'],
//   standalone: false
// })
// export class HomePage implements OnInit, OnDestroy {
  
//   // Component properties
//   loading = false;
//   error = '';
//   totalLandmarks = 4;
//   featuredLandmarks: Landmark[] = [];
//   nearbyLandmarks: Landmark[] = [];
//   userLocation: any = null;
//   unreadNotifications = 0;
//   fabActivated = false;
  
//   private subscriptions: Subscription[] = [];

//   constructor(
//     private router: Router,
//     private navCtrl: NavController,
//     private toastCtrl: ToastController,
//     private alertCtrl: AlertController
//   ) {}

//   ngOnInit() {
//     this.loadContent();
//     this.checkUserLocation();
//     this.loadNotifications();
//   }

//   ngOnDestroy() {
//     this.subscriptions.forEach(sub => sub.unsubscribe());
//   }

//   // Content loading methods
//   async loadContent() {
//     this.loading = true;
//     this.error = '';
    
//     try {
//       // Simulate API calls - replace with actual service calls
//       await Promise.all([
//         this.loadFeaturedLandmarks(),
//         this.loadNearbyLandmarks(),
//         this.loadStats()
//       ]);
//     } catch (error) {
//       this.error = 'Failed to load content. Please try again.';
//       console.error('Content loading error:', error);
//     } finally {
//       this.loading = false;
//     }
//   }

//   private async loadFeaturedLandmarks() {
//     // Mock data - replace with actual service call
//     this.featuredLandmarks = [
//       {
//         id: '1',
//         name: 'Fort San Pedro',
//         description: 'The smallest triangular fort in the Philippines, built by Spanish conquistadors.',
//         imageUrl: 'assets/img/fort-san-pedro.jpg',
//         city: 'Cebu City',
//         difficulty: 'easy',
//         arContent: true,
//         scavengerHunt: false,
//         estimatedTime: 30,
//         tags: ['Spanish Colonial', 'Military History'],
//         category: 'Historical Site'
//       },
//       {
//         id: '2',
//         name: 'Basilica del Santo Niño',
//         description: 'The oldest Roman Catholic church in the Philippines, housing the Santo Niño de Cebu.',
//         imageUrl: 'assets/img/basilica.jpg',
//         city: 'Cebu City',
//         difficulty: 'medium',
//         arContent: true,
//         scavengerHunt: true,
//         estimatedTime: 45,
//         tags: ['Religious', 'Spanish Colonial'],
//         category: 'Religious Site'
//       }
//     ];
//   }

//   private async loadNearbyLandmarks() {
//     // Mock data - replace with actual service call based on user location
//     this.nearbyLandmarks = [
//       {
//         id: '3',
//         name: 'Magellan\'s Cross',
//         description: 'Historic cross planted by Ferdinand Magellan in 1521.',
//         imageUrl: 'assets/img/magellan-cross.jpg',
//         city: 'Cebu City',
//         difficulty: 'easy',
//         arContent: true,
//         estimatedTime: 20,
//         category: 'Historical Marker'
//       },
//       {
//         id: '4',
//         name: 'Heritage Monument',
//         description: 'Sculptures depicting the history of Cebu and the Philippines.',
//         imageUrl: 'assets/img/heritage-monument.jpg',
//         city: 'Cebu City',
//         difficulty: 'medium',
//         arContent: false,
//         estimatedTime: 25,
//         category: 'Monument'
//       }
//     ];
//   }

//   private async loadStats() {
//     // Mock stats - replace with actual service call
//     this.totalLandmarks = 4;
//   }

//   private checkUserLocation() {
//     // Check if geolocation is available and get user location
//     if ('geolocation' in navigator) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           this.userLocation = {
//             latitude: position.coords.latitude,
//             longitude: position.coords.longitude
//           };
//         },
//         (error) => {
//           console.warn('Location access denied:', error);
//         }
//       );
//     }
//   }

//   private loadNotifications() {
//     // Mock notification count - replace with actual service call
//     this.unreadNotifications = 2;
//   }

//   // Navigation methods
//   navigateToScan() {
//     this.navCtrl.navigateForward('/scan');
//   }

//   navigateToMap() {
//     this.navCtrl.navigateForward('/map');
//   }

//   navigateToStampGallery() {
//     this.navCtrl.navigateForward('/stamps');
//   }

//   navigateToProgress() {
//     this.navCtrl.navigateForward('/progress');
//   }

//   navigateToLandmark(landmark: Landmark) {
//     this.navCtrl.navigateForward(`/landmark/${landmark.id}`);
//   }

//   navigateToAllLandmarks() {
//     this.navCtrl.navigateForward('/landmarks');
//   }

//   // Action methods
//   async exploreRandomLandmark() {
//     const allLandmarks = [...this.featuredLandmarks, ...this.nearbyLandmarks];
    
//     if (allLandmarks.length === 0) {
//       await this.showToast('No landmarks available at the moment');
//       return;
//     }

//     const randomIndex = Math.floor(Math.random() * allLandmarks.length);
//     const randomLandmark = allLandmarks[randomIndex];
    
//     const alert = await this.alertCtrl.create({
//       header: 'Surprise Discovery!',
//       subHeader: randomLandmark.name,
//       message: randomLandmark.description,
//       buttons: [
//         {
//           text: 'Maybe Later',
//           role: 'cancel'
//         },
//         {
//           text: 'Let\'s Go!',
//           handler: () => {
//             this.navigateToLandmark(randomLandmark);
//           }
//         }
//       ]
//     });

//     await alert.present();
//   }

//   async openNotifications() {
//     // Navigate to notifications page or show notifications modal
//     this.navCtrl.navigateForward('/notifications');
//   }

//   // Refresh and reload methods
//   async handleRefresh(event: any) {
//     await this.refreshContent();
//     event.target.complete();
//   }

//   async refreshContent() {
//     await this.loadContent();
//     await this.showToast('Content refreshed');
//   }

//   // Utility methods
//   trackByLandmarkId(index: number, landmark: Landmark): string {
//     return landmark.id;
//   }

//   onImageError(event: any) {
//     // Handle image loading errors by setting a default image
//     event.target.src = 'assets/img/default-landmark.jpg';
//   }

//   getShortDescription(description: string, limit: number = 100): string {
//     if (!description) return '';
    
//     if (description.length <= limit) {
//       return description;
//     }
    
//     return description.slice(0, limit).trim() + '...';
//   }

//   getEstimatedTime(landmark: Landmark): string {
//     if (!landmark.estimatedTime) return '';
    
//     const minutes = landmark.estimatedTime;
//     if (minutes < 60) {
//       return `${minutes} min`;
//     } else {
//       const hours = Math.floor(minutes / 60);
//       const remainingMinutes = minutes % 60;
//       return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
//     }
//   }

//   getLandmarkDistance(landmark: Landmark): string {
//     if (!this.userLocation || !landmark.latitude || !landmark.longitude) {
//       return '';
//     }

//     // Calculate distance using Haversine formula (simplified)
//     const distance = this.calculateDistance(
//       this.userLocation.latitude,
//       this.userLocation.longitude,
//       landmark.latitude,
//       landmark.longitude
//     );

//     if (distance < 1) {
//       return `${Math.round(distance * 1000)}m`;
//     } else {
//       return `${distance.toFixed(1)}km`;
//     }
//   }

//   private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
//     const R = 6371; // Radius of Earth in kilometers
//     const dLat = this.deg2rad(lat2 - lat1);
//     const dLon = this.deg2rad(lon2 - lon1);
//     const a = 
//       Math.sin(dLat/2) * Math.sin(dLat/2) +
//       Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
//       Math.sin(dLon/2) * Math.sin(dLon/2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     return R * c;
//   }

//   private deg2rad(deg: number): number {
//     return deg * (Math.PI/180);
//   }

//   getDifficultyColor(difficulty: string): string {
//     switch (difficulty?.toLowerCase()) {
//       case 'easy':
//         return 'success';
//       case 'medium':
//         return 'warning';
//       case 'hard':
//         return 'danger';
//       default:
//         return 'medium';
//     }
//   }

//   getDifficultyIcon(difficulty: string): string {
//     switch (difficulty?.toLowerCase()) {
//       case 'easy':
//         return 'checkmark-circle';
//       case 'medium':
//         return 'alert-circle';
//       case 'hard':
//         return 'warning';
//       default:
//         return 'help-circle';
//     }
//   }

//   hasSpecialFeatures(landmark: Landmark): boolean {
//     return !!(landmark.arContent || landmark.scavengerHunt);
//   }

//   // FAB methods
//   toggleFab() {
//     this.fabActivated = !this.fabActivated;
//   }

//   // Helper methods
//   private async showToast(message: string, color: string = 'primary') {
//     const toast = await this.toastCtrl.create({
//       message,
//       duration: 2000,
//       position: 'bottom',
//       color
//     });
//     await toast.present();
//   }

//   // Mock data getters (for development)
//   get mockFeaturedLandmarks(): Landmark[] {
//     return this.featuredLandmarks.length > 0 ? this.featuredLandmarks : [];
//   }

//   get mockNearbyLandmarks(): Landmark[] {
//     return this.nearbyLandmarks.length > 0 ? this.nearbyLandmarks : [];
//   }
// }





import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { Subscription } from 'rxjs';
import { LandmarkService, Landmark } from '../../services/landmark.service';

// Interface for user session data
interface UserSession {
  uid: string;
  email: string;
  name?: string;
  photoURL?: string;
  visitCount: number;
  stampsCollected: number;
  lastVisit: string;
}

// Interface for user stats
interface UserStats {
  totalVisits: number;
  stampsCollected: number;
  badgesEarned: number;
  completedTrivia: number;
  favoriteLandmarks: string[];
  streakDays: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  
  // User and session data
  userSession: UserSession | null = null;
  userStats: UserStats = {
    totalVisits: 0,
    stampsCollected: 0,
    badgesEarned: 0,
    completedTrivia: 0,
    favoriteLandmarks: [],
    streakDays: 0
  };
  
  // Landmark data
  featuredLandmarks: Landmark[] = [];
  nearbyLandmarks: Landmark[] = [];
  recentlyVisited: Landmark[] = [];
  recommendedLandmarks: Landmark[] = [];
  
  // UI state
  loading = true;
  error = '';
  userLocation: any = null;
  unreadNotifications = 0;
  isRefreshing = false;
  selectedCategory = 'all';
  
  // Available categories
  categories = [
    { value: 'all', label: 'All', icon: 'apps' },
    { value: 'Historical Site', label: 'Historical', icon: 'library' },
    { value: 'Religious Site', label: 'Religious', icon: 'home' },
    { value: 'Monument', label: 'Monuments', icon: 'trophy' },
    { value: 'Cultural', label: 'Cultural', icon: 'color-palette' },
    { value: 'Natural', label: 'Natural', icon: 'leaf' }
  ];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private storage: Storage,
    private landmarkService: LandmarkService
  ) {}

  async ngOnInit() {
    await this.storage.create();
    await this.initializeUser();
    await this.loadContent();
    this.setupRealtimeUpdates();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // User initialization and session management
  private async initializeUser() {
    try {
      // Load user session from storage
      const sessionData = await this.storage.get('userSession');
      if (sessionData) {
        this.userSession = sessionData;
        await this.loadUserStats();
      } else {
        // Create anonymous session for first-time users
        await this.createGuestSession();
      }
      
      await this.checkUserLocation();
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  }

  private async createGuestSession() {
    const guestSession: UserSession = {
      uid: 'guest_' + Date.now(),
      email: 'guest@histaryo.app',
      name: 'Explorer',
      visitCount: 0,
      stampsCollected: 0,
      lastVisit: new Date().toISOString()
    };
    
    this.userSession = guestSession;
    await this.storage.set('userSession', guestSession);
  }

  private async loadUserStats() {
    if (!this.userSession) return;
    
    try {
      // Load from local storage
      const [stamps, visits, bookmarks, triviaResults] = await Promise.all([
        this.storage.get('stamps') || [],
        this.storage.get('visits') || [],
        this.storage.get('bookmarks') || [],
        this.storage.get('triviaResults') || []
      ]);

      // Load recently visited landmarks
      const recentVisits = visits.slice(-5);
      if (recentVisits.length > 0) {
        const recentLandmarkIds = recentVisits.map((v: any) => v.landmarkId);
        this.loadRecentlyVisited(recentLandmarkIds);
      }

      this.userStats = {
        totalVisits: visits.length,
        stampsCollected: stamps.length,
        badgesEarned: this.calculateBadges(stamps.length, visits.length),
        completedTrivia: triviaResults.length,
        favoriteLandmarks: bookmarks,
        streakDays: this.calculateStreak(visits)
      };

      // Update session data
      this.userSession.visitCount = visits.length;
      this.userSession.stampsCollected = stamps.length;
      await this.storage.set('userSession', this.userSession);
      
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  private calculateBadges(stamps: number, visits: number): number {
    let badges = 0;
    if (stamps >= 1) badges++; // First Stamp
    if (stamps >= 5) badges++; // Explorer
    if (stamps >= 10) badges++; // Heritage Hunter
    if (visits >= 10) badges++; // Frequent Visitor
    if (visits >= 25) badges++; // Heritage Master
    return badges;
  }

  private calculateStreak(visits: any[]): number {
    if (visits.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    for (let i = visits.length - 1; i >= 0; i--) {
      const visitDate = new Date(visits[i].date);
      const daysDiff = Math.floor((currentDate.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        streak++;
        currentDate = visitDate;
      } else {
        break;
      }
    }
    
    return streak;
  }

  // Content loading methods
  async loadContent() {
    this.loading = true;
    this.error = '';
    
    try {
      await Promise.all([
        this.loadFeaturedLandmarks(),
        this.loadNearbyLandmarks(),
        this.loadRecommendedLandmarks(),
        this.loadNotifications()
      ]);
    } catch (error) {
      this.error = 'Failed to load content. Please try again.';
      console.error('Content loading error:', error);
      await this.showToast('Failed to load landmarks', 'danger');
    } finally {
      this.loading = false;
    }
  }

  private async loadFeaturedLandmarks() {
    const subscription = this.landmarkService.getFeaturedLandmarks(6).subscribe({
      next: (landmarks) => {
        this.featuredLandmarks = landmarks.map(landmark => ({
          ...landmark,
          distance: this.userLocation ? 
            this.calculateDistance(landmark.latitude, landmark.longitude) : undefined
        }));
      },
      error: (error) => {
        console.error('Error loading featured landmarks:', error);
      }
    });
    
    this.subscriptions.push(subscription);
  }

  private async loadNearbyLandmarks() {
    if (!this.userLocation) {
      // Load default landmarks for Cebu City if no location
      const subscription = this.landmarkService.getLandmarksByCity('Cebu City').subscribe({
        next: (landmarks) => {
          this.nearbyLandmarks = landmarks.slice(0, 4);
        },
        error: (error) => {
          console.error('Error loading city landmarks:', error);
        }
      });
      this.subscriptions.push(subscription);
      return;
    }

    const subscription = this.landmarkService.getNearbyLandmarks(
      this.userLocation.latitude,
      this.userLocation.longitude,
      10 // 10km radius
    ).subscribe({
      next: (landmarks) => {
        this.nearbyLandmarks = landmarks.slice(0, 4);
      },
      error: (error) => {
        console.error('Error loading nearby landmarks:', error);
        // Fallback to city landmarks
        this.loadLandmarksByCity('Cebu City');
      }
    });
    
    this.subscriptions.push(subscription);
  }

  private async loadLandmarksByCity(city: string) {
    const subscription = this.landmarkService.getLandmarksByCity(city).subscribe({
      next: (landmarks) => {
        this.nearbyLandmarks = landmarks.slice(0, 4);
      }
    });
    this.subscriptions.push(subscription);
  }

  private async loadRecommendedLandmarks() {
    if (this.userStats.favoriteLandmarks.length === 0) {
      // For new users, recommend based on popular landmarks
      const subscription = this.landmarkService.getFilteredLandmarks({
        hasAR: true
      }).subscribe({
        next: (landmarks) => {
          this.recommendedLandmarks = landmarks.slice(0, 3);
        }
      });
      this.subscriptions.push(subscription);
      return;
    }

    // For existing users, recommend similar landmarks
    const favoriteCategories = await this.getFavoriteCategories();
    if (favoriteCategories.length > 0) {
      const subscription = this.landmarkService.getFilteredLandmarks({
        category: favoriteCategories[0]
      }).subscribe({
        next: (landmarks) => {
          // Filter out already visited landmarks
          const unvisited = landmarks.filter(l => 
            !this.userStats.favoriteLandmarks.includes(l.id)
          );
          this.recommendedLandmarks = unvisited.slice(0, 3);
        }
      });
      this.subscriptions.push(subscription);
    }
  }

  private async getFavoriteCategories(): Promise<string[]> {
    const visits = await this.storage.get('visits') || [];
    const categoryCount: { [key: string]: number } = {};
    
    visits.forEach((visit: any) => {
      const landmark = this.featuredLandmarks.find(l => l.id === visit.landmarkId);
      if (landmark?.category) {
        categoryCount[landmark.category] = (categoryCount[landmark.category] || 0) + 1;
      }
    });
    
    return Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a]);
  }

  private async loadRecentlyVisited(landmarkIds: string[]) {
    const recentLandmarks: Landmark[] = [];
    
    for (const id of landmarkIds) {
      const subscription = this.landmarkService.getLandmarkById(id).subscribe({
        next: (landmark) => {
          if (landmark) {
            recentLandmarks.push(landmark);
          }
        }
      });
      this.subscriptions.push(subscription);
    }
    
    this.recentlyVisited = recentLandmarks.slice(0, 4);
  }

  private async loadNotifications() {
    // Mock notification count - replace with actual service
    this.unreadNotifications = 0;
    
    // Check for achievement notifications
    const lastStampCount = await this.storage.get('lastKnownStampCount') || 0;
    if (this.userStats.stampsCollected > lastStampCount) {
      this.unreadNotifications++;
      await this.storage.set('lastKnownStampCount', this.userStats.stampsCollected);
    }
  }

  private setupRealtimeUpdates() {
    // Subscribe to landmark updates
    const subscription = this.landmarkService.landmarks$.subscribe({
      next: (landmarks) => {
        // Update featured landmarks when data changes
        this.updateFeaturedFromAll(landmarks);
      },
      error: (error) => {
        console.error('Realtime update error:', error);
      }
    });
    
    this.subscriptions.push(subscription);
  }

  private updateFeaturedFromAll(allLandmarks: Landmark[]) {
    // Update featured landmarks with latest data
    const featured = allLandmarks
      .filter(l => (l.rating ?? 0) > 0 || (l.visitCount ?? 0) > 0)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 6);
    
    this.featuredLandmarks = featured.map(landmark => ({
      ...landmark,
      distance: this.userLocation ? 
        this.calculateDistance(landmark.latitude, landmark.longitude) : undefined
    }));
  }

  // Location services
  private async checkUserLocation() {
    if ('geolocation' in navigator) {
      try {
        const position = await this.getCurrentPosition();
        this.userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        await this.storage.set('lastKnownLocation', this.userLocation);
      } catch (error) {
        console.warn('Location access denied or unavailable:', error);
        // Try to load last known location
        this.userLocation = await this.storage.get('lastKnownLocation');
      }
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      });
    });
  }

  // Navigation methods
  navigateToLandmark(landmark: Landmark) {
    // Record navigation for analytics
    this.recordLandmarkInteraction(landmark.id, 'viewed');
    this.navCtrl.navigateForward(`/landmark/${landmark.id}`);
  }

  navigateToMap() {
    this.navCtrl.navigateForward('/map');
  }

  navigateToScan() {
    this.navCtrl.navigateForward('/scan');
  }

  navigateToStampGallery() {
    this.navCtrl.navigateForward('/stamps');
  }

  navigateToProgress() {
    this.navCtrl.navigateForward('/progress');
  }

  navigateToAllLandmarks(category?: string) {
    const queryParams = category && category !== 'all' ? { category } : {};
    this.navCtrl.navigateForward('/landmarks', { queryParams });
  }

  // Action methods
  async exploreRandomLandmark() {
    const loading = await this.loadingCtrl.create({
      message: 'Finding your next adventure...',
      duration: 1500
    });
    await loading.present();

    const subscription = this.landmarkService.getRandomLandmark().subscribe({
      next: async (landmark) => {
        await loading.dismiss();
        
        if (!landmark) {
          await this.showToast('No landmarks available at the moment', 'warning');
          return;
        }

        const alert = await this.alertCtrl.create({
          header: 'Surprise Discovery!',
          subHeader: landmark.name,
          message: `${landmark.description.substring(0, 100)}${landmark.description.length > 100 ? '...' : ''}`,
          buttons: [
            {
              text: 'Maybe Later',
              role: 'cancel'
            },
            {
              text: 'Let\'s Explore!',
              handler: () => {
                this.navigateToLandmark(landmark);
              }
            }
          ]
        });

        await alert.present();
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Error getting random landmark:', error);
        await this.showToast('Failed to find random landmark', 'danger');
      }
    });
    
    this.subscriptions.push(subscription);
  }

  async openNotifications() {
    this.navCtrl.navigateForward('/notifications');
  }

  async filterByCategory(category: string) {
    this.selectedCategory = category;
    
    if (category === 'all') {
      await this.loadFeaturedLandmarks();
    } else {
      const subscription = this.landmarkService.getFilteredLandmarks({
        category: category
      }).subscribe({
        next: (landmarks) => {
          this.featuredLandmarks = landmarks.slice(0, 6).map(landmark => ({
            ...landmark,
            distance: this.userLocation ? 
              this.calculateDistance(landmark.latitude, landmark.longitude) : undefined
          }));
        }
      });
      this.subscriptions.push(subscription);
    }
  }

  // Refresh and reload methods
  async handleRefresh(event: any) {
    this.isRefreshing = true;
    
    try {
      await Promise.all([
        this.loadContent(),
        this.loadUserStats()
      ]);
      await this.showToast('Content refreshed', 'success');
    } catch (error) {
      await this.showToast('Failed to refresh content', 'danger');
    } finally {
      this.isRefreshing = false;
      event.target.complete();
    }
  }

  // Utility methods
  private calculateDistance(lat: number, lng: number): number {
    if (!this.userLocation) return 0;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat - this.userLocation.latitude);
    const dLng = this.deg2rad(lng - this.userLocation.longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(this.userLocation.latitude)) * 
      Math.cos(this.deg2rad(lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private async recordLandmarkInteraction(landmarkId: string, action: string) {
    try {
      const interactions = await this.storage.get('interactions') || [];
      interactions.push({
        landmarkId,
        action,
        timestamp: new Date().toISOString(),
        userId: this.userSession?.uid
      });
      await this.storage.set('interactions', interactions);
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }

  // Template helper methods
  trackByLandmarkId(index: number, landmark: Landmark): string {
    return landmark.id;
  }

  onImageError(event: any) {
    event.target.src = 'assets/img/default-landmark.jpg';
  }

  getShortDescription(description: string, limit: number = 120): string {
    if (!description) return '';
    
    if (description.length <= limit) {
      return description;
    }
    
    return description.slice(0, limit).trim() + '...';
  }

  getEstimatedTime(landmark: Landmark): string {
    if (!landmark.estimatedTime) return '';
    
    const minutes = landmark.estimatedTime;
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  getLandmarkDistance(landmark: Landmark): string {
    if (!landmark.distance) return '';
    
    if (landmark.distance < 1) {
      return `${Math.round(landmark.distance * 1000)}m away`;
    } else {
      return `${landmark.distance.toFixed(1)}km away`;
    }
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getDifficultyIcon(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'checkmark-circle';
      case 'medium':
        return 'alert-circle';
      case 'hard':
        return 'warning';
      default:
        return 'help-circle';
    }
  }

  hasSpecialFeatures(landmark: Landmark): boolean {
    return !!(landmark.arContent || landmark.scavengerHunt);
  }

  getSpecialFeatures(landmark: Landmark): string[] {
    const features: string[] = [];
    if (landmark.arContent) features.push('AR Experience');
    if (landmark.scavengerHunt) features.push('Scavenger Hunt');
    if (landmark.tips && landmark.tips.length > 0) features.push('User Tips');
    if (landmark.videoUrl) features.push('Video Content');
    return features;
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  getAchievementLevel(): string {
    const stamps = this.userStats.stampsCollected;
    if (stamps === 0) return 'New Explorer';
    if (stamps < 5) return 'Heritage Seeker';
    if (stamps < 10) return 'Cultural Explorer';
    if (stamps < 20) return 'Heritage Hunter';
    return 'Heritage Master';
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'primary' | 'medium' = 'primary'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  // Getter methods for template
  get hasUserData(): boolean {
    return !!this.userSession;
  }

  get hasLandmarks(): boolean {
    return this.featuredLandmarks.length > 0 || this.nearbyLandmarks.length > 0;
  }

  get progressPercentage(): number {
    const totalLandmarks = this.featuredLandmarks.length + this.nearbyLandmarks.length;
    if (totalLandmarks === 0) return 0;
    return Math.round((this.userStats.stampsCollected / totalLandmarks) * 100);
  }
}