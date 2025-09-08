import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  limit,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase.config';

export interface Landmark {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  thenImageUrl?: string;
  nowImageUrl?: string;
  videoUrl?: string;
  city?: string;
  category?: string;
  slug?: string;
  image_path?: string;
  then_image_path?: string;
  now_image_path?: string;
  created_at?: any;
  updated_at?: any;
  lati?: number;
  longti?: number;
  video_url?: string;
  arContent?: ArContent;
  scavengerHunt?: ScavengerHunt;
  tips?: CrowdsourcedTip[];
  visitCount?: number;
  rating?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedTime?: number;
  tags?: string[];
  distance?: number;
}

export interface ArContent {
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

export interface ScavengerClue {
  id: string;
  landmarkId: string;
  order: number;
  title: string;
  clue: string;
  question: string;
  options: string[];
  correctAnswer: string;
  hint?: string;
  rewardPoints: number;
  requiresLocation?: boolean;
  targetLocation?: { lat: number; lng: number; radius: number };
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
}

export interface ScavengerHunt {
  id: string;
  landmarkId: string;
  title: string;
  description: string;
  clues: ScavengerClue[];
  totalPoints: number;
  estimatedDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: any;
  updated_at: any;
}

export interface CrowdsourcedTip {
  id: string;
  landmarkId: string;
  landmarkName: string;
  authorId: string;
  authorEmail: string;
  title: string;
  content: string;
  tipType: 'advice' | 'fact' | 'experience' | 'photo';
  imageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  rating?: number;
  helpfulCount?: number;
}

export interface LandmarkFilter {
  city?: string;
  category?: string;
  difficulty?: string;
  hasAR?: boolean;
  hasScavengerHunt?: boolean;
  searchTerm?: string;
  nearLocation?: { lat: number; lng: number; radius: number };
}

@Injectable({
  providedIn: 'root'
})
export class LandmarkService {
  private landmarksSubject = new BehaviorSubject<Landmark[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private imageCache = new Map<string, string>();

  public landmarks$ = this.landmarksSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor() {
    this.initializeRealtimeListener();
  }

  private initializeRealtimeListener(): void {
    try {
      console.log('Setting up Firestore listener for Android app...');
      const landmarksRef = collection(db, 'landmarks');
      
      onSnapshot(landmarksRef, 
        async (querySnapshot: QuerySnapshot) => {
          try {
            this.loadingSubject.next(true);
            console.log(`Processing ${querySnapshot.docs.length} landmarks...`);
            const landmarks = await this.processLandmarkSnapshots(querySnapshot);
            this.landmarksSubject.next(landmarks);
            this.errorSubject.next(null);
          } catch (error) {
            console.error('Error processing landmarks:', error);
            this.errorSubject.next('Failed to load landmarks');
          } finally {
            this.loadingSubject.next(false);
          }
        },
        (error) => {
          console.error('Firestore listener error:', error);
          this.errorSubject.next('Connection error: ' + error.message);
          this.loadingSubject.next(false);
        }
      );
    } catch (error) {
      console.error('Error setting up listener:', error);
      this.errorSubject.next('Failed to setup real-time updates');
    }
  }

  private async processLandmarkSnapshots(querySnapshot: QuerySnapshot): Promise<Landmark[]> {
    if (querySnapshot.empty) {
      console.log('No landmarks found in database');
      return [];
    }

    const landmarkPromises = querySnapshot.docs.map(async (doc) => {
      const data = doc.data();
      return await this.processLandmarkData(doc.id, data);
    });

    return Promise.all(landmarkPromises);
  }

  private async processLandmarkData(id: string, data: any): Promise<Landmark> {
    // Handle image URLs with caching for Android performance
    const [imageUrl, thenImageUrl, nowImageUrl] = await Promise.all([
      this.resolveImageUrl(data['image_path']),
      this.resolveImageUrl(data['then_image_path']),
      this.resolveImageUrl(data['now_image_path'])
    ]);

    // Load additional data with error handling
    const [arContent, scavengerHunt, tips] = await Promise.all([
      this.getArContent(id).catch(() => undefined),
      this.getScavengerHunt(id).catch(() => undefined),
      this.getApprovedTips(id).catch(() => [])
    ]);

    return {
      id,
      name: data['name'] || 'Unnamed Landmark',
      description: data['description'] || '',
      latitude: this.parseCoordinate(data['latitude'] || data['lati'] || 0),
      longitude: this.parseCoordinate(data['longitude'] || data['longti'] || 0),
      imageUrl: imageUrl || 'assets/img/placeholder.jpg',
      thenImageUrl,
      nowImageUrl,
      videoUrl: data['video_url'] || data['videoUrl'],
      city: data['city'] || 'Unknown',
      category: data['category'] || 'Heritage',
      slug: data['slug'],
      image_path: data['image_path'],
      then_image_path: data['then_image_path'],
      now_image_path: data['now_image_path'],
      created_at: data['created_at'],
      updated_at: data['updated_at'],
      lati: data['lati'],
      longti: data['longti'],
      video_url: data['video_url'],
      arContent,
      scavengerHunt,
      tips,
      visitCount: data['visit_count'] || data['visitCount'] || 0,
      rating: data['rating'] || 0,
      difficulty: data['difficulty'] || 'medium',
      estimatedTime: data['estimated_time'] || data['estimatedTime'] || 30,
      tags: data['tags'] || []
    };
  }

  private async resolveImageUrl(imagePath?: string): Promise<string | undefined> {
    if (!imagePath) return undefined;
    if (imagePath.startsWith('http')) return imagePath;

    // Check cache first for performance
    if (this.imageCache.has(imagePath)) {
      return this.imageCache.get(imagePath);
    }

    try {
      // Direct Firebase Storage URL construction
      const encodedPath = encodeURIComponent(imagePath);
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/histaryo-backend.firebasestorage.app/o/${encodedPath}?alt=media`;
      
      // Cache the URL
      this.imageCache.set(imagePath, imageUrl);
      return imageUrl;
    } catch (error) {
      console.warn('Failed to resolve image:', imagePath, error);
      return 'assets/img/placeholder.jpg';
    }
  }

  private parseCoordinate(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  public getLandmarkById(id: string): Observable<Landmark | null> {
    return from(this.fetchLandmarkById(id));
  }

  private async fetchLandmarkById(id: string): Promise<Landmark | null> {
    try {
      const docRef = doc(db, 'landmarks', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return await this.processLandmarkData(id, docSnap.data());
      }
      return null;
    } catch (error) {
      console.error('Error fetching landmark by ID:', error);
      return null;
    }
  }

  public getLandmarkBySlug(slug: string): Observable<Landmark | null> {
    return from(this.fetchLandmarkBySlug(slug));
  }

  private async fetchLandmarkBySlug(slug: string): Promise<Landmark | null> {
    try {
      const landmarksRef = collection(db, 'landmarks');
      const querySnapshot = await getDocs(landmarksRef);
      
      const matchingDoc = querySnapshot.docs.find(doc => {
        const data = doc.data();
        return data['slug'] === slug;
      });
      
      if (matchingDoc) {
        return await this.processLandmarkData(matchingDoc.id, matchingDoc.data());
      }
      return null;
    } catch (error) {
      console.error('Error fetching landmark by slug:', error);
      return null;
    }
  }

  public getFilteredLandmarks(filter: LandmarkFilter): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => this.applyFilters(landmarks, filter))
    );
  }

  private applyFilters(landmarks: Landmark[], filter: LandmarkFilter): Landmark[] {
    return landmarks.filter(landmark => {
      if (filter.city && landmark.city !== filter.city) return false;
      if (filter.category && landmark.category !== filter.category) return false;
      if (filter.difficulty && landmark.difficulty !== filter.difficulty) return false;
      if (filter.hasAR && !landmark.arContent) return false;
      if (filter.hasScavengerHunt && !landmark.scavengerHunt) return false;

      if (filter.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase();
        const searchableText = [
          landmark.name,
          landmark.description,
          landmark.city,
          landmark.category,
          ...(landmark.tags || [])
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) return false;
      }

      if (filter.nearLocation) {
        const distance = this.calculateDistance(
          filter.nearLocation.lat,
          filter.nearLocation.lng,
          landmark.latitude,
          landmark.longitude
        );
        if (distance > filter.nearLocation.radius) return false;
      }

      return true;
    });
  }

  private async getArContent(landmarkId: string): Promise<ArContent | undefined> {
    try {
      const docRef = doc(db, 'ar_content', landmarkId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as ArContent;
      }
      return undefined;
    } catch (error) {
      console.warn('AR content unavailable:', error);
      return undefined;
    }
  }

  private async getScavengerHunt(landmarkId: string): Promise<ScavengerHunt | undefined> {
    try {
      const huntRef = collection(db, 'scavenger_hunts');
      const querySnapshot = await getDocs(huntRef);
      
      const matchingHunt = querySnapshot.docs.find(doc => {
        const data = doc.data();
        return data['landmarkId'] === landmarkId;
      });
      
      if (matchingHunt) {
        const huntData = matchingHunt.data();
        const scavengerHunt: ScavengerHunt = {
          id: matchingHunt.id,
          landmarkId: huntData['landmarkId'] || landmarkId,
          title: huntData['title'] || '',
          description: huntData['description'] || '',
          clues: huntData['clues'] || [],
          totalPoints: huntData['totalPoints'] || 0,
          estimatedDuration: huntData['estimatedDuration'] || 30,
          difficulty: huntData['difficulty'] || 'medium',
          created_at: huntData['created_at'],
          updated_at: huntData['updated_at']
        };
        return scavengerHunt;
      }
      return undefined;
    } catch (error) {
      console.warn('Scavenger hunt unavailable:', error);
      return undefined;
    }
  }

  private async getApprovedTips(landmarkId: string): Promise<CrowdsourcedTip[]> {
    try {
      const tipsRef = collection(db, 'crowdsourced_tips');
      const querySnapshot = await getDocs(tipsRef);
      
      const matchingTips = querySnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data['landmarkId'] === landmarkId && data['status'] === 'approved';
        })
        .map(doc => {
          const data = doc.data();
          const tip: CrowdsourcedTip = {
            id: doc.id,
            landmarkId: data['landmarkId'] || landmarkId,
            landmarkName: data['landmarkName'] || '',
            authorId: data['authorId'] || '',
            authorEmail: data['authorEmail'] || '',
            title: data['title'] || '',
            content: data['content'] || '',
            tipType: data['tipType'] || 'advice',
            imageUrl: data['imageUrl'],
            status: data['status'] || 'pending',
            createdAt: data['createdAt'],
            rating: data['rating'],
            helpfulCount: data['helpfulCount']
          };
          return tip;
        })
        .slice(0, 10);
      
      return matchingTips;
    } catch (error) {
      console.warn('Tips unavailable:', error);
      return [];
    }
  }

  public getNearbyLandmarks(lat: number, lng: number, radiusKm: number = 5): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => 
        landmarks
          .map(landmark => ({
            ...landmark,
            distance: this.calculateDistance(lat, lng, landmark.latitude, landmark.longitude)
          }))
          .filter(landmark => landmark.distance <= radiusKm)
          .sort((a, b) => a.distance - b.distance)
      )
    );
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  public getLandmarkStats(): Observable<{
    total: number;
    cities: string[];
    categories: string[];
    withAR: number;
    withScavengerHunts: number;
  }> {
    return this.landmarks$.pipe(
      map(landmarks => {
        const validCities = landmarks
          .map(l => l.city)
          .filter((city): city is string => Boolean(city));
        
        const validCategories = landmarks
          .map(l => l.category)
          .filter((category): category is string => Boolean(category));

        return {
          total: landmarks.length,
          cities: [...new Set(validCities)],
          categories: [...new Set(validCategories)],
          withAR: landmarks.filter(l => Boolean(l.arContent)).length,
          withScavengerHunts: landmarks.filter(l => Boolean(l.scavengerHunt)).length
        };
      })
    );
  }

  public getFeaturedLandmarks(limit: number = 5): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => 
        landmarks
          .filter(l => (l.rating ?? 0) > 0 || (l.visitCount ?? 0) > 0)
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, limit)
      )
    );
  }

  public searchLandmarks(searchTerm: string): Observable<Landmark[]> {
    if (!searchTerm || searchTerm.length < 2) {
      return of([]);
    }

    return this.landmarks$.pipe(
      map(landmarks => {
        const term = searchTerm.toLowerCase();
        return landmarks
          .filter(landmark => {
            const searchableText = [
              landmark.name,
              landmark.description,
              landmark.city,
              landmark.category,
              ...(landmark.tags || [])
            ].join(' ').toLowerCase();
            
            return searchableText.includes(term);
          })
          .sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(term);
            const bNameMatch = b.name.toLowerCase().includes(term);
            
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            
            return (b.rating ?? 0) - (a.rating ?? 0);
          })
          .slice(0, 10);
      })
    );
  }

  public getRandomLandmark(): Observable<Landmark | null> {
    return this.landmarks$.pipe(
      map(landmarks => {
        if (landmarks.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * landmarks.length);
        return landmarks[randomIndex];
      })
    );
  }

  public getLandmarksByCategory(category: string): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => 
        landmarks
          .filter(l => l.category === category)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );
  }

  public getLandmarksByCity(city: string): Observable<Landmark[]> {
    return this.landmarks$.pipe(
      map(landmarks => 
        landmarks
          .filter(l => l.city === city)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );
  }

  public refreshLandmarks(): void {
    this.imageCache.clear(); // Clear image cache on refresh
    this.initializeRealtimeListener();
  }

  public clearError(): void {
    this.errorSubject.next(null);
  }

  public getCurrentLandmarks(): Landmark[] {
    return this.landmarksSubject.value;
  }

  public async recordVisit(landmarkId: string): Promise<void> {
    try {
      console.log('Visit recorded for landmark:', landmarkId);
    } catch (error) {
      console.error('Error recording visit:', error);
    }
  }

  public async submitTip(tip: Omit<CrowdsourcedTip, 'id' | 'status' | 'createdAt'>): Promise<boolean> {
    try {
      console.log('Tip submitted:', tip);
      return true;
    } catch (error) {
      console.error('Error submitting tip:', error);
      return false;
    }
  }

  // Android-specific performance methods
  public preloadImages(landmarks: Landmark[]): void {
    landmarks.forEach(landmark => {
      if (landmark.imageUrl && landmark.imageUrl.startsWith('http')) {
        // Preload images for better performance
        const img = new Image();
        img.src = landmark.imageUrl;
      }
    });
  }

  public clearImageCache(): void {
    this.imageCache.clear();
  }
}