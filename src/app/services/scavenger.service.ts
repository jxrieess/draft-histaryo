// src/app/services/scavenger.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { Geolocation } from '@capacitor/geolocation';

export interface Hunt {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number; // in minutes
  landmarkId: string;
  landmarkName: string;
  clues: Clue[];
  totalPoints: number;
  createdAt?: any;
  updatedAt?: any;
  isActive: boolean;
  completionCount: number;
  averageRating: number;
  tags?: string[];
}

export interface Clue {
  id: string;
  huntId: string;
  order: number;
  type: 'location' | 'question' | 'ar_scan' | 'photo' | 'riddle';
  title: string;
  description: string;
  clue: string;
  hint?: string;
  pointsAwarded: number;
  rewardPoints: number;
  
  // Question-specific properties
  question?: string;
  options?: string[];
  correctAnswer?: string | number | boolean;
  explanation?: string;
  
  // Location-specific properties
  targetLocation?: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
    name?: string;
  };
  
  // Photo challenge properties
  photoChallenge?: {
    instruction: string;
    requiredElements: string[];
    maxPhotos?: number;
  };
  
  // AR scan properties
  targetObject?: {
    name: string;
    imageUrl?: string;
    modelUrl?: string;
  };
  
  // Completion criteria
  completionCriteria: {
    requiresGPS: boolean;
    requiresPhoto: boolean;
    requiresAnswer: boolean;
    requiresAR?: boolean;
    timeLimit?: number; // in seconds
  };
  
  // Additional metadata
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  isOptional?: boolean;
}

export interface UserProgress {
  id?: string;
  userId: string;
  huntId: string;
  landmarkId: string;
  currentClueIndex: number;
  totalScore: number;
  totalPoints: number;
  startTime: Date;
  endTime?: Date;
  completedClues: string[];
  skippedClues: string[];
  hints: string[]; // clue IDs where hints were used
  photos: string[]; // URLs of captured photos
  answers: { [clueId: string]: any };
  status: 'in_progress' | 'completed' | 'abandoned';
  completionTime?: number; // in minutes
  accuracy?: number; // percentage
  createdAt?: any;
  updatedAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ScavengerService {
  private huntsSubject = new BehaviorSubject<Hunt[]>([]);
  private currentProgressSubject = new BehaviorSubject<UserProgress | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public hunts$ = this.huntsSubject.asObservable();
  public currentProgress$ = this.currentProgressSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    this.loadHunts();
  }

  // Hunt Management Methods
  public async loadHunts(): Promise<void> {
    this.loadingSubject.next(true);
    try {
      const huntsRef = collection(db, 'scavenger_hunts');
      const querySnapshot = await getDocs(query(huntsRef, where('isActive', '==', true)));
      
      const hunts = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const hunt: Hunt = {
            id: doc.id,
            title: data['title'] || '',
            description: data['description'] || '',
            imageUrl: data['imageUrl'],
            difficulty: data['difficulty'] || 'medium',
            estimatedDuration: data['estimatedDuration'] || 30,
            landmarkId: data['landmarkId'] || '',
            landmarkName: data['landmarkName'] || '',
            clues: await this.loadCluesForHunt(doc.id),
            totalPoints: data['totalPoints'] || 0,
            createdAt: data['createdAt'],
            updatedAt: data['updatedAt'],
            isActive: data['isActive'] ?? true,
            completionCount: data['completionCount'] || 0,
            averageRating: data['averageRating'] || 0,
            tags: data['tags'] || []
          };
          
          // Calculate total points if not set
          if (hunt.totalPoints === 0 && hunt.clues.length > 0) {
            hunt.totalPoints = hunt.clues.reduce((sum, clue) => sum + clue.pointsAwarded, 0);
          }
          
          return hunt;
        })
      );

      this.huntsSubject.next(hunts);
      this.errorSubject.next(null);
    } catch (error) {
      console.error('Error loading hunts:', error);
      this.errorSubject.next('Failed to load scavenger hunts');
    } finally {
      this.loadingSubject.next(false);
    }
  }

  private async loadCluesForHunt(huntId: string): Promise<Clue[]> {
    try {
      const cluesRef = collection(db, 'scavenger_clues');
      const querySnapshot = await getDocs(
        query(cluesRef, where('huntId', '==', huntId), orderBy('order', 'asc'))
      );
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          huntId: data['huntId'],
          order: data['order'] || 0,
          type: data['type'] || 'question',
          title: data['title'] || '',
          description: data['description'] || '',
          clue: data['clue'] || '',
          hint: data['hint'],
          pointsAwarded: data['pointsAwarded'] || 10,
          rewardPoints: data['rewardPoints'] || data['pointsAwarded'] || 10,
          question: data['question'],
          options: data['options'],
          correctAnswer: data['correctAnswer'],
          explanation: data['explanation'],
          targetLocation: data['targetLocation'],
          photoChallenge: data['photoChallenge'],
          targetObject: data['targetObject'],
          completionCriteria: data['completionCriteria'] || {
            requiresGPS: false,
            requiresPhoto: false,
            requiresAnswer: true
          },
          difficulty: data['difficulty'] || 'medium',
          category: data['category'],
          isOptional: data['isOptional'] || false
        } as Clue;
      });
    } catch (error) {
      console.error('Error loading clues for hunt:', huntId, error);
      return [];
    }
  }

  public getHuntById(huntId: string): Observable<Hunt | null> {
    return this.hunts$.pipe(
      map(hunts => hunts.find(hunt => hunt.id === huntId) || null)
    );
  }

  public getHuntsByLandmark(landmarkId: string): Observable<Hunt[]> {
    return this.hunts$.pipe(
      map(hunts => hunts.filter(hunt => hunt.landmarkId === landmarkId))
    );
  }

  // Progress Management Methods
  public async startHunt(huntId: string, landmarkId: string): Promise<UserProgress | null> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be logged in to start hunt');
    }

    try {
      const progress: UserProgress = {
        userId: user.uid,
        huntId,
        landmarkId,
        currentClueIndex: 0,
        totalScore: 0,
        totalPoints: 0,
        startTime: new Date(),
        completedClues: [],
        skippedClues: [],
        hints: [],
        photos: [],
        answers: {},
        status: 'in_progress',
        createdAt: serverTimestamp()
      };

      const progressRef = await addDoc(collection(db, 'hunt_progress'), progress);
      progress.id = progressRef.id;
      
      this.currentProgressSubject.next(progress);
      this.saveProgressToLocal(progress);
      
      return progress;
    } catch (error) {
      console.error('Error starting hunt:', error);
      throw error;
    }
  }

  public async saveProgress(progress: UserProgress): Promise<void> {
    try {
      if (progress.id) {
        const progressRef = doc(db, 'hunt_progress', progress.id);
        await updateDoc(progressRef, {
          ...progress,
          updatedAt: serverTimestamp()
        });
      }
      
      this.currentProgressSubject.next(progress);
      this.saveProgressToLocal(progress);
    } catch (error) {
      console.error('Error saving progress:', error);
      // Save to local storage as fallback
      this.saveProgressToLocal(progress);
    }
  }

  private saveProgressToLocal(progress: UserProgress): void {
    try {
      localStorage.setItem(`hunt-progress-${progress.huntId}`, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving progress to local storage:', error);
    }
  }

  public loadProgressFromLocal(huntId: string): UserProgress | null {
    try {
      const saved = localStorage.getItem(`hunt-progress-${huntId}`);
      if (saved) {
        const progress = JSON.parse(saved);
        progress.startTime = new Date(progress.startTime);
        if (progress.endTime) {
          progress.endTime = new Date(progress.endTime);
        }
        return progress;
      }
      return null;
    } catch (error) {
      console.error('Error loading progress from local storage:', error);
      return null;
    }
  }

  public async getCurrentLocation(): Promise<{latitude: number, longitude: number, accuracy: number}> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  public async createMockHuntForTesting(landmarkId: string, landmarkName: string): Promise<Hunt> {
    const mockHunt: Hunt = {
      id: `mock-hunt-${Date.now()}`,
      title: `Secrets of ${landmarkName}`,
      description: `Discover the hidden stories and mysteries of ${landmarkName} through this interactive scavenger hunt.`,
      difficulty: 'medium',
      estimatedDuration: 45,
      landmarkId,
      landmarkName,
      isActive: true,
      completionCount: 0,
      averageRating: 0,
      totalPoints: 0,
      clues: [
        {
          id: 'clue-1',
          huntId: `mock-hunt-${Date.now()}`,
          order: 1,
          type: 'location',
          title: 'Find the Main Entrance',
          description: 'Locate the primary entrance to the landmark',
          clue: 'Where visitors first set foot into history, you\'ll find the gateway to the past.',
          hint: 'Look for the largest opening facing the main street',
          pointsAwarded: 50,
          rewardPoints: 50,
          targetLocation: {
            latitude: 10.293722,
            longitude: 123.906750,
            radius: 15,
            name: 'Main Entrance'
          },
          completionCriteria: {
            requiresGPS: true,
            requiresPhoto: true,
            requiresAnswer: false
          },
          difficulty: 'easy'
        },
        {
          id: 'clue-2',
          huntId: `mock-hunt-${Date.now()}`,
          order: 2,
          type: 'question',
          title: 'History Quiz',
          description: 'Test your knowledge about this landmark',
          clue: 'Knowledge is the key to understanding the past.',
          question: 'In what year was this landmark established?',
          options: ['1565', '1571', '1898', '1935'],
          correctAnswer: '1565',
          explanation: 'This landmark was established in 1565 during the Spanish colonial period.',
          pointsAwarded: 75,
          rewardPoints: 75,
          completionCriteria: {
            requiresGPS: false,
            requiresPhoto: false,
            requiresAnswer: true
          },
          difficulty: 'medium'
        }
      ],
      createdAt: new Date()
    };

    // Calculate total points
    mockHunt.totalPoints = mockHunt.clues.reduce((sum, clue) => sum + clue.pointsAwarded, 0);

    return mockHunt;
  }

  // Utility methods
  public clearError(): void {
    this.errorSubject.next(null);
  }

  public clearCurrentProgress(): void {
    this.currentProgressSubject.next(null);
  }
}