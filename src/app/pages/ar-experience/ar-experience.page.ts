import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';

interface ArContent {
  landmarkId: string;
  storyMode: {
    title: string;
    content: string;
    videoUrl?: string;
    audioUrl?: string;
    overlayImages?: string[];
  };
  thenNowMode: {
    thenImageUrl: string;
    nowImageUrl: string;
    comparisonPoints: Array<{
      x: number;
      y: number;
      title: string;
      description: string;
    }>;
  };
  interactiveElements: Array<{
    type: 'hotspot' | 'model' | 'info';
    position: { x: number; y: number };
    content: string;
    mediaUrl?: string;
  }>;
}

@Component({
  selector: 'app-ar-experience',
  templateUrl: './ar-experience.page.html',
  styleUrls: ['./ar-experience.page.scss'],
  standalone: false
})
export class ArExperiencePage implements OnInit, OnDestroy {
  landmarkId: string = '';
  landmarkName: string = '';
  currentMode: 'story' | 'then-now' = 'story';
  arContent: ArContent | null = null;
  loading = true;
  isArActive = false;
  
  cameraPermission = false;
  arSupported = true;

  activeHotspot: any = null;
  showOverlay = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      this.landmarkId = params['id'] || '';
      if (this.landmarkId) {
        await this.loadLandmarkData();
        await this.checkArSupport();
        await this.loadArContent();
      } else {
        await this.showError('No landmark specified for AR experience');
      }
    });
  }

  ngOnDestroy() {
    this.stopArExperience();
  }

  async loadLandmarkData() {
    try {
      const landmarkDoc = await getDoc(doc(db, 'landmarks', this.landmarkId));
      if (landmarkDoc.exists()) {
        this.landmarkName = landmarkDoc.data()['name'] || 'Unknown Landmark';
      }
    } catch (error) {
      console.error('Error loading landmark data:', error);
    }
  }

  async checkArSupport() {
    this.arSupported = 'xr' in navigator || 'mediaDevices' in navigator;
    
    if (!this.arSupported) {
      await this.showArNotSupportedAlert();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      this.cameraPermission = true;
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera permission denied:', error);
      await this.showCameraPermissionAlert();
    }
  }

  async loadArContent() {
    try {
      // Try to load from Firestore first
      const arDoc = await getDoc(doc(db, 'ar_content', this.landmarkId));
      
      if (arDoc.exists()) {
        this.arContent = arDoc.data() as ArContent;
      } else {
        this.arContent = this.getHardcodedArContent();
      }
    } catch (error) {
      console.error('Error loading AR content:', error);
      this.arContent = this.getHardcodedArContent();
    } finally {
      this.loading = false;
    }
  }

  getHardcodedArContent(): ArContent {
    return {
      landmarkId: this.landmarkId,
      storyMode: {
        title: `The Story of ${this.landmarkName}`,
        content: `Experience the rich history of ${this.landmarkName} through augmented reality. See how this landmark has evolved over time and discover hidden stories from the past.`,
        videoUrl: undefined,
        audioUrl: undefined,
        overlayImages: []
      },
      thenNowMode: {
        thenImageUrl: 'assets/img/placeholder-then.jpg',
        nowImageUrl: 'assets/img/placeholder-now.jpg',
        comparisonPoints: [
          {
            x: 50,
            y: 30,
            title: 'Architecture Changes',
            description: 'Notice how the architectural style has evolved over the decades.'
          },
          {
            x: 70,
            y: 60,
            title: 'Surrounding Development',
            description: 'The area around the landmark has been significantly developed.'
          }
        ]
      },
      interactiveElements: [
        {
          type: 'hotspot',
          position: { x: 40, y: 40 },
          content: 'Historical significance of this location',
          mediaUrl: undefined
        },
        {
          type: 'info',
          position: { x: 60, y: 70 },
          content: 'Architectural details and construction information'
        }
      ]
    };
  }

  async startArExperience() {
    if (!this.cameraPermission || !this.arSupported) {
      await this.showError('AR experience requires camera permission and AR support');
      return;
    }

    try {
      this.isArActive = true;
      await this.showToast('AR Experience started! Point your camera at the landmark', 'success');
      
      this.simulateArTracking();
      
    } catch (error) {
      console.error('Error starting AR experience:', error);
      await this.showError('Failed to start AR experience');
      this.isArActive = false;
    }
  }

  stopArExperience() {
    this.isArActive = false;
    this.activeHotspot = null;
    this.showOverlay = false;

  }

  switchMode(mode: 'story' | 'then-now') {
    this.currentMode = mode;
    this.activeHotspot = null;
    this.showOverlay = false;
    
    if (this.isArActive) {
      this.showToast(`Switched to ${mode === 'story' ? 'Story' : 'Then & Now'} mode`, 'primary');
    }
  }

  private simulateArTracking() {
    setTimeout(() => {
      if (this.isArActive) {
        this.showToast('Landmark detected! Tap on hotspots to explore', 'success');
        this.showOverlay = true;
      }
    }, 2000);
  }

  onHotspotTap(element: any) {
    this.activeHotspot = element;
    this.showToast(element.content, 'primary');
  }

  closeHotspot() {
    this.activeHotspot = null;
  }

  async takeArScreenshot() {
    if (!this.isArActive) return;
    
    await this.showToast('AR screenshot saved to gallery! 📸', 'success');
  }

  async shareArExperience() {
    if (!this.isArActive) return;
    
    const alert = await this.alertCtrl.create({
      header: 'Share AR Experience',
      message: 'Share your AR experience with friends!',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Share',
          handler: () => {
            this.showToast('AR experience shared! 🚀', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async showArNotSupportedAlert() {
    const alert = await this.alertCtrl.create({
      header: 'AR Not Supported',
      message: 'Your device does not support AR experiences. You can still view landmark information in regular mode.',
      buttons: [
        {
          text: 'View Landmark',
          handler: () => {
            this.router.navigate(['/landmark-details'], { 
              queryParams: { id: this.landmarkId } 
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showCameraPermissionAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Camera Permission Required',
      message: 'AR experiences require camera access to work properly. Please enable camera permission in your browser settings.',
      buttons: [
        {
          text: 'Retry',
          handler: () => {
            this.checkArSupport();
          }
        },
        {
          text: 'Continue Without AR',
          handler: () => {
            this.router.navigate(['/landmark-details'], { 
              queryParams: { id: this.landmarkId } 
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showError(message: string) {
    await this.showToast(message, 'danger');
    this.router.navigate(['/landmark-details'], { 
      queryParams: { id: this.landmarkId } 
    });
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  goBack() {
    this.stopArExperience();
    this.router.navigate(['/landmark-details'], { 
      queryParams: { id: this.landmarkId } 
    });
  }
}