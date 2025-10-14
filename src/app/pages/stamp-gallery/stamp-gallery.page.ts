import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { Subscription } from 'rxjs';
import { LandmarkService, Landmark } from '../../services/landmark.service';

interface CollectedStamp {
  landmarkId: string;
  landmarkName: string;
  landmarkImage?: string;
  collectedAt: Date;
  category?: string;
  city?: string;
}

@Component({
  selector: 'app-stamp-gallery',
  templateUrl: './stamp-gallery.page.html',
  styleUrls: ['./stamp-gallery.page.scss'],
  standalone: false
})
export class StampGalleryPage implements OnInit, OnDestroy {
  collectedStamps: CollectedStamp[] = [];
  allLandmarks: Landmark[] = [];
  loading = true;
  totalStamps = 0;
  selectedCategory = 'all';
  
  categories = [
    { value: 'all', label: 'All Stamps', icon: 'apps' },
    { value: 'Historical', label: 'Historical', icon: 'library' },
    { value: 'Religious', label: 'Religious', icon: 'home' },
    { value: 'Cultural', label: 'Cultural', icon: 'color-palette' },
    { value: 'Natural', label: 'Natural', icon: 'leaf' },
    { value: 'Modern', label: 'Modern', icon: 'business' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private storage: Storage,
    private landmarkService: LandmarkService
  ) {}

  async ngOnInit() {
    await this.storage.create();
    await this.loadCollectedStamps();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadCollectedStamps() {
    this.loading = true;
    
    try {
      const stampIds: string[] = await this.storage.get('stamps') || [];
      this.totalStamps = stampIds.length;

      if (stampIds.length === 0) {
        this.collectedStamps = [];
        this.loading = false;
        return;
      }

      const landmarksSubscription = this.landmarkService.landmarks$.subscribe(landmarks => {
        this.allLandmarks = landmarks;
        this.processCollectedStamps(stampIds);
      });

      this.subscriptions.push(landmarksSubscription);

      if (this.allLandmarks.length > 0) {
        this.processCollectedStamps(stampIds);
      }

    } catch (error) {
      console.error('Error loading collected stamps:', error);
      await this.showToast('Failed to load stamp collection', 'danger');
    } finally {
      this.loading = false;
    }
  }

  private processCollectedStamps(stampIds: string[]) {
    this.collectedStamps = [];

    stampIds.forEach(stampId => {
      const landmark = this.allLandmarks.find(l => l.id === stampId);
      if (landmark) {
        this.collectedStamps.push({
          landmarkId: landmark.id,
          landmarkName: landmark.name,
          landmarkImage: this.getLandmarkImage(landmark),
          collectedAt: new Date(), 
          category: landmark.category,
          city: landmark.city
        });
      }
    });

    this.collectedStamps.reverse();
    
  }

  private getLandmarkImage(landmark: Landmark): string {
    if (landmark.name) {
      const name = landmark.name.toLowerCase().trim();
      
      if (name.includes('basilica') || name.includes('santo niño') || name.includes('santo nino')) {
        return 'assets/img/basilica.jpg';
      }

      if (name.includes('casa gorordo') || name.includes('gorordo')) {
        return 'assets/img/Casa-Gorordo.jpg';
      }

      if (name.includes('cathedral') || name.includes('metropolitan')) {
        return 'assets/img/cathedral.jpg';
      }

      if (name.includes('fort san pedro') || name.includes('fort') || name.includes('san pedro')) {
        return 'assets/img/fort-san-pedro.jpg';
      }

      if (name.includes('magellan') || name.includes('cross')) {
        return 'assets/img/magellans-cross.jpg';
      }
    }

    return 'assets/img/default-landmark.jpg';
  }

  getFilteredStamps(): CollectedStamp[] {
    if (this.selectedCategory === 'all') {
      return this.collectedStamps;
    }
    return this.collectedStamps.filter(stamp => stamp.category === this.selectedCategory);
  }

  onCategoryChange(event: any) {
    this.selectedCategory = event.detail.value;
  }

  goToLandmark(stamp: CollectedStamp) {
    this.router.navigate(['/landmark-details', stamp.landmarkId]);
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  getCategoryIcon(category?: string): string {
    if (!category) return 'location';
    const categoryData = this.categories.find(c => c.value === category);
    return categoryData?.icon || 'location';
  }

  getCategoryColor(category?: string): string {
    if (!category) return 'medium';
    const colors: { [key: string]: string } = {
      'Historical': 'primary',
      'Religious': 'secondary',
      'Cultural': 'tertiary',
      'Natural': 'success',
      'Modern': 'warning'
    };
    return colors[category] || 'medium';
  }

  getProgressPercentage(): number {
    if (this.allLandmarks.length === 0) return 0;
    return Math.round((this.totalStamps / this.allLandmarks.length) * 100);
  }

  getFormattedDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
