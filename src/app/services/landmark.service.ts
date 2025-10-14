import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, getDoc, addDoc,onSnapshot, query, 
  where, orderBy, limit, QuerySnapshot,DocumentData,GeoPoint,Timestamp
} from 'firebase/firestore';

import { firebaseConfig } from '../firebase.config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export interface Landmark {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  image_path?: string;
  thenUrl?: string;
  then_image_path?: string;
  nowUrl?: string;
  now_image_path?: string;
  videoUrl?: string;
  video_url?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  city?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedTime?: number; 
  rating?: number;
  visitCount?: number;
  arContent?: boolean;
  scavengerHunt?: boolean;
  tips?: UserTip[];
  trivia?: TriviaQuestion[];
  tags?: string[];
  slug?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  distance?: number;
  curatorImages?: CuratorImage[];
}

export interface CuratorImage {
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

export interface UserTip {
  id: string;
  content: string;
  authorName?: string;
  authorId?: string;
  createdAt: Date;
  isApproved: boolean;
  landmarkId: string;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  landmarkId: string;
}

@Injectable({
  providedIn: 'root'
})
export class LandmarkService {
  private landmarksSubject = new BehaviorSubject<Landmark[]>([]);
  public landmarks$ = this.landmarksSubject.asObservable();
  
  private userTipsSubject = new BehaviorSubject<UserTip[]>([]);
  public userTips$ = this.userTipsSubject.asObservable();
  
  private isInitialized = false;

  constructor() {
    this.testFirestoreConnection();
    this.initializeRealtimeListener();
  }

  private async testFirestoreConnection() {
    try {
      const landmarksRef = collection(db, 'landmarks');
      const snapshot = await getDocs(landmarksRef);
    } catch (error) {
      console.error('❌ Firestore connection test failed:', error);
    }
  }

  private initializeRealtimeListener(): void {
    const landmarksRef = collection(db, 'landmarks');
    
    this.initializeSimpleListener();
  }

  private initializeSimpleListener(): void {
    const landmarksRef = collection(db, 'landmarks');

    onSnapshot(landmarksRef, async (querySnapshot: QuerySnapshot) => {
      try {
        const landmarks = await this.processLandmarkSnapshots(querySnapshot);
        this.landmarksSubject.next(landmarks);
        this.isInitialized = true;
      } catch (error) {
        console.error('❌ Error processing landmark snapshots:', error);
        this.landmarksSubject.next([]);
      }
    }, (error) => {
      console.error('❌ Error in landmarks real-time listener:', error);
      this.landmarksSubject.next([]);
    });
  }

  private async processLandmarkSnapshots(querySnapshot: QuerySnapshot): Promise<Landmark[]> {
    const landmarks: Landmark[] = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      try {
        const data = docSnapshot.data();
        
        const landmark = this.mapFirebaseDocToLandmarkSync(docSnapshot.id, data);
        
        if (landmark) {
          landmarks.push(landmark);
        }
      } catch (error) {
        console.error(`❌ Error processing landmark ${docSnapshot.id}:`, error);
      }
    }
    
    const landmarksWithImages = await this.loadCuratorImagesForLandmarks(landmarks);
    
    return landmarksWithImages;
  }

  private mapFirebaseDocToLandmarkSync(id: string, data: DocumentData): Landmark | null {
    try {
      const name = data['name'];
      if (!name) {
        console.warn(`❌ Document ${id} missing 'name' field`);
        return null;
      }

      let latitude: number | undefined;
      let longitude: number | undefined;
      
      const latValue = data['latitude'] || data['lati'] || data['lat'];
      const lngValue = data['longitude'] || data['longti'] || data['lng'] || data['lon'];
      
      if (latValue !== undefined && lngValue !== undefined) {
        try {
          latitude = typeof latValue === 'number' ? latValue : parseFloat(String(latValue));
          longitude = typeof lngValue === 'number' ? lngValue : parseFloat(String(lngValue));
          
          if (isNaN(latitude) || isNaN(longitude) || 
              latitude < -90 || latitude > 90 || 
              longitude < -180 || longitude > 180) {
            console.warn(`⚠️ Invalid coordinates for ${id}: ${latitude}, ${longitude}`);
            latitude = undefined;
            longitude = undefined;
          }
        } catch (coordError) {
          console.warn(`⚠️ Could not parse coordinates for ${id}:`, coordError);
        }
      } else {
        console.warn(`⚠️ No coordinates found for ${id} - latValue: ${latValue}, lngValue: ${lngValue}`);
      }

      let createdAt = new Date();
      if (data['created_at']) {
        try {
          if (data['created_at'] instanceof Timestamp) {
            createdAt = data['created_at'].toDate();
          } else {
            createdAt = new Date(data['created_at']);
          }
        } catch (dateError) {
          console.warn(`⚠️ Could not parse date for ${id}:`, dateError);
        }
      }

      const landmark: Landmark = {
        id,
        name: String(name),
        description: String(data['description'] || ''),
        imageUrl: data['image_path'] || data['imageUrl'] || data['image'] || undefined,
        image_path: data['image_path'] || data['imageUrl'] || data['image'] || undefined,
        thenUrl: data['then_image_path'] || data['thenImageUrl'] || data['then_image'] || undefined,
        then_image_path: data['then_image_path'] || data['thenImageUrl'] || data['then_image'] || undefined,
        nowUrl: data['now_image_path'] || data['nowImageUrl'] || data['now_image'] || undefined,
        now_image_path: data['now_image_path'] || data['nowImageUrl'] || data['now_image'] || undefined,
        videoUrl: data['video_url'] || data['videoUrl'] || data['video'] || undefined,
        video_url: data['video_url'] || data['videoUrl'] || data['video'] || undefined,
        latitude,
        longitude,
        category: String(data['category'] || 'Historical'),
        city: String(data['city'] || 'Cebu City'),
        difficulty: (data['difficulty'] as any) || 'medium',
        estimatedTime: 30, 
        rating: 0,
        visitCount: 0, 
        arContent: false,
        scavengerHunt: false, 
        tips: [],
        trivia: [],
        tags: [],
        slug: this.generateSlug(String(name)),
        isActive: true, 
        createdAt,
        updatedAt: createdAt
      };

      return landmark;

    } catch (error) {
      console.error(`❌ Critical error mapping document ${id}:`, error);
      return null;
    }
  }

  private async mapFirebaseDocToLandmark(id: string, data: DocumentData): Promise<Landmark | null> {
    return this.mapFirebaseDocToLandmarkSync(id, data);
  }

  private getDefaultImageUrl(imageUrl?: string, category?: string, landmarkId?: string): string {
    if (imageUrl && imageUrl.trim() !== '' && !imageUrl.includes('placeholder')) {
      return imageUrl;
    }

    if (category) {
      const cat = category.toLowerCase();
      if (cat === 'religious') {
        return 'assets/img/basilica.jpg';
      }
      if (cat === 'historical') {
        return 'assets/img/fort-san-pedro.jpg';
      }
      if (cat === 'cultural') {
        return 'assets/img/magellans-cross.jpg';
      }
      if (cat === 'museum') {
        return 'assets/img/Cathedral-Museum.jpg';
      }
      if (cat === 'architecture') {
        return 'assets/img/Casa-Gorordo.jpg';
      }
      if (cat === 'park') {
        return 'assets/img/Liberty-Shrine.jpg';
      }
    }

    return 'assets/img/default-landmark.jpg';
  }

  private processImageUrl(imagePath: string | undefined): string | undefined {
    if (!imagePath) return undefined;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.includes('landmarks/') || imagePath.includes('images/')) {

      return `https://firebasestorage.googleapis.com/v0/b/your-project.appspot.com/o/${encodeURIComponent(imagePath)}?alt=media`;
    }
    
    return imagePath;
  }

  private async loadLandmarkTips(landmarkId: string): Promise<UserTip[]> {
    try {
      const tipsRef = collection(db, 'user_tips');
      const tipsQuery = query(
        tipsRef, 
        where('landmark_id', '==', landmarkId),
        where('is_approved', '==', true),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(tipsQuery);
      const tips: UserTip[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tips.push({
          id: doc.id,
          content: data['content'] || '',
          authorName: data['author_name'] || 'Anonymous',
          authorId: data['author_id'],
          createdAt: data['created_at'] instanceof Timestamp ? 
            data['created_at'].toDate() : new Date(),
          isApproved: data['is_approved'] || false,
          landmarkId: data['landmark_id']
        });
      });
      
      return tips;
    } catch (error) {
      console.error('Error loading landmark tips:', error);
      return [];
    }
  }

  private async loadLandmarkTrivia(landmarkId: string): Promise<TriviaQuestion[]> {
    try {
      const triviaRef = collection(db, 'trivia');
      const triviaQuery = query(
        triviaRef, 
        where('landmark_id', '==', landmarkId)
      );
      
      const querySnapshot = await getDocs(triviaQuery);
      const trivia: TriviaQuestion[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        trivia.push({
          id: doc.id,
          question: data['question'] || '',
          options: data['options'] || [],
          correctAnswer: data['correct_answer'] || 0,
          explanation: data['explanation'],
          difficulty: data['difficulty'] || 'medium',
          landmarkId: data['landmark_id']
        });
      });
      
      return trivia;
    } catch (error) {
      console.error('Error loading landmark trivia:', error);
      return [];
    }
  }

  async getTriviaQuestionsForLandmark(landmarkId: string): Promise<TriviaQuestion[]> {
    try {
      const triviaRef = collection(db, 'trivia');
      const triviaQuery = query(
        triviaRef, 
        where('landmark_id', '==', landmarkId)
      );
      
      const querySnapshot = await getDocs(triviaQuery);
      const trivia: TriviaQuestion[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        const options = data['options'] || data['choices'] || [];

        let correctAnswerValue = data['correct_answer'] || 
                               data['correctAnswer'] || 
                               data['correct_answer_index'] || 
                               data['correctAnswerIndex'] ||
                               data['answer'] ||
                               data['right_answer'] ||
                               data['rightAnswer'] ||
                               0;
        
        let correctAnswer = 0; 
        
        if (typeof correctAnswerValue === 'string') {
          const index = options.findIndex((option: string) => 
            option.toLowerCase().trim() === correctAnswerValue.toLowerCase().trim()
          );
          correctAnswer = index >= 0 ? index : 0;
        } else if (typeof correctAnswerValue === 'number') {
          correctAnswer = correctAnswerValue;
        }
        
        trivia.push({
          id: doc.id,
          question: data['question'] || '',
          options: data['options'] || data['choices'] || [],
          correctAnswer: correctAnswer,
          explanation: data['explanation'],
          difficulty: data['difficulty'] || 'medium',
          landmarkId: data['landmark_id'] || data['landmarkId']
        });
      });
      
      return trivia;
    } catch (error) {
      console.error('Error loading trivia questions for landmark:', error);
      return [];
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  getAllLandmarks(): Observable<Landmark[]> {
    return this.landmarks$;
  }

  getLandmarkById(id: string): Observable<Landmark | null> {
    return this.landmarks$.pipe(
      map(landmarks => landmarks.find(l => l.id === id) || null)
    );
  }

  getLandmarkBySlug(slug: string): Observable<Landmark | null> {
    return this.landmarks$.pipe(
      map(landmarks => landmarks.find(l => l.slug === slug) || null)
    );
  }

  getFeaturedLandmarks(count: number = 6): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => {
        return landmarks
          .filter(l => l.isActive !== false)
          .sort((a, b) => {
            const ratingDiff = (b.rating || 0) - (a.rating || 0);
            if (ratingDiff !== 0) return ratingDiff;
            return (b.visitCount || 0) - (a.visitCount || 0);
          })
          .slice(0, count);
      })
    );
  }

  getLandmarksByCategory(category: string): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => {
        return landmarks.filter(l => 
          l.isActive !== false && 
          l.category?.toLowerCase() === category.toLowerCase()
        );
      })
    );
  }

  getLandmarksByCity(city: string): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => {
        return landmarks.filter(l => 
          l.isActive !== false && 
          l.city?.toLowerCase() === city.toLowerCase()
        );
      })
    );
  }


  getNearbyLandmarks(userLat: number, userLng: number, radiusKm: number = 10): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => {
        return landmarks
          .filter(l => l.isActive !== false && l.latitude && l.longitude)
          .map(landmark => {
            const distance = this.calculateDistance(
              userLat, userLng, 
              landmark.latitude!, landmark.longitude!
            );
            return { ...landmark, distance };
          })
          .filter(landmark => landmark.distance! <= radiusKm)
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      })
    );
  }

  getRandomLandmark(): Observable<Landmark | null> {
    return this.landmarks$.pipe(
      map(landmarks => {
        const activeLandmarks = landmarks.filter(l => l.isActive !== false);
        if (activeLandmarks.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * activeLandmarks.length);
        return activeLandmarks[randomIndex];
      })
    );
  }

  searchLandmarks(searchTerm: string): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => {
        const term = searchTerm.toLowerCase();
        return landmarks.filter(l => 
          l.isActive !== false && (
            l.name.toLowerCase().includes(term) ||
            l.description.toLowerCase().includes(term) ||
            l.category?.toLowerCase().includes(term) ||
            l.city?.toLowerCase().includes(term) ||
            l.tags?.some(tag => tag.toLowerCase().includes(term))
          )
        );
      })
    );
  }

  getFilteredLandmarks(filters: {
    category?: string;
    city?: string;
    difficulty?: string;
    hasAR?: boolean;
    hasScavengerHunt?: boolean;
  }): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => {
        return landmarks.filter(landmark => {
          if (landmark.isActive === false) return false;
          
          if (filters.category && landmark.category !== filters.category) return false;
          if (filters.city && landmark.city !== filters.city) return false;
          if (filters.difficulty && landmark.difficulty !== filters.difficulty) return false;
          if (filters.hasAR && !landmark.arContent) return false;
          if (filters.hasScavengerHunt && !landmark.scavengerHunt) return false;
          
          return true;
        });
      })
    );
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
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

  async submitUserTip(tip: Partial<UserTip>): Promise<boolean> {
    try {
      const tipsRef = collection(db, 'user_tips');
      await addDoc(tipsRef, {
        content: tip.content,
        author_name: tip.authorName || 'Anonymous',
        author_id: tip.authorId,
        landmark_id: tip.landmarkId,
        is_approved: false, 
        created_at: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error submitting tip:', error);
      return false;
    }
  }

  isServiceReady(): boolean {
    return this.isInitialized;
  }

  getCurrentLandmarksCount(): number {
    return this.landmarksSubject.value.length;
  }

  async debugCrowdsourcedTips(): Promise<void> {
    try {
      
      const tipsRef = collection(db, 'crowdsourced_tips');
      const querySnapshot = await getDocs(tipsRef);
      
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
      });
      
    } catch (error) {
      console.error('❌ Error debugging crowdsourced_tips:', error);
    }
  }

  async getCuratorImagesForLandmark(landmarkId: string): Promise<CuratorImage[]> {
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
        } else {
        }
      });
      
      curatorImages.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
      
      return curatorImages;
      
    } catch (error) {
      console.error('❌ Error fetching curator images:', error);
      return [];
    }
  }

  async loadCuratorImagesForLandmarks(landmarks: Landmark[]): Promise<Landmark[]> {
    
    const landmarksWithImages = await Promise.all(
      landmarks.map(async (landmark) => {
        try {
          const curatorImages = await this.getCuratorImagesForLandmark(landmark.id);
          return {
            ...landmark,
            curatorImages
          };
        } catch (error) {
          console.error(`❌ Error loading curator images for ${landmark.name}:`, error);
          return landmark;
        }
      })
    );
    
    return landmarksWithImages;
  }
}