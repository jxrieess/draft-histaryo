import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from '../firebase.config';
import { auth } from '../firebase.config';

export interface CrowdsourcedTip {
  id?: string;
  userId: string;
  landmarkId: string;
  landmarkName: string;
  type: 'advice' | 'experience' | 'fact' | 'history' | 'photo';
  title: string;
  content: string;
  imageUrl?: string;
  submittedBy: string; // User display name
  status: 'pending' | 'approved' | 'rejected';
  moderatorNotes?: string;
  likes: number;
  reports: number;
  isHelpful: boolean;
  tags: string[];
  created_at: any;
  approved_at?: any;
  moderator_id?: string;
}

export interface TipSubmission {
  landmarkId: string;
  landmarkName: string;
  type: 'advice' | 'experience' | 'fact' | 'history' | 'photo';
  title: string;
  content: string;
  image?: File;
  tags?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TipsService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private successSubject = new BehaviorSubject<string | null>(null);

  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public success$ = this.successSubject.asObservable();

  constructor() {}

  // Submit a new tip
  async submitTip(submission: TipSubmission): Promise<boolean> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        this.errorSubject.next('Please log in to submit tips');
        return false;
      }

      // Validate submission
      if (!this.validateSubmission(submission)) {
        return false;
      }

      let imageUrl = '';

      // Upload image if provided
      if (submission.image) {
        imageUrl = await this.uploadTipImage(submission.image, submission.landmarkId);
        if (!imageUrl) {
          this.errorSubject.next('Failed to upload image');
          return false;
        }
      }

      // Create tip document
      const tipData: Omit<CrowdsourcedTip, 'id'> = {
        userId: user.uid,
        landmarkId: submission.landmarkId,
        landmarkName: submission.landmarkName,
        type: submission.type,
        title: submission.title.trim(),
        content: submission.content.trim(),
        imageUrl: imageUrl,
        submittedBy: user.displayName || user.email || 'Anonymous',
        status: 'pending',
        likes: 0,
        reports: 0,
        isHelpful: false,
        tags: submission.tags || [],
        created_at: serverTimestamp()
      };

      // Save to Firestore
      await addDoc(collection(db, 'crowdsourced_tips'), tipData);

      this.successSubject.next('Tip submitted successfully! It will be reviewed before being published.');
      return true;

    } catch (error) {
      console.error('Error submitting tip:', error);
      this.errorSubject.next('Failed to submit tip. Please try again.');
      return false;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  // Get approved tips for a landmark
  async getTipsForLandmark(landmarkId: string): Promise<CrowdsourcedTip[]> {
    try {
      const q = query(
        collection(db, 'crowdsourced_tips'),
        where('landmarkId', '==', landmarkId),
        where('status', '==', 'approved'),
        orderBy('likes', 'desc'),
        orderBy('created_at', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const tips: CrowdsourcedTip[] = [];

      snapshot.forEach((doc) => {
        tips.push({
          id: doc.id,
          ...doc.data()
        } as CrowdsourcedTip);
      });

      return tips;
    } catch (error) {
      console.error('Error fetching tips:', error);
      this.errorSubject.next('Failed to load tips');
      return [];
    }
  }

  // Get user's submitted tips
  async getUserTips(): Promise<CrowdsourcedTip[]> {
    try {
      const user = auth.currentUser;
      if (!user) return [];

      const q = query(
        collection(db, 'crowdsourced_tips'),
        where('userId', '==', user.uid),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      const tips: CrowdsourcedTip[] = [];

      snapshot.forEach((doc) => {
        tips.push({
          id: doc.id,
          ...doc.data()
        } as CrowdsourcedTip);
      });

      return tips;
    } catch (error) {
      console.error('Error fetching user tips:', error);
      return [];
    }
  }

  // Get recent approved tips (for homepage or general display)
  async getRecentTips(limitCount: number = 10): Promise<CrowdsourcedTip[]> {
    try {
      const q = query(
        collection(db, 'crowdsourced_tips'),
        where('status', '==', 'approved'),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const tips: CrowdsourcedTip[] = [];

      snapshot.forEach((doc) => {
        tips.push({
          id: doc.id,
          ...doc.data()
        } as CrowdsourcedTip);
      });

      return tips;
    } catch (error) {
      console.error('Error fetching recent tips:', error);
      return [];
    }
  }

  // Upload tip image to Firebase Storage
  private async uploadTipImage(image: File, landmarkId: string): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) return '';

      // Create unique filename
      const fileName = `tips/${landmarkId}/${user.uid}_${Date.now()}_${image.name}`;
      const storageRef = ref(storage, fileName);

      // Upload file
      const snapshot = await uploadBytes(storageRef, image);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading tip image:', error);
      return '';
    }
  }

  // Validate tip submission
  private validateSubmission(submission: TipSubmission): boolean {
    if (!submission.landmarkId || !submission.landmarkName) {
      this.errorSubject.next('Please select a valid landmark');
      return false;
    }

    if (!submission.title || submission.title.trim().length < 5) {
      this.errorSubject.next('Title must be at least 5 characters long');
      return false;
    }

    if (!submission.content || submission.content.trim().length < 10) {
      this.errorSubject.next('Content must be at least 10 characters long');
      return false;
    }

    if (submission.title.trim().length > 100) {
      this.errorSubject.next('Title cannot exceed 100 characters');
      return false;
    }

    if (submission.content.trim().length > 1000) {
      this.errorSubject.next('Content cannot exceed 1000 characters');
      return false;
    }

    // Validate image if provided
    if (submission.image) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

      if (submission.image.size > maxSize) {
        this.errorSubject.next('Image must be smaller than 5MB');
        return false;
      }

      if (!allowedTypes.includes(submission.image.type)) {
        this.errorSubject.next('Please upload a valid image file (JPG, PNG, or WebP)');
        return false;
      }
    }

    return true;
  }

  // Clear success and error messages
  clearMessages(): void {
    this.errorSubject.next(null);
    this.successSubject.next(null);
  }

  // Get tip types for form dropdown
  getTipTypes(): Array<{value: string, label: string, description: string}> {
    return [
      { 
        value: 'advice', 
        label: 'Travel Advice', 
        description: 'Tips about visiting, timing, what to bring' 
      },
      { 
        value: 'experience', 
        label: 'Personal Experience', 
        description: 'Your story or memorable moment at this place' 
      },
      { 
        value: 'fact', 
        label: 'Interesting Fact', 
        description: 'Lesser-known information or trivia' 
      },
      { 
        value: 'history', 
        label: 'Historical Detail', 
        description: 'Additional historical context or stories' 
      },
      { 
        value: 'photo', 
        label: 'Photo Spot', 
        description: 'Great photography locations or angles' 
      }
    ];
  }
}