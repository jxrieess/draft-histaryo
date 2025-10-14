import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { LandmarkService } from './landmark.service';

export interface OfflineData {
  landmarks: any[];
  userTips: any[];
  triviaQuestions: any[];
  lastSync: string;
  pendingSubmissions: any[];
}

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  public isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$ = this.isOnlineSubject.asObservable();

  private offlineDataSubject = new BehaviorSubject<OfflineData>({
    landmarks: [],
    userTips: [],
    triviaQuestions: [],
    lastSync: '',
    pendingSubmissions: []
  });
  public offlineData$ = this.offlineDataSubject.asObservable();

  constructor(
    private storage: Storage,
    private landmarkService: LandmarkService
  ) {
    this.setupOnlineStatusListener();
    this.loadOfflineData();
  }

  private setupOnlineStatusListener(): void {
    window.addEventListener('online', () => {
      this.isOnlineSubject.next(true);
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnlineSubject.next(false);
    });
  }

  private async loadOfflineData(): Promise<void> {
    try {
      const data = await this.storage.get('offlineData');
      if (data) {
        this.offlineDataSubject.next(data);
      }
    } catch (error) {
      console.error('Error loading offline data:', error);
    }
  }

  private async saveOfflineData(data: OfflineData): Promise<void> {
    try {
      await this.storage.set('offlineData', data);
      this.offlineDataSubject.next(data);
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  async cacheLandmarks(landmarks: any[]): Promise<void> {
    const currentData = this.offlineDataSubject.value;
    const updatedData = {
      ...currentData,
      landmarks: landmarks,
      lastSync: new Date().toISOString()
    };
    await this.saveOfflineData(updatedData);
  }

  async cacheUserTips(landmarkId: number, tips: any[]): Promise<void> {
    const currentData = this.offlineDataSubject.value;
    const updatedTips = currentData.userTips.filter(tip => tip.landmark_id !== landmarkId);
    updatedTips.push(...tips);
    
    const updatedData = {
      ...currentData,
      userTips: updatedTips
    };
    await this.saveOfflineData(updatedData);
  }

  async cacheTriviaQuestions(landmarkId: number, questions: any[]): Promise<void> {
    const currentData = this.offlineDataSubject.value;
    const updatedQuestions = currentData.triviaQuestions.filter(q => q.landmark_id !== landmarkId);
    updatedQuestions.push(...questions);
    
    const updatedData = {
      ...currentData,
      triviaQuestions: updatedQuestions
    };
    await this.saveOfflineData(updatedData);
  }

  getCachedLandmarks(): any[] {
    return this.offlineDataSubject.value.landmarks;
  }

  getCachedUserTips(landmarkId: number): any[] {
    return this.offlineDataSubject.value.userTips.filter(tip => tip.landmark_id === landmarkId);
  }

  getCachedTriviaQuestions(landmarkId: number): any[] {
    return this.offlineDataSubject.value.triviaQuestions.filter(q => q.landmark_id === landmarkId);
  }

  async addPendingSubmission(type: 'tip' | 'photo' | 'video', data: any): Promise<void> {
    const currentData = this.offlineDataSubject.value;
    const submission = {
      id: Date.now(),
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    const updatedData = {
      ...currentData,
      pendingSubmissions: [...currentData.pendingSubmissions, submission]
    };
    
    await this.saveOfflineData(updatedData);
  }

  async syncPendingData(): Promise<void> {
    if (!this.isOnlineSubject.value) return;

    const currentData = this.offlineDataSubject.value;
    const pendingSubmissions = [...currentData.pendingSubmissions];
    
    if (pendingSubmissions.length === 0) return;


    for (const submission of pendingSubmissions) {
      try {
        await this.processPendingSubmission(submission);
        
        const updatedPending = currentData.pendingSubmissions.filter(s => s.id !== submission.id);
        const updatedData = {
          ...currentData,
          pendingSubmissions: updatedPending
        };
        await this.saveOfflineData(updatedData);
        
      } catch (error) {
        console.error('Error syncing submission:', error);
      }
    }
  }

  private async processPendingSubmission(submission: any): Promise<void> {
    switch (submission.type) {
      case 'tip':
        await this.landmarkService.submitUserTip({
          landmarkId: submission.data.landmarkId,
          content: submission.data.content,
          authorId: submission.data.userId || 'anonymous',
          authorName: submission.data.userName || 'Anonymous'
        });
        break;
        
      case 'photo':
        await this.landmarkService.submitUserTip({
          landmarkId: submission.data.landmarkId,
          content: submission.data.content || 'Photo submission',
          authorId: submission.data.userId || 'anonymous',
          authorName: submission.data.userName || 'Anonymous'
        });
        break;
        
      case 'video':
        await this.landmarkService.submitUserTip({
          landmarkId: submission.data.landmarkId,
          content: submission.data.content || 'Video submission',
          authorId: submission.data.userId || 'anonymous',
          authorName: submission.data.userName || 'Anonymous'
        });
        break;
    }
  }

  private dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }

  async clearOfflineData(): Promise<void> {
    await this.storage.remove('offlineData');
    this.offlineDataSubject.next({
      landmarks: [],
      userTips: [],
      triviaQuestions: [],
      lastSync: '',
      pendingSubmissions: []
    });
  }

  getOfflineDataSize(): number {
    const data = this.offlineDataSubject.value;
    return JSON.stringify(data).length;
  }

  getPendingSubmissionsCount(): number {
    return this.offlineDataSubject.value.pendingSubmissions.length;
  }

  isDataStale(maxAgeHours: number = 24): boolean {
    const lastSync = this.offlineDataSubject.value.lastSync;
    if (!lastSync) return true;
    
    const lastSyncDate = new Date(lastSync);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff > maxAgeHours;
  }

  async forceSync(): Promise<void> {
    if (!this.isOnlineSubject.value) {
      throw new Error('No internet connection');
    }
    
    await this.syncPendingData();
  }
}
