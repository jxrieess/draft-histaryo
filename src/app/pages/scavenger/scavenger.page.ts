import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase.config';

interface ScavengerClue {
  id: string;
  landmarkId: string;
  order: number;
  title: string;
  clue: string;
  question: string;
  options: string[];
  correctAnswer: string;
  hint?: string;
  nextClueId?: string;
  rewardPoints: number;
  requiresLocation?: boolean;
  targetLocation?: { lat: number; lng: number; radius: number };
}

interface ScavengerProgress {
  currentClueIndex: number;
  completedClues: string[];
  totalScore: number;
  startTime: number;
  hints: string[];
}

@Component({
  selector: 'app-scavenger',
  templateUrl: './scavenger.page.html',
  styleUrls: ['./scavenger.page.scss'],
  standalone: false
})
export class ScavengerPage implements OnInit {
  landmarkId: string = '';
  landmarkName: string = '';
  huntId: string = '';
  
  allClues: ScavengerClue[] = [];
  currentClue: ScavengerClue | null = null;
  progress: ScavengerProgress = {
    currentClueIndex: 0,
    completedClues: [],
    totalScore: 0,
    startTime: 0,
    hints: []
  };
  
  selectedAnswer = '';
  showResult = false;
  isAnswered = false;
  loading = true;
  huntCompleted = false;
  showHint = false;
  
  userLocation: { lat: number; lng: number } | null = null;
  locationRequired = false;
  locationVerified = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storage: Storage,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    await this.storage.create();

    this.route.queryParams.subscribe(async (params) => {
      this.landmarkId = params['landmarkId'] || params['id'] || '';
      this.huntId = params['huntId'] || this.landmarkId;
      
      if (this.landmarkId) {
        await this.loadLandmarkInfo();
        await this.loadScavengerHunt();
        await this.loadProgress();
      } else {
        await this.showError('No landmark specified for scavenger hunt');
      }
    });
  }

  async loadLandmarkInfo(): Promise<void> {
    try {
      const landmarkDoc = await getDoc(doc(db, 'landmarks', this.landmarkId));
      if (landmarkDoc.exists()) {
        this.landmarkName = landmarkDoc.data()['name'] || 'Unknown Landmark';
      }
    } catch (error) {
      console.error('Error loading landmark info:', error);
    }
  }

  async loadScavengerHunt(): Promise<void> {
    try {
      const q = query(
        collection(db, 'scavenger_hunts'),
        where('landmarkId', '==', this.landmarkId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        this.allClues = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as ScavengerClue))
          .sort((a, b) => a.order - b.order);
      } else {
        this.allClues = this.getHardcodedScavengerHunt(this.landmarkId);
      }

      if (this.allClues.length === 0) {
        await this.showError('No scavenger hunt available for this landmark');
        return;
      }

    } catch (error) {
      console.error('Error loading scavenger hunt:', error);
      this.allClues = this.getHardcodedScavengerHunt(this.landmarkId);
    } finally {
      this.loading = false;
    }
  }

  getHardcodedScavengerHunt(landmarkId: string): ScavengerClue[] {
    const huntBank: Record<string, ScavengerClue[]> = {
      'fort-san-pedro': [
        {
          id: 'fsp_clue_1',
          landmarkId: 'fort-san-pedro',
          order: 1,
          title: 'The Gateway Guardian',
          clue: '🏰 I am the oldest triangular fortress in the Philippines, built by Spanish conquistadors. Find the main entrance and look for the year inscribed above it.',
          question: 'What year is inscribed above the main entrance of Fort San Pedro?',
          options: ['1565', '1571', '1898', '1521'],
          correctAnswer: '1565',
          hint: 'Look carefully above the main gate - the year marks when construction began.',
          rewardPoints: 100,
          requiresLocation: true,
          targetLocation: { lat: 10.2923, lng: 123.9058, radius: 50 }
        },
        {
          id: 'fsp_clue_2', 
          landmarkId: 'fort-san-pedro',
          order: 2,
          title: 'The Cannon Count',
          clue: '⚔️ Now that you\'ve found the entrance, explore the fort grounds. Count the number of old cannons displayed within the fort walls.',
          question: 'How many historical cannons can you find inside Fort San Pedro?',
          options: ['3', '5', '7', '9'],
          correctAnswer: '5',
          hint: 'Walk around the perimeter and courtyard areas - some cannons are positioned strategically.',
          rewardPoints: 150,
          requiresLocation: true,
          targetLocation: { lat: 10.2923, lng: 123.9058, radius: 30 }
        },
        {
          id: 'fsp_clue_3',
          landmarkId: 'fort-san-pedro',
          order: 3,
          title: 'The Garden Secret',
          clue: '🌺 Within the fort, there\'s a peaceful garden area. Find the monument or plaque that tells the story of this place.',
          question: 'What was Fort San Pedro primarily used for during American occupation?',
          options: ['Military barracks', 'Police station', 'School', 'Prison'],
          correctAnswer: 'Police station',
          hint: 'Read the historical markers carefully - the Americans repurposed the fort.',
          rewardPoints: 200
        }
      ],
      'magellans-cross': [
        {
          id: 'mc_clue_1',
          landmarkId: 'magellans-cross',
          order: 1,
          title: 'The Sacred Symbol',
          clue: '✝️ I am the symbol of Christianity\'s arrival in the Philippines. Look up at my ceiling - what do you see painted there?',
          question: 'What scene is depicted on the ceiling above Magellan\'s Cross?',
          options: ['The Last Supper', 'Baptism of Rajah Humabon', 'Crucifixion of Christ', 'Spanish ships arriving'],
          correctAnswer: 'Baptism of Rajah Humabon',
          hint: 'The painting shows the first Christian baptism in the Philippines.',
          rewardPoints: 100,
          requiresLocation: true,
          targetLocation: { lat: 10.2930, lng: 123.9021, radius: 20 }
        },
        {
          id: 'mc_clue_2',
          landmarkId: 'magellans-cross',
          order: 2,
          title: 'The Protective Shell',
          clue: '🛡️ I am protected by a hardwood casing. Look for the inscription that tells when I was encased for protection.',
          question: 'Why was the original cross encased in tindalo wood?',
          options: ['To preserve it from weather', 'To prevent people from taking pieces', 'For decoration', 'Religious reasons'],
          correctAnswer: 'To prevent people from taking pieces',
          hint: 'People believed taking pieces of the cross would bring good luck and healing.',
          rewardPoints: 150
        }
      ]
    };

    return huntBank[landmarkId] || [
      {
        id: 'default_clue_1',
        landmarkId: landmarkId,
        order: 1,
        title: 'Explore and Discover',
        clue: 'Look around this landmark and find something interesting about its history.',
        question: 'This landmark is located in which city?',
        options: ['Manila', 'Cebu City', 'Davao', 'Iloilo'],
        correctAnswer: 'Cebu City',
        rewardPoints: 50
      }
    ];
  }

  async loadProgress(): Promise<void> {
    try {
      const savedProgress = await this.storage.get(`scavenger_${this.huntId}`);
      if (savedProgress) {
        this.progress = savedProgress;
        
        if (this.progress.completedClues.length >= this.allClues.length) {
          this.huntCompleted = true;
          return;
        }
      } else {
        this.progress.startTime = Date.now();
        await this.saveProgress();
      }
      
      this.loadCurrentClue();
      
    } catch (error) {
      console.error('Error loading progress:', error);
      this.loadCurrentClue();
    }
  }

  loadCurrentClue(): void {
    if (this.progress.currentClueIndex < this.allClues.length) {
      this.currentClue = this.allClues[this.progress.currentClueIndex];
      this.locationRequired = this.currentClue?.requiresLocation || false;
      
      if (this.locationRequired) {
        this.checkUserLocation();
      }
    }
  }

  async checkUserLocation(): Promise<void> {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });
      
      this.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      if (this.currentClue?.targetLocation) {
        const distance = this.calculateDistance(
          this.userLocation,
          this.currentClue.targetLocation
        );
        
        this.locationVerified = distance <= this.currentClue.targetLocation.radius;
        
        if (!this.locationVerified) {
          await this.showLocationPrompt(distance);
        }
      }
      
    } catch (error) {
      console.error('Error getting location:', error);
      await this.showLocationError();
    }
  }

  calculateDistance(pos1: {lat: number, lng: number}, pos2: {lat: number, lng: number}): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI/180;
    const φ2 = pos2.lat * Math.PI/180;
    const Δφ = (pos2.lat-pos1.lat) * Math.PI/180;
    const Δλ = (pos2.lng-pos1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; 
  }

  async showLocationPrompt(distance: number): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Location Required',
      message: `You need to be at the landmark location to answer this clue. You are ${Math.round(distance)}m away. Please move closer to the landmark.`,
      buttons: [
        {
          text: 'Check Again',
          handler: () => {
            this.checkUserLocation();
          }
        },
        {
          text: 'Skip Location Check',
          handler: () => {
            this.locationVerified = true; 
          }
        }
      ]
    });
    await alert.present();
  }

  async showLocationError(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Location Access Required',
      message: 'This scavenger hunt requires location access to verify you are at the landmark. Please enable location services.',
      buttons: [
        {
          text: 'Try Again',
          handler: () => {
            this.checkUserLocation();
          }
        },
        {
          text: 'Continue Anyway',
          handler: () => {
            this.locationVerified = true; 
          }
        }
      ]
    });
    await alert.present();
  }

  selectAnswer(answer: string): void {
    if (this.isAnswered) return;
    this.selectedAnswer = answer;
  }

  async submitAnswer(): Promise<void> {
    if (!this.selectedAnswer || this.isAnswered) return;
    
    if (this.locationRequired && !this.locationVerified) {
      await this.showToast('You must be at the landmark location to submit your answer', 'warning');
      return;
    }

    this.isAnswered = true;
    this.showResult = true;

    const isCorrect = this.selectedAnswer === this.currentClue?.correctAnswer;

    if (isCorrect) {
      this.progress.totalScore += this.currentClue?.rewardPoints || 0;
      this.progress.completedClues.push(this.currentClue?.id || '');
      
      await this.showToast('Correct! Great detective work! 🕵️', 'success');
      
      setTimeout(() => {
        this.nextClue();
      }, 2500);
    } else {
      await this.showToast('Not quite right. Think about the clue again! 🤔', 'warning');
      
      setTimeout(() => {
        this.retryClue();
      }, 2000);
    }

    await this.saveProgress();
  }

  async nextClue(): Promise<void> {
    if (this.progress.currentClueIndex < this.allClues.length - 1) {
      this.progress.currentClueIndex++;
      this.selectedAnswer = '';
      this.showResult = false;
      this.isAnswered = false;
      this.showHint = false;
      this.locationVerified = false;
      
      this.loadCurrentClue();
      await this.saveProgress();
    } else {
      await this.completeHunt();
    }
  }

  retryClue(): void {
    this.selectedAnswer = '';
    this.showResult = false;
    this.isAnswered = false;
  }

  async useHint(): Promise<void> {
    if (!this.currentClue?.hint) return;
    
    this.showHint = true;
    this.progress.hints.push(this.currentClue.id);
    await this.saveProgress();
    await this.showToast('Hint revealed! 💡', 'primary');
  }

  async completeHunt(): Promise<void> {
    this.huntCompleted = true;
    
    const completionTime = Date.now() - this.progress.startTime;
    const minutes = Math.floor(completionTime / 60000);
    
    await this.awardStamp();
    
    await this.saveProgress();
    
    await this.showCompletionAlert(minutes);
  }

  async awardStamp(): Promise<void> {
    try {
      const stamps: string[] = await this.storage.get('stamps') || [];
      if (!stamps.includes(this.landmarkId)) {
        stamps.push(this.landmarkId);
        await this.storage.set('stamps', stamps);
        await this.showToast('🏆 Scavenger Hunt completed! Stamp awarded!', 'success');
      }
    } catch (error) {
      console.error('Error awarding stamp:', error);
    }
  }

  async saveProgress(): Promise<void> {
    try {
      await this.storage.set(`scavenger_${this.huntId}`, this.progress);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  async showCompletionAlert(minutes: number): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: '🎉 Hunt Complete!',
      message: `Congratulations! You completed the ${this.landmarkName} scavenger hunt!\n\nTotal Score: ${this.progress.totalScore} points\nTime: ${minutes} minutes\nHints Used: ${this.progress.hints.length}`,
      buttons: [
        {
          text: 'Start New Hunt',
          handler: () => {
            this.restartHunt();
          }
        },
        {
          text: 'View Progress',
          handler: () => {
            this.router.navigate(['/progress']);
          }
        },
        {
          text: 'Back to Landmark',
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

  async restartHunt(): Promise<void> {
    await this.storage.remove(`scavenger_${this.huntId}`);
    this.progress = {
      currentClueIndex: 0,
      completedClues: [],
      totalScore: 0,
      startTime: Date.now(),
      hints: []
    };
    this.huntCompleted = false;
    this.selectedAnswer = '';
    this.showResult = false;
    this.isAnswered = false;
    this.showHint = false;
    this.locationVerified = false;
    
    this.loadCurrentClue();
    await this.saveProgress();
  }

  get progressPercentage(): number {
    return ((this.progress.currentClueIndex + 1) / this.allClues.length) * 100;
  }

  get completedPercentage(): number {
    return (this.progress.completedClues.length / this.allClues.length) * 100;
  }

  async showError(message: string): Promise<void> {
    await this.showToast(message, 'danger');
    this.router.navigate(['/home']);
  }

  async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  goBack(): void {
    this.router.navigate(['/landmark-details'], { 
      queryParams: { id: this.landmarkId } 
    });
  }

  getOptionColor(option: string): string {
    if (!this.showResult) {
      return this.selectedAnswer === option ? 'tertiary' : 'medium';
    }
    
    if (option === this.currentClue?.correctAnswer) {
      return 'success';
    }
    
    if (this.selectedAnswer === option && option !== this.currentClue?.correctAnswer) {
      return 'danger';
    }
    
    return 'medium';
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}