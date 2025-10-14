import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import {collection, doc, getDoc, getDocs, query, where, addDoc, serverTimestamp, orderBy} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { db } from '../../firebase.config';
import { TriviaManagerComponent } from '../../components/trivia-manager/trivia-manager.component';

interface LandmarkDoc {
  name: string;
  description: string;
  image_path?: string;
  then_image_path?: string;
  now_image_path?: string;
  video_url?: string;
  latitude?: number | string;
  longitude?: number | string;
  slug?: string;
  category?: string;
  city?: string;
  historical_significance?: string;
  construction_date?: string;
  architect?: string;
  architectural_style?: string;
  fun_facts?: string[];
  visiting_tips?: string[];
}

interface LandmarkVM {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  thenUrl?: string;
  nowUrl?: string;
  videoUrl?: string;
  latitude?: number | string;
  longitude?: number | string;
  category?: string;
  city?: string;
  historicalSignificance?: string;
  constructionDate?: string;
  architect?: string;
  architecturalStyle?: string;
  funFacts?: string[];
  visitingTips?: string[];
  curatorImages?: CuratorImage[];
}

interface CuratorImage {
  id: string;
  imageUrl: string;
  title: string;
  description?: string;
  submittedBy: string;
  submittedAt: Date;
  landmarkId: string;
  status: 'approved' | 'pending' | 'rejected';
  likes: number;
  tags?: string[];
}

interface UserTip {
  id?: string;
  landmarkId: string;
  landmarkName: string;
  userId: string;
  userName: string;
  userEmail: string;
  tipText: string;
  tipType: 'general' | 'visiting' | 'historical' | 'photo' | 'other';
  rating: number;
  isApproved: boolean;
  createdAt: any;
  updatedAt: any;
}

@Component({
  selector: 'app-landmark-details',
  templateUrl: './landmark-details.page.html',
  styleUrls: ['./landmark-details.page.scss'],
  standalone: false
})
export class LandmarkDetailsPage implements OnInit, OnDestroy {
  landmark: LandmarkVM | null = null;
  loading = true;
  activeTab = 'story';
  sliderValue = 50;
  isStamped = false;
  canCollectStamp = false; 
  isBookmarked = false;
  showArExperience = false;
  arContent: any = null;

  triviaQuestions: any[] = [];
  hasScavengerHunt = false;
  userTips: any[] = [];
  nearbyLandmarks: any[] = [];
  currentImageIndex = 0;

  private storageSvc = getStorage();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private local: Storage,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) {}

  getDefaultImageUrl(imageUrl?: string, category?: string, landmarkId?: string, landmarkName?: string): string {
    if (landmarkName) {
      const name = landmarkName.toLowerCase().trim();
      
      if (name.includes('basilica') || name.includes('santo niño') || name.includes('santo nino')) {
        return 'assets/img/basilica.jpg';
      }
      
      if (name.includes('casa gorordo') || name.includes('gorordo')) {
        return 'assets/img/Casa-Gorordo.jpg';
      }
      
      if (name.includes('cathedral') || name.includes('archdiocesan')) {
        return 'assets/img/Cathedral-Museum.jpg';
      }
      
      if (name.includes('fort san pedro') || name.includes('fort') && name.includes('san pedro')) {
        return 'assets/img/fort-san-pedro.jpg';
      }
      
      if (name.includes('magellan') || name.includes('cross')) {
        return 'assets/img/magellans-cross.jpg';
      }
      
      if (name.includes('liberty') || name.includes('lapu-lapu') || name.includes('mactan')) {
        return 'assets/img/Liberty-Shrine.jpg';
      }
      
      if (name.includes('joseph') || name.includes('mandaue')) {
        return 'assets/img/Nat-Shrine-of-St.Joseph.jpg';
      }
      
      if (name.includes('san isidro') || name.includes('isidro') || name.includes('talisay')) {
        return 'assets/img/San-Isidro-Labrador.jpg';
      }
    }

    if (category) {
      const cat = category.toLowerCase();
      if (cat === 'religious') return 'assets/img/basilica.jpg';
      if (cat === 'historical') return 'assets/img/fort-san-pedro.jpg';
      if (cat === 'cultural') return 'assets/img/magellans-cross.jpg';
      if (cat === 'museum') return 'assets/img/Cathedral-Museum.jpg';
      if (cat === 'architecture') return 'assets/img/Casa-Gorordo.jpg';
      if (cat === 'park') return 'assets/img/Liberty-Shrine.jpg';
    }

    return 'assets/img/default-landmark.jpg';
  }

  async ngOnInit(): Promise<void> {
    await this.local.create();
    await this.loadLandmarkFromRoute();
    if (this.landmark) {
      await this.loadUserTips();
    }
  }

  ngOnDestroy(): void {
  }

  private async loadLandmarkFromRoute(): Promise<void> {
    this.loading = true;
    this.landmark = null;

    const timeoutPromise = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('Loading timeout')), 30000) 
    );

    const loadPromise = this.performLandmarkLoad();

    try {
      await Promise.race([loadPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error loading landmark:', error);
      
      if (error instanceof Error && error.message === 'Loading timeout') {
        await this.showToast('Heritage site details are taking longer to load. This might be due to a slow connection. Please try refreshing or check your internet connection.', 'warning');
      } else {
        await this.showToast('Failed to load landmark details. Please check your connection and try again.', 'danger');
      }
      
      this.router.navigate(['/home']);
    } finally {
      this.loading = false;
    }
  }

  private async performLandmarkLoad(): Promise<void> {
    const routeId = this.route.snapshot.paramMap.get('id');
    const queryId = this.route.snapshot.queryParamMap.get('id');
    const slug = this.route.snapshot.queryParamMap.get('slug');


    const landmarkId = routeId || queryId;

    if (landmarkId) {
      await this.loadById(landmarkId);
    } else if (slug) {
      await this.loadBySlug(slug);
    } else {
      await this.showToast('Invalid landmark link.', 'danger');
      this.router.navigate(['/home']);
      return;
    }

    const currentLandmark = this.landmark as LandmarkVM | null;
    
    if (currentLandmark !== null && currentLandmark.id) {
      
      const additionalDataPromises = [
        this.syncStamp(currentLandmark.id),
        this.syncBookmark(currentLandmark.id),
        this.loadArContent(currentLandmark.id),
        this.loadTriviaQuestions(currentLandmark.id),
        this.checkScavengerHunt(currentLandmark.id),
        this.loadUserTips()
      ].map(promise => 
        Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Additional data timeout')), 10000)
          )
        ]).catch(error => {
          console.warn('Additional data loading failed:', error);
          return null; 
        })
      );
      
      await Promise.all(additionalDataPromises);
    } else {
      await this.showToast('Landmark not found.', 'danger');
      this.router.navigate(['/home']);
    }
  }

  private async loadById(id: string): Promise<void> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Firebase timeout')), 15000)
      );
      
      const firebasePromise = getDoc(doc(db, 'landmarks', id));
      const snap = await Promise.race([firebasePromise, timeoutPromise]);
      
      if (!snap.exists()) {
        await this.showToast('Landmark not found.', 'danger');
        this.landmark = null;
        return;
      }
      const data = snap.data() as LandmarkDoc;
      this.landmark = await this.toVM(snap.id, data);
    } catch (error) {
      console.error('Error loading landmark by ID:', error);
      if (error instanceof Error && error.message === 'Firebase timeout') {
        throw new Error('Connection timeout - please check your internet connection');
      }
      this.landmark = null;
      throw error;
    }
  }

  private async loadBySlug(slug: string): Promise<void> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Firebase timeout')), 15000)
      );
      
      const q = query(collection(db, 'landmarks'), where('slug', '==', slug));
      const firebasePromise = getDocs(q);
      const snap = await Promise.race([firebasePromise, timeoutPromise]);
      
      if (snap.empty) {
        await this.showToast('Landmark not found.', 'danger');
        this.landmark = null;
        return;
      }
      const d = snap.docs[0];
      this.landmark = await this.toVM(d.id, d.data() as LandmarkDoc);
    } catch (error) {
      console.error('Error loading landmark by slug:', error);
      if (error instanceof Error && error.message === 'Firebase timeout') {
        throw new Error('Connection timeout - please check your internet connection');
      }
      this.landmark = null;
      throw error;
    }
  }

  private async toVM(id: string, data: LandmarkDoc): Promise<LandmarkVM> {
    const [img, thenImg, nowImg, curatorImages] = await Promise.all([
      this.resolveImage(data.image_path),
      this.resolveImage(data.then_image_path),
      this.resolveImage(data.now_image_path),
      this.loadCuratorImages(id)
    ]);

    return {
      id,
      name: data.name,
      description: data.description,
      imageUrl: img ?? 'assets/img/placeholder.jpg',
      thenUrl: thenImg || undefined,
      nowUrl: nowImg || undefined,
      videoUrl: data.video_url,
      latitude: data.latitude,
      longitude: data.longitude,
      category: data.category,
      city: data.city,
      historicalSignificance: data.historical_significance,
      constructionDate: data.construction_date,
      architect: data.architect,
      architecturalStyle: data.architectural_style,
      funFacts: data.fun_facts || [],
      visitingTips: data.visiting_tips || [],
      curatorImages: curatorImages
    };
  }

  private async resolveImage(pathOrUrl?: string): Promise<string | null> {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Image load timeout')), 5000)
      );
      
      const imagePromise = getDownloadURL(ref(this.storageSvc, pathOrUrl));
      
      return await Promise.race([imagePromise, timeoutPromise]);
    } catch (error) {
      console.warn('Failed to load image:', pathOrUrl, error);
      return null;
    }
  }

  private async loadArContent(landmarkId: string): Promise<void> {
    try {
      const arDoc = await getDoc(doc(db, 'ar_content', landmarkId));
      if (arDoc.exists()) {
        this.arContent = arDoc.data();
      }
    } catch (error) {
      console.error('Error loading AR content:', error);
    }
  }

  private async loadTriviaQuestions(landmarkId: string): Promise<void> {
    try {
      const triviaRef = collection(db, 'trivia');
      const q = query(triviaRef, where('landmark_id', '==', landmarkId));
      const querySnapshot = await getDocs(q);
      
      
      this.triviaQuestions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        question: doc.data()['question'] || '',
        options: doc.data()['options'] || doc.data()['choices'] || [],
        correctAnswer: doc.data()['correct_answer'] || doc.data()['correctAnswer'] || 0,
        explanation: doc.data()['explanation'],
        difficulty: doc.data()['difficulty'] || 'medium',
        landmarkId: doc.data()['landmark_id'] || doc.data()['landmarkId']
      }));
      
    } catch (error) {
      console.error('Error loading trivia questions:', error);
    }
  }

  private async checkScavengerHunt(landmarkId: string): Promise<void> {
    try {
      const huntRef = collection(db, 'scavenger_hunts');
      const q = query(huntRef, where('landmarkId', '==', landmarkId));
      const querySnapshot = await getDocs(q);
      
      this.hasScavengerHunt = !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking scavenger hunt:', error);
    }
  }


  async launchArExperience(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) {
      await this.showToast('No landmark data available', 'danger');
      return;
    }

    if (!this.isArSupported()) {
      const alert = await this.alertCtrl.create({
        header: 'AR Not Supported',
        message: 'Your device does not support AR experiences. You can still view landmark information in regular mode.',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Starting AR Experience...',
      duration: 2000
    });
    await loading.present();

    try {
      this.showArExperience = true;
      await this.showToast('AR Experience launched! 🚀', 'success');
      
      this.router.navigate(['/ar-experience'], { 
        queryParams: { 
          id: currentLandmark.id,
          name: currentLandmark.name
        } 
      });
    } catch (error) {
      console.error('Error launching AR experience:', error);
      await this.showToast('Failed to launch AR experience', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private isArSupported(): boolean {
    return 'xr' in navigator || 'mediaDevices' in navigator;
  }

  async collectStamp(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark || this.isStamped) return;

    const loading = await this.loadingCtrl.create({
      message: 'Collecting stamp...'
    });
    await loading.present();

    try {
      const stamps: string[] = (await this.local.get('stamps')) || [];
      stamps.push(currentLandmark.id);
      await this.local.set('stamps', stamps);
      
      this.isStamped = true;
      this.canCollectStamp = false; 
      
      await this.updateUserSessionStats();
      
      await this.showToast('Stamp collected! 🎉', 'success');
      
      await this.recordVisit(currentLandmark.id);
    } catch (error) {
      console.error('Error collecting stamp:', error);
      await this.showToast('Failed to collect stamp', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private async updateUserSessionStats(): Promise<void> {
    try {
      const stamps = await this.local.get('stamps') ?? [];
      const visits = await this.local.get('visits') ?? [];
      const userSession = await this.local.get('userSession');
      
      if (userSession) {
        userSession.stampsCollected = Array.isArray(stamps) ? stamps.length : 0;
        userSession.visitCount = Array.isArray(visits) ? visits.length : 0;
        await this.local.set('userSession', userSession);
        
      }
    } catch (error) {
      console.error('❌ Error updating user session stats:', error);
    }
  }

  async toggleBookmark(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;

    try {
      const bookmarks: string[] = (await this.local.get('bookmarks')) || [];
      
      if (this.isBookmarked) {
        const index = bookmarks.indexOf(currentLandmark.id);
        if (index > -1) {
          bookmarks.splice(index, 1);
        }
        this.isBookmarked = false;
        await this.showToast('Bookmark removed', 'medium');
      } else {
        bookmarks.push(currentLandmark.id);
        this.isBookmarked = true;
        await this.showToast('Landmark bookmarked! 📌', 'success');
      }
      
      await this.local.set('bookmarks', bookmarks);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      await this.showToast('Failed to update bookmark', 'danger');
    }
  }

  private async recordVisit(landmarkId: string): Promise<void> {
    try {
      const visits: any[] = (await this.local.get('visits')) || [];
      const visitRecord = {
        landmarkId,
        timestamp: new Date().toISOString(),
        date: new Date().toDateString()
      };
      visits.push(visitRecord);
      await this.local.set('visits', visits);
    } catch (error) {
      console.error('Error recording visit:', error);
    }
  }

  startScavengerHunt(): void {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;
    
    if (!this.hasScavengerHunt) {
      this.showToast('No scavenger hunt available for this landmark', 'warning');
      return;
    }
    
    this.router.navigate(['/scavenger'], { 
      queryParams: { 
        landmarkId: currentLandmark.id,
        huntId: `hunt-${currentLandmark.id}`
      } 
    });
  }

  async viewTips(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;

    await this.loadUserTips();
    
    if (this.userTips.length === 0) {
      this.showToast('No tips available yet. Be the first to share one!', 'medium');
      return;
    }

    const tipsText = this.userTips.map((tip, index) => 
      `${index + 1}. ${tip.tipText}\n   - ${tip.userName} (${tip.tipType})\n   Rating: ${tip.rating}/5\n`
    ).join('\n');

    const alert = await this.alertCtrl.create({
      header: `Tips for ${currentLandmark.name}`,
      message: tipsText,
      buttons: [
        {
          text: 'Close',
          role: 'cancel'
        },
        {
          text: 'Submit a Tip',
          handler: () => {
            this.submitTip();
          }
        }
      ]
    });

    await alert.present();
  }

  private async loadUserTips(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;

    try {
      const tipsRef = collection(db, 'user_tips');
      const q = query(tipsRef, 
        where('landmarkId', '==', currentLandmark.id),
        where('isApproved', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      this.userTips = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error loading tips:', error);
      this.userTips = [];
    }
  }

  async submitTip(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;

    const alert = await this.alertCtrl.create({
      header: 'Submit a Tip',
      subHeader: `Share your experience about ${currentLandmark.name}`,
      inputs: [
        {
          name: 'tipText',
          type: 'textarea',
          placeholder: 'Share your tip, experience, or advice about this landmark...',
          attributes: {
            maxlength: 500,
            rows: 4
          }
        },
        {
          name: 'tipType',
          type: 'text',
          placeholder: 'Tip type (general, visiting, historical, photo, other)',
          value: 'general'
        },
        {
          name: 'rating',
          type: 'number',
          placeholder: 'Rating (1-5)',
          min: 1,
          max: 5,
          value: 5
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Submit Tip',
          handler: async (data) => {
            if (data.tipText && data.tipText.trim().length > 0) {
              await this.saveTip(data, currentLandmark);
            } else {
              this.showToast('Please enter a tip before submitting', 'warning');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async saveTip(tipData: any, landmark: LandmarkVM): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Submitting your tip...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const user = await this.local.get('user');
      const userId = user?.uid || 'anonymous';
      const userName = user?.displayName || 'Anonymous User';
      const userEmail = user?.email || 'anonymous@example.com';

      const tip: UserTip = {
        landmarkId: landmark.id,
        landmarkName: landmark.name,
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        tipText: tipData.tipText.trim(),
        tipType: tipData.tipType || 'general',
        rating: parseInt(tipData.rating) || 5,
        isApproved: false, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const tipsRef = collection(db, 'user_tips');
      await addDoc(tipsRef, tip);

      await loading.dismiss();
      this.showToast('Thank you! Your tip has been submitted for review.', 'success');
      
      await this.loadUserTips();
      
    } catch (error) {
      console.error('Error saving tip:', error);
      await loading.dismiss();
      this.showToast('Failed to submit tip. Please try again.', 'danger');
    }
  }

  async shareLandmark(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: currentLandmark.name,
          text: currentLandmark.description,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        await this.showToast('Link copied to clipboard! 📋', 'success');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      try {
        await navigator.clipboard.writeText(window.location.href);
        await this.showToast('Link copied to clipboard! 📋', 'success');
      } catch (clipboardError) {
        await this.showToast('Sharing not available', 'warning');
      }
    }
  }

  async openInMaps(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark || !currentLandmark.id) {
      await this.showToast('Landmark information not available', 'warning');
      return;
    }

    
    this.router.navigate(['/map'], {
      queryParams: { 
        landmarkId: currentLandmark.id,
        landmarkName: currentLandmark.name
      }
    }).then(success => {
      if (success) {
        this.showToast(`Opening ${currentLandmark.name} on map`, 'success');
      } else {
        console.error('❌ Failed to navigate to map');
        this.showToast('Failed to open map', 'danger');
      }
    }).catch(error => {
      console.error('❌ Navigation error:', error);
      this.showToast('Navigation error occurred', 'danger');
    });
  }

  async openTriviaManager(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;

    const modal = await this.modalCtrl.create({
      component: TriviaManagerComponent,
      componentProps: {
        landmarkId: currentLandmark.id,
        landmarkName: currentLandmark.name,
        mode: 'view' 
      }
    });

    modal.onDidDismiss().then(async (result: any) => {
      if (result.data) {
        await this.loadTriviaQuestions(currentLandmark.id);
      }
    });

    await modal.present();
  }

  async openQuizMode(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;

    const modal = await this.modalCtrl.create({
      component: TriviaManagerComponent,
      componentProps: {
        landmarkId: currentLandmark.id,
        landmarkName: currentLandmark.name,
        mode: 'quiz'
      }
    });

    modal.onDidDismiss().then(async (result: any) => {
      if (result.data && result.data.canCollectStamp) {
        this.canCollectStamp = true;
        await this.showToast('Great job! You can now collect your stamp! 🎉', 'success');
      }
    });

    await modal.present();
  }

  async playTrivia(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;


    if (this.triviaQuestions.length === 0) {
      await this.showToast('No trivia questions available for this landmark', 'warning');
      return;
    }

    await this.openQuizMode();
  }

  onSliderChange(event: any): void {
    this.sliderValue = event.detail.value;
  }

  onTabChange(event: any): void {
    this.activeTab = event.detail.value;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/img/placeholder.jpg';
  }

  trackByCuratorImageId(index: number, curatorImage: any): string {
    return curatorImage.id;
  }

  viewCuratorImage(curatorImage: any): void {
  }

  private async loadCuratorImages(landmarkId: string): Promise<CuratorImage[]> {
    try {
      
      const tipsRef = collection(db, 'crowdsourced_tips');
      const q = query(
        tipsRef,
        where('landmarkId', '==', landmarkId),
        where('type', '==', 'photo'),
        where('status', '==', 'approved')
      );
      
      const querySnapshot = await getDocs(q);
      const curatorImages: CuratorImage[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data['imageUrl']) {
          curatorImages.push({
            id: doc.id,
            imageUrl: data['imageUrl'],
            title: data['title'] || 'Curator Photo',
            description: data['content'],
            submittedBy: data['submittedBy'] || 'Anonymous',
            submittedAt: data['created_at']?.toDate() || new Date(),
            landmarkId: data['landmarkId'],
            status: data['status'] || 'approved',
            likes: data['likes'] || 0,
            tags: data['tags'] || []
          });
        }
      });
      
      curatorImages.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      
      return curatorImages;
      
    } catch (error) {
      console.error('❌ Error loading curator images:', error);
      return [];
    }
  }

  private async syncStamp(id: string): Promise<void> {
    try {
      const stamps: string[] = (await this.local.get('stamps')) || [];
      this.isStamped = stamps.includes(id);
    } catch (error) {
      console.error('Error syncing stamp status:', error);
    }
  }

  private async syncBookmark(id: string): Promise<void> {
    try {
      const bookmarks: string[] = (await this.local.get('bookmarks')) || [];
      this.isBookmarked = bookmarks.includes(id);
    } catch (error) {
      console.error('Error syncing bookmark status:', error);
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'primary' | 'medium' = 'success'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({ 
      message, 
      duration: 3000, 
      color,
      position: 'bottom',
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  get hasAdditionalInfo(): boolean {
    return !!(this.landmark?.historicalSignificance || 
              this.landmark?.constructionDate || 
              this.landmark?.architect ||
              this.landmark?.funFacts?.length ||
              this.landmark?.visitingTips?.length);
  }

  get hasMedia(): boolean {
    return !!(this.landmark?.videoUrl || 
              this.landmark?.thenUrl || 
              this.landmark?.nowUrl);
  }

  get hasInteractiveContent(): boolean {
    return this.hasScavengerHunt || 
           this.triviaQuestions.length > 0 || 
           !!this.arContent;
  }

  get locationString(): string {
    if (!this.landmark?.latitude || !this.landmark?.longitude) {
      return 'Location not available';
    }
    return `${this.landmark.latitude}, ${this.landmark.longitude}`;
  }

  get hasLocationData(): boolean {
    return !!(this.landmark?.latitude && this.landmark?.longitude);
  }

  async submitContent() {
    if (!this.landmark?.id) {
      await this.showToast('No landmark selected', 'danger');
      return;
    }

    this.router.navigate(['/submit-content'], {
      queryParams: { landmarkId: this.landmark.id }
    });
  }

  async refreshLandmark(): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Refreshing landmark data...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      this.loading = true;
      this.landmark = null;
      
      await this.loadLandmarkFromRoute();
      
      await this.showToast('Landmark data refreshed!', 'success');
    } catch (error) {
      console.error('Error refreshing landmark:', error);
      await this.showToast('Failed to refresh landmark data', 'danger');
    } finally {
      await loading.dismiss();
    }
  }
}