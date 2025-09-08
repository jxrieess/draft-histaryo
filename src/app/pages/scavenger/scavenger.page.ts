import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Subscription, interval } from 'rxjs';

interface Hunt {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;
  clues: Clue[];
}

interface Clue {
  id: string;
  order: number;
  type: 'location' | 'question' | 'ar_scan' | 'photo';
  title: string;
  description: string;
  hint?: string;
  pointsAwarded: number;
  rewardPoints: number;
  clue: string;
  question: string;
  options?: string[];
  correctAnswer: string | number | boolean;
  
  targetLocation?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  
  questionData?: {
    text: string;
    type: 'multiple_choice' | 'true_false';
    options?: string[];
    correctAnswer: string | number | boolean;
    explanation?: string;
  };
  
  targetObject?: {
    name: string;
    imageUrl?: string;
  };
  
  photoChallenge?: {
    instruction: string;
    requiredElements: string[];
  };
  
  completionCriteria: {
    requiresGPS: boolean;
    requiresPhoto: boolean;
    requiresAnswer: boolean;
  };
}

interface UserProgress {
  huntId: string;
  currentClueIndex: number;
  totalPoints: number;
  totalScore: number;
  startTime: Date;
  completedClues: string[];
  hints: string[];
}

@Component({
  selector: 'app-scavenger',
  templateUrl: './scavenger.page.html',
  styleUrls: ['./scavenger.page.scss'],
  standalone: false
})
export class ScavengerPage implements OnInit, OnDestroy {
  
  // Hunt state
  currentHunt: Hunt | null = null;
  currentClue: Clue | null = null;
  progress: UserProgress | null = null;
  allClues: Clue[] = [];
  landmarkId: string = '';
  
  // UI state
  huntStarted = false;
  huntCompleted = false;
  isLoading = false;
  loadingMessage = '';
  showHint = false;
  showResult = false;
  
  // Location state
  userLocation: any = null;
  locationFound = false;
  locationRequired = false;
  locationVerified = false;
  distanceToTarget = 0;
  locationWatchId: string | null = null;
  
  // Interaction state
  selectedAnswer: any = null;
  hintUsed = false;
  isAnswered = false;
  capturedPhoto: string | null = null;
  
  // Completion state
  finalScore = 0;
  completedClues = 0;
  completionTime = '';
  earnedRewards: any[] = [];
  
  private subscriptions: Subscription[] = [];
  private huntTimer: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.loadHuntFromRoute();
    this.requestLocationPermission();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private cleanup() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.huntTimer) {
      this.huntTimer.unsubscribe();
    }
    if (this.locationWatchId) {
      Geolocation.clearWatch({ id: this.locationWatchId });
    }
  }

  // Navigation methods
  goBack() {
    this.navCtrl.back();
  }

  navigateToProgress() {
    this.navCtrl.navigateForward('/progress');
  }

  navigateToLandmark() {
    this.navCtrl.navigateForward(['/landmark-details'], {
      queryParams: { id: this.landmarkId }
    });
  }

  // User interaction methods
  checkUserLocation() {
    this.getCurrentLocation();
  }

  useHint() {
    if (this.currentClue?.hint) {
      this.showHint = true;
      this.hintUsed = true;
      if (this.progress && this.currentClue.id) {
        this.progress.hints.push(this.currentClue.id);
      }
      this.showToast('Hint revealed!');
    }
  }

  selectAnswer(option: any) {
    this.selectedAnswer = option;
  }

  getOptionColor(option: any): string {
    if (!this.showResult) return 'medium';
    if (option === this.currentClue?.correctAnswer) return 'success';
    if (option === this.selectedAnswer && option !== this.currentClue?.correctAnswer) return 'danger';
    return 'medium';
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  restartHunt() {
    if (this.currentHunt) {
      localStorage.removeItem(`hunt-progress-${this.currentHunt.id}`);
      this.progress = null;
      this.huntStarted = false;
      this.huntCompleted = false;
      this.currentClue = null;
      this.resetClueState();
      this.startHunt();
    }
  }

  // Hunt Loading & Initialization
  private async loadHuntFromRoute() {
    const huntId = this.route.snapshot.paramMap.get('huntId') || 'default-hunt';
    this.landmarkId = this.route.snapshot.paramMap.get('landmarkId') || 'default-landmark';

    this.isLoading = true;
    this.loadingMessage = 'Loading scavenger hunt...';

    try {
      this.currentHunt = await this.loadMockHuntData(huntId);
      this.allClues = this.currentHunt.clues;
      
      const savedProgress = localStorage.getItem(`hunt-progress-${huntId}`);
      if (savedProgress) {
        const shouldResume = await this.askToResumeProgress();
        if (shouldResume) {
          this.progress = JSON.parse(savedProgress);
          this.resumeHunt();
        }
      }
    } catch (error) {
      this.showToast('Failed to load scavenger hunt', 'danger');
      this.navCtrl.back();
    } finally {
      this.isLoading = false;
    }
  }

  private async loadMockHuntData(huntId: string): Promise<Hunt> {
    const mockClues: Clue[] = [
      {
        id: 'clue-1',
        order: 1,
        type: 'location',
        title: 'Find the Main Gate',
        description: 'Locate the main entrance where Spanish soldiers once stood guard.',
        hint: 'Look for the side facing the old port area',
        pointsAwarded: 50,
        rewardPoints: 50,
        clue: 'Locate the main entrance where Spanish soldiers once stood guard.',
        question: '',
        correctAnswer: '',
        targetLocation: {
          latitude: 10.293722,
          longitude: 123.906750,
          radius: 15
        },
        completionCriteria: {
          requiresGPS: true,
          requiresPhoto: true,
          requiresAnswer: false
        }
      },
      {
        id: 'clue-2',
        order: 2,
        type: 'question',
        title: 'Fort History Quiz',
        description: 'Test your knowledge about this historic fortification.',
        pointsAwarded: 75,
        rewardPoints: 75,
        clue: 'Test your knowledge about this historic fortification.',
        question: 'What shape is Fort San Pedro famous for?',
        options: ['Square', 'Circular', 'Triangular', 'Star-shaped'],
        correctAnswer: 2,
        questionData: {
          text: 'What shape is Fort San Pedro famous for?',
          type: 'multiple_choice',
          options: ['Square', 'Circular', 'Triangular', 'Star-shaped'],
          correctAnswer: 2,
          explanation: 'Fort San Pedro is famous for being the smallest triangular fort in the Philippines!'
        },
        completionCriteria: {
          requiresGPS: false,
          requiresPhoto: false,
          requiresAnswer: true
        }
      },
      {
        id: 'clue-3',
        order: 3,
        type: 'photo',
        title: 'Architectural Beauty',
        description: 'Capture the unique triangular design of the fort.',
        pointsAwarded: 100,
        rewardPoints: 100,
        clue: 'Capture the unique triangular design of the fort.',
        question: '',
        correctAnswer: '',
        photoChallenge: {
          instruction: 'Take a photo showing the triangular shape of the fort from an elevated view.',
          requiredElements: ['fort walls', 'triangular shape', 'corner bastions']
        },
        completionCriteria: {
          requiresGPS: true,
          requiresPhoto: true,
          requiresAnswer: false
        }
      },
      {
        id: 'clue-4',
        order: 4,
        type: 'ar_scan',
        title: 'Historical Artifact',
        description: 'Scan the memorial plaque with AR to unlock hidden content.',
        pointsAwarded: 80,
        rewardPoints: 80,
        clue: 'Scan the memorial plaque with AR to unlock hidden content.',
        question: '',
        correctAnswer: '',
        targetObject: {
          name: 'Memorial Plaque',
          imageUrl: 'assets/img/plaque-preview.jpg'
        },
        completionCriteria: {
          requiresGPS: false,
          requiresPhoto: false,
          requiresAnswer: false
        }
      }
    ];

    return {
      id: huntId,
      title: 'Secrets of Fort San Pedro',
      description: 'Discover the hidden stories of the Philippines\' smallest triangular fort.',
      imageUrl: 'assets/img/fort-san-pedro.jpg',
      difficulty: 'medium',
      estimatedDuration: 45,
      clues: mockClues
    };
  }

  private async askToResumeProgress(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: 'Resume Hunt?',
        message: 'You have an unfinished scavenger hunt. Would you like to continue where you left off?',
        buttons: [
          {
            text: 'Start Over',
            handler: () => {
              localStorage.removeItem(`hunt-progress-${this.currentHunt?.id}`);
              resolve(false);
            }
          },
          {
            text: 'Resume',
            handler: () => resolve(true)
          }
        ]
      });
      await alert.present();
    });
  }

  // Hunt Control Methods
  async startHunt() {
    if (!this.currentHunt) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.log('Haptics not available');
    }

    this.progress = {
      huntId: this.currentHunt.id,
      currentClueIndex: 0,
      totalPoints: 0,
      totalScore: 0,
      startTime: new Date(),
      completedClues: [],
      hints: []
    };

    this.huntStarted = true;
    this.loadCurrentClue();
    this.startLocationTracking();
    this.startHuntTimer();
    this.saveProgress();

    this.showToast('Hunt started! Good luck exploring!');
  }

  private resumeHunt() {
    this.huntStarted = true;
    this.loadCurrentClue();
    this.startLocationTracking();
    this.startHuntTimer();
    this.showToast('Resuming your hunt...');
  }

  private loadCurrentClue() {
    if (!this.currentHunt || !this.progress) return;

    if (this.progress.currentClueIndex >= this.currentHunt.clues.length) {
      this.completeHunt();
      return;
    }

    this.currentClue = this.currentHunt.clues[this.progress.currentClueIndex];
    this.resetClueState();

    this.locationRequired = this.currentClue.completionCriteria.requiresGPS;

    if (this.currentClue.type === 'location') {
      this.checkLocationProximity();
    }
  }

  private resetClueState() {
    this.selectedAnswer = null;
    this.hintUsed = false;
    this.isAnswered = false;
    this.showResult = false;
    this.showHint = false;
    this.capturedPhoto = null;
    this.locationFound = false;
    this.locationVerified = false;
  }

  // Location Handling
  private async requestLocationPermission() {
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location === 'granted') {
        this.getCurrentLocation();
      } else {
        this.showToast('Location permission required for full experience', 'warning');
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  }

  private async getCurrentLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      this.checkLocationProximity();
    } catch (error) {
      console.error('Error getting location:', error);
    }
  }

  private async startLocationTracking() {
    try {
      this.locationWatchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000
        },
        (position) => {
          if (position) {
            this.userLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            this.checkLocationProximity();
          }
        }
      );
    } catch (error) {
      console.error('Error watching location:', error);
    }
  }

  private checkLocationProximity() {
    if (!this.currentClue || !this.userLocation || this.currentClue.type !== 'location') {
      return;
    }

    const target = this.currentClue.targetLocation!;
    const distance = this.calculateDistance(
      this.userLocation.latitude,
      this.userLocation.longitude,
      target.latitude,
      target.longitude
    );

    this.distanceToTarget = Math.round(distance);
    const wasLocationFound = this.locationFound;
    this.locationFound = distance <= target.radius;
    this.locationVerified = this.locationFound;

    if (this.locationFound && !wasLocationFound) {
      try {
        Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (error) {
        console.log('Haptics not available');
      }
      this.showToast('Location found! You\'re at the right spot!');
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
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

  // Clue Interaction Methods
  async handleLocationClue() {
    if (!this.locationFound) {
      this.showToast('You need to be at the target location first!', 'warning');
      return;
    }

    if (this.currentClue?.completionCriteria.requiresPhoto) {
      await this.capturePhoto();
      if (this.capturedPhoto) {
        this.completeCurrentClue();
      }
    } else {
      this.completeCurrentClue();
    }
  }

  async submitAnswer() {
    if (!this.currentClue || this.selectedAnswer === null || this.selectedAnswer === undefined) {
      return;
    }

    this.isAnswered = true;
    this.showResult = true;

    const correct = this.selectedAnswer === this.currentClue.correctAnswer;
    
    if (correct) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (error) {
        console.log('Haptics not available');
      }
      
      setTimeout(() => {
        this.completeCurrentClue();
      }, 2000);
    } else {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.log('Haptics not available');
      }
      this.showToast('Not quite right. Try again!', 'warning');
    }
  }

  async capturePhoto() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl
      });
      
      this.capturedPhoto = image.dataUrl!;
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        console.log('Haptics not available');
      }
      this.showToast('Photo captured!');
      
    } catch (error) {
      console.error('Camera error:', error);
      this.showToast('Failed to capture photo', 'danger');
    }
  }

  async submitPhoto() {
    if (this.capturedPhoto) {
      this.completeCurrentClue();
    }
  }

  async retakePhoto() {
    this.capturedPhoto = null;
  }

  async startARScan() {
    this.isLoading = true;
    this.loadingMessage = 'Starting AR scanner...';
    
    setTimeout(async () => {
      this.isLoading = false;
      const success = Math.random() > 0.3;
      
      if (success) {
        try {
          await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (error) {
          console.log('Haptics not available');
        }
        const alert = await this.alertCtrl.create({
          header: 'AR Object Found!',
          message: 'Great job! You\'ve successfully scanned the historical artifact.',
          buttons: [
            {
              text: 'View AR Content',
              handler: () => this.completeCurrentClue()
            }
          ]
        });
        await alert.present();
      } else {
        this.showToast('Object not detected. Try adjusting your camera angle.', 'warning');
      }
    }, 2000);
  }

  // Progress Management
  private completeCurrentClue() {
    if (!this.progress || !this.currentClue) return;

    this.progress.totalPoints += this.currentClue.pointsAwarded;
    this.progress.totalScore = this.progress.totalPoints;
    this.progress.completedClues.push(this.currentClue.id);
    
    this.progress.currentClueIndex++;
    
    this.saveProgress();
    
    if (this.progress.currentClueIndex >= this.totalClues) {
      this.completeHunt();
    } else {
      this.loadCurrentClue();
      this.showToast(`Clue completed! +${this.currentClue.pointsAwarded} points`);
    }
  }

  private completeHunt() {
    this.huntCompleted = true;
    this.huntStarted = false;
    
    if (this.progress) {
      this.finalScore = this.progress.totalPoints;
      this.completedClues = this.progress.completedClues.length;
      this.completionTime = this.calculateCompletionTime();
      this.earnedRewards = this.calculateRewards();
    }

    localStorage.removeItem(`hunt-progress-${this.currentHunt?.id}`);
    
    if (this.locationWatchId) {
      Geolocation.clearWatch({ id: this.locationWatchId });
    }

    try {
      Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.log('Haptics not available');
    }
    
    this.showToast('Congratulations! Hunt completed!');
  }

  private saveProgress() {
    if (this.progress) {
      localStorage.setItem(
        `hunt-progress-${this.progress.huntId}`, 
        JSON.stringify(this.progress)
      );
    }
  }

  private startHuntTimer() {
    this.huntTimer = interval(1000).subscribe(() => {
      // Update any time-based UI elements
    });
  }

  private calculateCompletionTime(): string {
    if (!this.progress?.startTime) return '0m';
    
    const minutes = Math.floor((Date.now() - this.progress.startTime.getTime()) / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  private calculateRewards(): any[] {
    const rewards = [];
    
    if (this.finalScore >= 200) {
      rewards.push({ type: 'badge', name: 'Fort Explorer' });
    }
    
    if (this.completedClues === this.totalClues) {
      rewards.push({ type: 'stamp', name: 'Heritage Collector' });
    }
    
    rewards.push({ type: 'points', name: `${this.finalScore} Explorer Points` });
    
    return rewards;
  }

  // UI Actions
  async exitHunt() {
    if (this.huntStarted && !this.huntCompleted) {
      const alert = await this.alertCtrl.create({
        header: 'Exit Hunt?',
        message: 'Your progress will be saved and you can resume later.',
        buttons: [
          {
            text: 'Continue Hunt',
            role: 'cancel'
          },
          {
            text: 'Exit',
            handler: () => this.navCtrl.back()
          }
        ]
      });
      await alert.present();
    } else {
      this.navCtrl.back();
    }
  }

  async shareCompletion() {
    try {
      await Share.share({
        title: 'HistARyo Achievement',
        text: `I just completed "${this.currentHunt?.title}" and earned ${this.finalScore} points!`,
        url: window.location.href
      });
    } catch (error) {
      this.showToast('Sharing not available on this device', 'warning');
    }
  }

  async showHuntInfo() {
    const alert = await this.alertCtrl.create({
      header: this.currentHunt?.title,
      subHeader: `${this.currentHunt?.difficulty?.toUpperCase()} • ${this.currentHunt?.estimatedDuration}min`,
      message: this.currentHunt?.description,
      buttons: ['Close']
    });
    await alert.present();
  }

  async pauseHunt() {
    this.showToast('Hunt paused. Progress saved.');
  }

  async showProgress() {
    const alert = await this.alertCtrl.create({
      header: 'Hunt Progress',
      message: `Clues completed: ${this.progress?.completedClues.length || 0}/${this.totalClues}\nPoints: ${this.progress?.totalPoints || 0}`,
      buttons: ['Close']
    });
    await alert.present();
  }

  async showMap() {
    this.showToast('Map view coming soon!');
  }

  // Helper Methods & Getters
  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  get totalClues(): number {
    return this.currentHunt?.clues.length || 0;
  }

  get totalPoints(): number {
    return this.currentHunt?.clues.reduce((sum, clue) => sum + clue.pointsAwarded, 0) || 0;
  }

  get progressPercentage(): number {
    if (!this.progress || this.totalClues === 0) return 0;
    return (this.progress.currentClueIndex / this.totalClues) * 100;
  }

  get landmarkName(): string {
    return 'Heritage Site';
  }

  getDifficultyColor(difficulty: string = 'medium'): string {
    const colors = { easy: 'success', medium: 'warning', hard: 'danger' };
    return colors[difficulty as keyof typeof colors] || 'medium';
  }

  getDifficultyIcon(difficulty: string = 'medium'): string {
    const icons = { easy: 'checkmark-circle', medium: 'alert-circle', hard: 'warning' };
    return icons[difficulty as keyof typeof icons] || 'help-circle';
  }

  getDifficultyLabel(difficulty: string = 'medium'): string {
    const labels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
    return labels[difficulty as keyof typeof labels] || 'Medium';
  }

  getClueIcon(type: string): string {
    const icons = {
      location: 'location',
      question: 'help-circle',
      ar_scan: 'camera',
      photo: 'camera-outline'
    };
    return icons[type as keyof typeof icons] || 'help-circle';
  }

  getClueTypeLabel(type: string): string {
    const labels = {
      location: 'Find Location',
      question: 'Answer Question',
      ar_scan: 'AR Experience',
      photo: 'Photo Challenge'
    };
    return labels[type as keyof typeof labels] || 'Unknown';
  }

  getRewardIcon(type: string): string {
    const icons = {
      badge: 'medal',
      stamp: 'bookmark',
      points: 'trophy'
    };
    return icons[type as keyof typeof icons] || 'gift';
  }
}