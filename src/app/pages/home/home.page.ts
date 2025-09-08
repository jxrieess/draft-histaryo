// src/app/pages/home/home.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';

// Interface definitions
interface Landmark {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  city?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  arContent?: boolean;
  scavengerHunt?: boolean;
  estimatedTime?: number; // in minutes
  tags?: string[];
  category?: string;
  latitude?: number;
  longitude?: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit, OnDestroy {
  
  // Component properties
  loading = false;
  error = '';
  totalLandmarks = 4;
  featuredLandmarks: Landmark[] = [];
  nearbyLandmarks: Landmark[] = [];
  userLocation: any = null;
  unreadNotifications = 0;
  fabActivated = false;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.loadContent();
    this.checkUserLocation();
    this.loadNotifications();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Content loading methods
  async loadContent() {
    this.loading = true;
    this.error = '';
    
    try {
      // Simulate API calls - replace with actual service calls
      await Promise.all([
        this.loadFeaturedLandmarks(),
        this.loadNearbyLandmarks(),
        this.loadStats()
      ]);
    } catch (error) {
      this.error = 'Failed to load content. Please try again.';
      console.error('Content loading error:', error);
    } finally {
      this.loading = false;
    }
  }

  private async loadFeaturedLandmarks() {
    // Mock data - replace with actual service call
    this.featuredLandmarks = [
      {
        id: '1',
        name: 'Fort San Pedro',
        description: 'The smallest triangular fort in the Philippines, built by Spanish conquistadors.',
        imageUrl: 'assets/img/fort-san-pedro.jpg',
        city: 'Cebu City',
        difficulty: 'easy',
        arContent: true,
        scavengerHunt: false,
        estimatedTime: 30,
        tags: ['Spanish Colonial', 'Military History'],
        category: 'Historical Site'
      },
      {
        id: '2',
        name: 'Basilica del Santo Niño',
        description: 'The oldest Roman Catholic church in the Philippines, housing the Santo Niño de Cebu.',
        imageUrl: 'assets/img/basilica.jpg',
        city: 'Cebu City',
        difficulty: 'medium',
        arContent: true,
        scavengerHunt: true,
        estimatedTime: 45,
        tags: ['Religious', 'Spanish Colonial'],
        category: 'Religious Site'
      }
    ];
  }

  private async loadNearbyLandmarks() {
    // Mock data - replace with actual service call based on user location
    this.nearbyLandmarks = [
      {
        id: '3',
        name: 'Magellan\'s Cross',
        description: 'Historic cross planted by Ferdinand Magellan in 1521.',
        imageUrl: 'assets/img/magellan-cross.jpg',
        city: 'Cebu City',
        difficulty: 'easy',
        arContent: true,
        estimatedTime: 20,
        category: 'Historical Marker'
      },
      {
        id: '4',
        name: 'Heritage Monument',
        description: 'Sculptures depicting the history of Cebu and the Philippines.',
        imageUrl: 'assets/img/heritage-monument.jpg',
        city: 'Cebu City',
        difficulty: 'medium',
        arContent: false,
        estimatedTime: 25,
        category: 'Monument'
      }
    ];
  }

  private async loadStats() {
    // Mock stats - replace with actual service call
    this.totalLandmarks = 4;
  }

  private checkUserLocation() {
    // Check if geolocation is available and get user location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        },
        (error) => {
          console.warn('Location access denied:', error);
        }
      );
    }
  }

  private loadNotifications() {
    // Mock notification count - replace with actual service call
    this.unreadNotifications = 2;
  }

  // Navigation methods
  navigateToScan() {
    this.navCtrl.navigateForward('/scan');
  }

  navigateToMap() {
    this.navCtrl.navigateForward('/map');
  }

  navigateToStampGallery() {
    this.navCtrl.navigateForward('/stamps');
  }

  navigateToProgress() {
    this.navCtrl.navigateForward('/progress');
  }

  navigateToLandmark(landmark: Landmark) {
    this.navCtrl.navigateForward(`/landmark/${landmark.id}`);
  }

  navigateToAllLandmarks() {
    this.navCtrl.navigateForward('/landmarks');
  }

  // Action methods
  async exploreRandomLandmark() {
    const allLandmarks = [...this.featuredLandmarks, ...this.nearbyLandmarks];
    
    if (allLandmarks.length === 0) {
      await this.showToast('No landmarks available at the moment');
      return;
    }

    const randomIndex = Math.floor(Math.random() * allLandmarks.length);
    const randomLandmark = allLandmarks[randomIndex];
    
    const alert = await this.alertCtrl.create({
      header: 'Surprise Discovery!',
      subHeader: randomLandmark.name,
      message: randomLandmark.description,
      buttons: [
        {
          text: 'Maybe Later',
          role: 'cancel'
        },
        {
          text: 'Let\'s Go!',
          handler: () => {
            this.navigateToLandmark(randomLandmark);
          }
        }
      ]
    });

    await alert.present();
  }

  async openNotifications() {
    // Navigate to notifications page or show notifications modal
    this.navCtrl.navigateForward('/notifications');
  }

  // Refresh and reload methods
  async handleRefresh(event: any) {
    await this.refreshContent();
    event.target.complete();
  }

  async refreshContent() {
    await this.loadContent();
    await this.showToast('Content refreshed');
  }

  // Utility methods
  trackByLandmarkId(index: number, landmark: Landmark): string {
    return landmark.id;
  }

  onImageError(event: any) {
    // Handle image loading errors by setting a default image
    event.target.src = 'assets/img/default-landmark.jpg';
  }

  getShortDescription(description: string, limit: number = 100): string {
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
    if (!this.userLocation || !landmark.latitude || !landmark.longitude) {
      return '';
    }

    // Calculate distance using Haversine formula (simplified)
    const distance = this.calculateDistance(
      this.userLocation.latitude,
      this.userLocation.longitude,
      landmark.latitude,
      landmark.longitude
    );

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
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

  // FAB methods
  toggleFab() {
    this.fabActivated = !this.fabActivated;
  }

  // Helper methods
  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  // Mock data getters (for development)
  get mockFeaturedLandmarks(): Landmark[] {
    return this.featuredLandmarks.length > 0 ? this.featuredLandmarks : [];
  }

  get mockNearbyLandmarks(): Landmark[] {
    return this.nearbyLandmarks.length > 0 ? this.nearbyLandmarks : [];
  }
}