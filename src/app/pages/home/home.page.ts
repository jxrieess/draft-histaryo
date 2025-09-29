import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { Subscription } from 'rxjs';
import { LandmarkService, Landmark } from '../../services/landmark.service';

interface UserSession {
  uid: string;
  email: string;
  name?: string;
  photoURL?: string;
  visitCount?: number;
  stampsCollected?: number;
}

interface UserStats {
  totalVisits: number;
  stampsCollected: number;
  badgesEarned: number;
  completedTrivia: number;
  streakDays: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  
  allLandmarks: Landmark[] = [];
  featuredLandmarks: Landmark[] = [];
  nearbyLandmarks: Landmark[] = [];
  recentlyVisited: Landmark[] = [];
  
  userSession: UserSession | null = null;
  userStats: UserStats = {
    totalVisits: 0,
    stampsCollected: 0,
    badgesEarned: 0,
    completedTrivia: 0,
    streakDays: 0
  };
  
  loading = true;
  error = '';
  userLocation: any = null;
  unreadNotifications = 0;
  isRefreshing = false;
  selectedCategory = 'all';
  fabActivated = false;
  
  categories = [
    { value: 'all', label: 'All', icon: 'apps' },
    { value: 'Historical', label: 'Historical', icon: 'library' },
    { value: 'Religious', label: 'Religious', icon: 'home' },
    { value: 'Cultural', label: 'Cultural', icon: 'color-palette' },
    { value: 'Natural', label: 'Natural', icon: 'leaf' },
    { value: 'Modern', label: 'Modern', icon: 'business' }
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

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: async () => {
            // Clear all stored data
            await this.storage.clear();
            
            // Navigate to login page
            this.router.navigate(['/login']);
            
            // Show success message
            const toast = await this.toastCtrl.create({
              message: 'Logged out successfully',
              duration: 2000,
              position: 'bottom'
            });
            await toast.present();
          }
        }
      ]
    });
    
    await alert.present();
  }

  getDefaultImageUrl(imageUrl?: string, category?: string): string {
    if (imageUrl && imageUrl.trim() !== '' && !imageUrl.includes('placeholder')) {
      return imageUrl;
    }

    switch (category?.toLowerCase()) {
      case 'religious':
        return 'assets/img/basilica.jpg';
      case 'historical':
        return 'assets/img/fort-san-pedro.jpg';
      case 'cultural':
        return 'assets/img/magellans-cross.jpg';
      default:
        return 'assets/img/default-landmark.jpg';
    }
  }

  async ngOnInit() {
    await this.storage.create();
    await this.initializeUser();
    await this.checkUserLocation();
    this.setupRealtimeUpdates();
    await this.loadContent();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async initializeUser() {
    try {
      const sessionData = await this.storage.get('userSession');
      if (sessionData) {
        this.userSession = sessionData;
        await this.loadUserStats();
      } else {
        await this.createGuestSession();
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  }

  private async createGuestSession() {
    const guestSession: UserSession = {
      uid: 'guest_' + Date.now(),
      email: 'guest@histaryo.app',
      name: 'Heritage Explorer'
    };
    
    this.userSession = guestSession;
    await this.storage.set('userSession', guestSession);
  }

  private async loadUserStats() {
    if (!this.userSession) return;
    
    try {
      const stamps = await this.storage.get('stamps') ?? [];
      const visits = await this.storage.get('visits') ?? [];
      const triviaResults = await this.storage.get('triviaResults') ?? [];

      this.userStats = {
        totalVisits: Array.isArray(visits) ? visits.length : 0,
        stampsCollected: Array.isArray(stamps) ? stamps.length : 0,
        badgesEarned: this.calculateBadges(
          Array.isArray(stamps) ? stamps.length : 0, 
          Array.isArray(visits) ? visits.length : 0
        ),
        completedTrivia: Array.isArray(triviaResults) ? triviaResults.length : 0,
        streakDays: this.calculateStreak(Array.isArray(visits) ? visits : [])
      };

      this.userSession.visitCount = Array.isArray(visits) ? visits.length : 0;
      this.userSession.stampsCollected = Array.isArray(stamps) ? stamps.length : 0;
      await this.storage.set('userSession', this.userSession);
      
      console.log('✅ User stats loaded:', this.userStats);
      
    } catch (error) {
      console.error('❌ Error loading user stats:', error);
      this.userStats = {
        totalVisits: 0,
        stampsCollected: 0,
        badgesEarned: 0,
        completedTrivia: 0,
        streakDays: 0
      };
    }
  }

  private calculateBadges(stamps: number, visits: number): number {
    let badges = 0;
    if (stamps >= 1) badges++;
    if (stamps >= 5) badges++;
    if (stamps >= 10) badges++;
    if (visits >= 10) badges++;
    if (visits >= 25) badges++;
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
        console.log('✅ User location obtained:', this.userLocation);
        
      } catch (error) {
        console.warn('Location access denied or unavailable:', error);
        this.userLocation = await this.storage.get('lastKnownLocation');
      }
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 
      });
    });
  }

  private setupRealtimeUpdates() {
    
    const landmarksSubscription = this.landmarkService.getAllLandmarks().subscribe({
      next: (landmarks) => {
        console.log(`🏛️ Homepage received update: ${landmarks.length} landmarks from service`);
        
        if (landmarks.length === 0) {
          console.log('⚠️ No landmarks received - checking service status...');
          console.log('Service ready?', this.landmarkService.isServiceReady());
          console.log('Current landmarks count:', this.landmarkService.getCurrentLandmarksCount());
        } else {
          console.log('📋 Landmark names received:', landmarks.slice(0, 3).map(l => l.name));
        }

        this.allLandmarks = landmarks;
        this.updateDisplayedLandmarks();
        
        if (this.loading) {
          this.loading = false;
          this.error = '';
          console.log('✅ Homepage loading complete');
        }
      },
      error: (error) => {
        console.error('❌ Homepage real-time landmarks update error:', error);
        this.loading = false;
        this.error = 'Failed to load landmarks. Please check your connection.';
      }
    });
    
    this.subscriptions.push(landmarksSubscription);
  }

  private updateDisplayedLandmarks() {
    if (this.allLandmarks.length === 0) return;

    this.loadFeaturedLandmarks();
    
    this.loadNearbyLandmarks();
    
    this.loadNotifications();
  }

  async loadContent() {
    this.loading = true;
    this.error = '';
    
    try {
      if (!this.landmarkService.isServiceReady()) {
        console.log('⏳ Waiting for LandmarkService to initialize...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      this.error = 'Failed to load content. Please try again.';
      console.error('Content loading error:', error);
      await this.showToast('Failed to load landmarks', 'danger');
    }
  }

  private loadFeaturedLandmarks() {
    const subscription = this.landmarkService.getFeaturedLandmarks(6).subscribe({
      next: (landmarks) => {
        console.log(`⭐ Featured landmarks: ${landmarks.length}`);
        this.featuredLandmarks = landmarks.map(landmark => ({
          ...landmark,
          distance: this.userLocation ? 
            this.calculateDistance(landmark.latitude!, landmark.longitude!) : undefined
        }));
      },
      error: (error) => {
        console.error('Error loading featured landmarks:', error);
      }
    });
    
    this.subscriptions.push(subscription);
  }

  private loadNearbyLandmarks() {
    if (this.userLocation) {
      const subscription = this.landmarkService.getNearbyLandmarks(
        this.userLocation.latitude,
        this.userLocation.longitude,
        10
      ).subscribe({
        next: (landmarks) => {
          console.log(`📍 Nearby landmarks: ${landmarks.length} within 10km`);
          this.nearbyLandmarks = landmarks.slice(0, 8);
        },
        error: (error) => {
          console.error('Error loading nearby landmarks:', error);
          this.loadLandmarksByCity('Cebu City');
        }
      });
      
      this.subscriptions.push(subscription);
    } else {
      this.loadLandmarksByCity('Cebu City');
    }
  }

  private loadLandmarksByCity(city: string) {
    const subscription = this.landmarkService.getLandmarksByCity(city).subscribe({
      next: (landmarks) => {
        console.log(`🏙️ ${city} landmarks: ${landmarks.length}`);
        this.nearbyLandmarks = landmarks.slice(0, 8);
      }
    });
    this.subscriptions.push(subscription);
  }

  private async loadNotifications() {
    this.unreadNotifications = 0;
    
    const lastStampCount = await this.storage.get('lastKnownStampCount') || 0;
    if (this.userStats.stampsCollected > lastStampCount) {
      this.unreadNotifications++;
      await this.storage.set('lastKnownStampCount', this.userStats.stampsCollected);
    }
  }

  private calculateDistance(lat: number, lng: number): number {
    if (!this.userLocation || !lat || !lng) return 0;
    
    const R = 6371; 
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

  navigateToLandmark(landmark: Landmark) {
    this.recordLandmarkInteraction(landmark.id, 'viewed');
    this.navCtrl.navigateForward(`/landmark-details/${landmark.id}`);
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
      this.loadFeaturedLandmarks();
    } else {
      const subscription = this.landmarkService.getFilteredLandmarks({
        category: category
      }).subscribe({
        next: (landmarks) => {
          this.featuredLandmarks = landmarks.slice(0, 6).map(landmark => ({
            ...landmark,
            distance: this.userLocation ? 
              this.calculateDistance(landmark.latitude!, landmark.longitude!) : undefined
          }));
        }
      });
      this.subscriptions.push(subscription);
    }
  }

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

  async refreshContent() {
    const loading = await this.loadingCtrl.create({
      message: 'Refreshing content...',
      duration: 2000
    });
    await loading.present();
    
    this.setupRealtimeUpdates();
    
    await loading.dismiss();
    await this.showToast('Content updated!', 'success');
  }

  toggleFab() {
    this.fabActivated = !this.fabActivated;
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
    return !!(landmark.arContent || landmark.scavengerHunt || landmark.videoUrl);
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

  get hasUserData(): boolean {
    return !!this.userSession;
  }

  get hasLandmarks(): boolean {
    return this.featuredLandmarks.length > 0 || this.nearbyLandmarks.length > 0;
  }

  get progressPercentage(): number {
    const totalLandmarks = this.allLandmarks.length;
    if (totalLandmarks === 0) return 0;
    return Math.round((this.userStats.stampsCollected / totalLandmarks) * 100);
  }

  get totalLandmarksCount(): number {
    return this.allLandmarks.length;
  }
}