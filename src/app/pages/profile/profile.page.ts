import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, ActionSheetController, LoadingController, ModalController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { Subscription } from 'rxjs';
import { LandmarkService, Landmark } from '../../services/landmark.service';
import { AuthService } from '../../services/auth.service';

interface UserSession {
  uid: string;
  email: string;
  name?: string;
  photoURL?: string;
  createdAt?: Date;
  visitCount?: number;
  stampsCollected?: number;
}

interface UserStats {
  totalVisits: number;
  stampsCollected: number;
  badgesEarned: number;
  completedTrivia: number;
  streakDays: number;
  triviaAccuracy?: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedAt?: Date;
  requirement?: string;
  progress?: number;
  target?: number;
}

interface Activity {
  id: string;
  type: 'visit' | 'stamp' | 'badge' | 'trivia';
  description: string;
  timestamp: Date;
  location?: string;
  reward?: number;
  landmarkId?: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit, OnDestroy {

  userSession: UserSession | null = null;
  userStats: UserStats = {
    totalVisits: 0,
    stampsCollected: 0,
    badgesEarned: 0,
    completedTrivia: 0,
    streakDays: 0,
    triviaAccuracy: 0
  };

  statsCards = [
    { icon: 'location-outline', label: 'Visits', value: 0 },
    { icon: 'checkmark-circle-outline', label: 'Stamps', value: 0 },
    { icon: 'trophy-outline', label: 'Badges', value: 0 },
    { icon: 'help-circle-outline', label: 'Trivia', value: 0 }
  ];

  allLandmarks: Landmark[] = [];
  userBadges: Badge[] = [];
  recentActivities: Activity[] = [];
  totalLandmarksCount = 0;

  badges: Badge[] = [];
  recentActivity: Activity[] = [];

  loading = true;
  error = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController,
    private storage: Storage,
    private landmarkService: LandmarkService,
    private authService: AuthService
  ) {}

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
            try {
              await this.authService.signOut();

              await this.storage.clear();
              
              const toast = await this.toastCtrl.create({
                message: 'Logged out successfully',
                duration: 2000,
                position: 'bottom'
              });
              await toast.present();
            } catch (error) {
              console.error('Logout error:', error);
              const errorToast = await this.toastCtrl.create({
                message: 'Error during logout. Please try again.',
                duration: 2000,
                position: 'bottom',
                color: 'danger'
              });
              await errorToast.present();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  formatDate(date?: Date): string {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'visit': return 'location-outline';
      case 'stamp': return 'checkmark-circle-outline';
      case 'badge': return 'trophy-outline';
      case 'trivia': return 'help-circle-outline';
      default: return 'time-outline';
    }
  }

  viewAllBadges() {
    
  }

  viewAllActivity() {
   
  }

  openPrivacy() {
    
  }

  openHelp() {
    
  }

  openAbout() {
    
  }

  openNotifications() {

  }

  async ngOnInit() {
    await this.storage.create();
    
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(async (user) => {
        if (user) {
          await this.loadUserData();
        }
      })
    );
    
    this.subscriptions.push(
      this.authService.userProfile$.subscribe(async (profile) => {
        if (profile) {
          await this.loadUserData();
        }
      })
    );
    
    await this.loadUserData();
    await this.loadUserStats();
    await this.loadBadges();
    await this.loadRecentActivity();
    this.setupLandmarkSubscription();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async loadUserData() {
    try {
      const currentUser = this.authService.getCurrentUser();
      let userProfile = this.authService.getCurrentUserProfile();
      
      if (currentUser) {
        const userName = this.getUserDisplayName(currentUser, userProfile);
        
        this.userSession = {
          uid: currentUser.uid,
          email: currentUser.email || (userProfile ? userProfile.email : ''),
          name: userName,
          photoURL: currentUser.photoURL || (userProfile ? userProfile.photoURL : undefined),
          createdAt: userProfile && userProfile.createdAt ? 
            new Date(userProfile.createdAt.seconds * 1000) : 
            new Date(),
          visitCount: 0,
          stampsCollected: 0
        };
        
        await this.storage.set('userSession', this.userSession);
      } else {
        const sessionData = await this.storage.get('userSession');
        if (sessionData) {
          this.userSession = {
            ...sessionData,
            createdAt: sessionData.createdAt ? new Date(sessionData.createdAt) : new Date()
          };
        } else {
          this.userSession = {
            uid: 'guest_' + Date.now(),
            email: 'guest@histaryo.com',
            name: 'Guest Explorer',
            createdAt: new Date(),
            visitCount: 0,
            stampsCollected: 0
          };
          await this.storage.set('userSession', this.userSession);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.userSession = {
        uid: 'guest_' + Date.now(),
        email: 'guest@histaryo.com',
        name: 'Guest Explorer',
        createdAt: new Date(),
        visitCount: 0,
        stampsCollected: 0
      };
    }
  }

  private getUserDisplayName(currentUser: any, userProfile: any): string {

    if (userProfile && userProfile.fullName) {
      return userProfile.fullName;
    }
    
    if (currentUser.displayName) {
      return currentUser.displayName;
    }
    
    if (currentUser.email) {
      const emailName = currentUser.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + 
             emailName.slice(1).replace(/[._]/g, ' ');
    }
    
    return 'Heritage Explorer';
  }

  private async loadUserStats() {
    if (!this.userSession) return;
    
    try {
      const [stamps, visits, triviaResults] = await Promise.all([
        this.storage.get('stamps') ?? [],
        this.storage.get('visits') ?? [],
        this.storage.get('triviaResults') ?? []
      ]);

      let triviaAccuracy = 0;
      if (Array.isArray(triviaResults) && triviaResults.length > 0) {
        const correctAnswers = triviaResults.filter(result => result.correct).length;
        triviaAccuracy = Math.round((correctAnswers / triviaResults.length) * 100);
      }

      this.userStats = {
        totalVisits: Array.isArray(visits) ? visits.length : 0,
        stampsCollected: Array.isArray(stamps) ? stamps.length : 0,
        badgesEarned: this.calculateBadges(
          Array.isArray(stamps) ? stamps.length : 0, 
          Array.isArray(visits) ? visits.length : 0
        ),
        completedTrivia: Array.isArray(triviaResults) ? triviaResults.length : 0,
        streakDays: this.calculateStreak(Array.isArray(visits) ? visits : []),
        triviaAccuracy
      };

      this.statsCards = [
        { icon: 'location-outline', label: 'Visits', value: this.userStats.totalVisits },
        { icon: 'checkmark-circle-outline', label: 'Stamps', value: this.userStats.stampsCollected },
        { icon: 'trophy-outline', label: 'Badges', value: this.userStats.badgesEarned },
        { icon: 'help-circle-outline', label: 'Trivia', value: this.userStats.completedTrivia }
      ];
      
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  private calculateBadges(stamps: number, visits: number): number {
    let badges = 0;
    if (stamps >= 1) badges++; 
    if (stamps >= 5) badges++; 
    if (stamps >= 10) badges++; 
    if (visits >= 5) badges++;
    if (visits >= 10) badges++; 
    if (visits >= 25) badges++; 
    return badges;
  }

  private calculateStreak(visits: any[]): number {
    if (visits.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    visits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (let i = 0; i < visits.length; i++) {
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

  private async loadBadges() {
    try {
      const stamps = await this.storage.get('stamps') ?? [];
      const visits = await this.storage.get('visits') ?? [];
      const triviaResults = await this.storage.get('triviaResults') ?? [];

      this.userBadges = [
        {
          id: 'first-stamp',
          name: 'First Steps',
          description: 'Collected your first heritage stamp',
          icon: 'footsteps',
          color: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          earned: stamps.length >= 1,
          earnedAt: stamps.length >= 1 ? new Date(stamps[0]?.timestamp || Date.now()) : undefined,
          requirement: 'Collect 1 stamp',
          progress: Math.min(stamps.length, 1),
          target: 1
        },
        {
          id: 'collector',
          name: 'Heritage Collector',
          description: 'Collected 5 heritage stamps',
          icon: 'ribbon',
          color: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
          earned: stamps.length >= 5,
          earnedAt: stamps.length >= 5 ? new Date() : undefined,
          requirement: 'Collect 5 stamps',
          progress: Math.min(stamps.length, 5),
          target: 5
        },
        {
          id: 'hunter',
          name: 'Heritage Hunter',
          description: 'Collected 10 heritage stamps',
          icon: 'trophy',
          color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          earned: stamps.length >= 10,
          requirement: 'Collect 10 stamps',
          progress: Math.min(stamps.length, 10),
          target: 10
        },
        {
          id: 'explorer',
          name: 'Site Explorer',
          description: 'Visited 5 heritage sites',
          icon: 'compass',
          color: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          earned: visits.length >= 5,
          requirement: 'Visit 5 sites',
          progress: Math.min(visits.length, 5),
          target: 5
        },
        {
          id: 'adventurer',
          name: 'Heritage Adventurer',
          description: 'Visited 10 heritage sites',
          icon: 'map',
          color: 'linear-gradient(135deg, #dc2626 0%, #ea580c 100%)',
          earned: visits.length >= 10,
          requirement: 'Visit 10 sites',
          progress: Math.min(visits.length, 10),
          target: 10
        },
        {
          id: 'master',
          name: 'Heritage Master',
          description: 'Visited 25 heritage sites',
          icon: 'star',
          color: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
          earned: visits.length >= 25,
          requirement: 'Visit 25 sites',
          progress: Math.min(visits.length, 25),
          target: 25
        },
        {
          id: 'scholar',
          name: 'Heritage Scholar',
          description: 'Completed 20 trivia questions',
          icon: 'school',
          color: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          earned: triviaResults.length >= 20,
          requirement: 'Complete 20 trivia',
          progress: Math.min(triviaResults.length, 20),
          target: 20
        }
      ];

      this.badges = this.userBadges;
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  }

  private async loadRecentActivity() {
    try {
      const activities = await this.storage.get('activities') ?? [];
      
      this.recentActivities = activities
        .map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }))
        .sort((a: Activity, b: Activity) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10); 

      this.recentActivity = this.recentActivities;
        
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  private setupLandmarkSubscription() {
    const subscription = this.landmarkService.getAllLandmarks().subscribe({
      next: (landmarks) => {
        this.allLandmarks = landmarks;
        this.totalLandmarksCount = landmarks.length;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading landmarks:', error);
        this.loading = false;
      }
    });
    
    this.subscriptions.push(subscription);
  }

  getAchievementLevel(): string {
    const stamps = this.userStats.stampsCollected;
    const visits = this.userStats.totalVisits;
    
    if (stamps === 0 && visits === 0) return 'New Explorer';
    if (stamps < 3 || visits < 3) return 'Heritage Seeker';
    if (stamps < 5 || visits < 5) return 'Cultural Explorer';
    if (stamps < 10 || visits < 10) return 'Heritage Hunter';
    if (stamps < 20 || visits < 20) return 'Heritage Adventurer';
    return 'Heritage Master';
  }

  getFormattedDate(date: Date | string | undefined): string {
    if (!date) return 'Recently';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'Recently';
      
      return dateObj.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Recently';
    }
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return this.getFormattedDate(date);
  }

  getExplorationProgress(): number {
    if (this.totalLandmarksCount === 0) return 0;
    return this.userStats.totalVisits / this.totalLandmarksCount;
  }

  getProgressPercentage(): number {
    return Math.round(this.getExplorationProgress() * 100);
  }

  getTriviaProgress(): number {
    const maxTrivia = this.totalLandmarksCount * 3; 
    if (maxTrivia === 0) return 0;
    return this.userStats.completedTrivia / maxTrivia;
  }

  getTriviaAccuracy(): number {
    return this.userStats.triviaAccuracy || 0;
  }

  getEarnedBadges(): Badge[] {
    return this.userBadges.filter(badge => badge.earned);
  }

  getLockedBadges(): Badge[] {
    return this.userBadges.filter(badge => !badge.earned);
  }

  getRecentActivity(): Activity[] {
    return this.recentActivities;
  }

  async handleRefresh(event: any) {
    try {
      await Promise.all([
        this.loadUserStats(),
        this.loadBadges(),
        this.loadRecentActivity()
      ]);
      
      await this.showToast('Profile updated successfully', 'success');
    } catch (error) {
      await this.showToast('Failed to refresh profile', 'danger');
    } finally {
      event.target.complete();
    }
  }

  onAvatarError(event: any) {
    event.target.src = 'assets/img/default-avatar.png';
  }

  async changeAvatar() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Change Avatar',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => {
            this.takePhoto();
          }
        },
        {
          text: 'Choose from Gallery',
          icon: 'images',
          handler: () => {
            this.chooseFromGallery();
          }
        },
        {
          text: 'Remove Photo',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            this.removeAvatar();
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    
    await actionSheet.present();
  }

  async takePhoto() {
    await this.showToast('Camera functionality coming soon!', 'warning');
  }

  async chooseFromGallery() {
    await this.showToast('Gallery selection coming soon!', 'warning');
  }

  async removeAvatar() {
    if (this.userSession) {
      this.userSession.photoURL = undefined;
      await this.storage.set('userSession', this.userSession);
      await this.showToast('Avatar removed', 'success');
    }
  }

  async openSettings() {
    this.navCtrl.navigateForward('/settings');
  }

  async editProfile() {
    const alert = await this.alertCtrl.create({
      header: 'Edit Profile',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Full Name',
          value: this.userSession?.name || ''
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          value: this.userSession?.email || ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            await this.updateProfile(data);
          }
        }
      ]
    });
    
    await alert.present();
  }

  async updateProfile(data: { name: string; email: string }) {
    try {
      if (this.userSession) {
        this.userSession.name = data.name || this.userSession.name;
        this.userSession.email = data.email || this.userSession.email;
        
        await this.storage.set('userSession', this.userSession);
        await this.showToast('Profile updated successfully', 'success');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      await this.showToast('Failed to update profile', 'danger');
    }
  }


  async showBadgeDetails(badge: Badge) {
    const alert = await this.alertCtrl.create({
      header: badge.name,
      subHeader: badge.earned ? 'Achievement Unlocked!' : 'Locked Badge',
      message: `
        <div style="text-align: center; margin: 20px 0;">
          <ion-icon name="${badge.icon}" style="font-size: 48px; color: ${badge.earned ? '#10b981' : '#6b7280'};"></ion-icon>
        </div>
        <p>${badge.description}</p>
        ${badge.earned ? 
          `<p><strong>Earned:</strong> ${this.getFormattedDate(badge.earnedAt)}</p>` : 
          `<p><strong>Requirement:</strong> ${badge.requirement}</p>
           <p><strong>Progress:</strong> ${badge.progress || 0} / ${badge.target || 1}</p>`
        }
      `,
      buttons: ['Close']
    });
    
    await alert.present();
  }

  async viewFullHistory() {
    this.navCtrl.navigateForward('/activity-history');
  }

  async shareProfile() {
    const profileSummary = `
🏛️ My HistARyo Heritage Journey
👤 ${this.userSession?.name || 'Heritage Explorer'}
📍 ${this.userStats.totalVisits} sites visited
🏆 ${this.userStats.stampsCollected} stamps collected
🎯 ${this.userStats.badgesEarned} badges earned
🔥 ${this.userStats.streakDays} day streak
    
Join me in exploring Cebu's rich heritage! 🌟
`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My HistARyo Profile',
          text: profileSummary,
          url: window.location.origin
        });
      } else {
        await navigator.clipboard.writeText(profileSummary);
        await this.showToast('Profile summary copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      await this.showToast('Failed to share profile', 'danger');
    }
  }

  async exportData() {
    const loading = await this.loadingCtrl.create({
      message: 'Preparing your data...',
      duration: 2000
    });
    await loading.present();

    try {
      const exportData = {
        user: this.userSession,
        stats: this.userStats,
        badges: this.getEarnedBadges(),
        activities: this.recentActivities,
        exportDate: new Date().toISOString()
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileName = `histaryo-profile-${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileName);
      linkElement.click();
      
      await loading.dismiss();
      await this.showToast('Profile data exported successfully!', 'success');
    } catch (error) {
      await loading.dismiss();
      console.error('Error exporting data:', error);
      await this.showToast('Failed to export data', 'danger');
    }
  }

  exploreNow() {
    this.navCtrl.navigateRoot('/home');
  }

  trackByBadgeId(index: number, badge: Badge): string {
    return badge.id;
  }

  trackByActivityId(index: number, activity: Activity): string {
    return activity.id;
  }

  get isCuratorOrAdmin(): boolean {
    const userProfile = this.authService.getCurrentUserProfile();
    return userProfile?.role === 'curator' || userProfile?.role === 'admin';
  }

  openModeration() {
    this.router.navigate(['/moderation']);
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
}