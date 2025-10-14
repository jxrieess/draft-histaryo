import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where,
  orderBy, limit, serverTimestamp, writeBatch, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { auth } from '../firebase.config';
import { CrowdsourcedTip } from './tips.service';

export interface ModerationAction {
  id: string;
  tipId: string;
  action: 'approve' | 'reject' | 'flag' | 'edit';
  moderatorId: string;
  moderatorName: string;
  notes?: string;
  timestamp: any;
  previousStatus?: string;
  newStatus?: string;
}

export interface ModerationStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalFlagged: number;
  pendingByType: { [key: string]: number };
  averageReviewTime: number;
  moderatorPerformance: { [key: string]: number };
}

export interface ModerationQueue {
  pending: CrowdsourcedTip[];
  flagged: CrowdsourcedTip[];
  recentlyReviewed: CrowdsourcedTip[];
}

export interface AttributionOption {
  value: 'waive' | 'credit';
  label: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModerationService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private successSubject = new BehaviorSubject<string | null>(null);
  private moderationQueueSubject = new BehaviorSubject<ModerationQueue>({
    pending: [],
    flagged: [],
    recentlyReviewed: []
  });

  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public success$ = this.successSubject.asObservable();
  public moderationQueue$ = this.moderationQueueSubject.asObservable();

  constructor() {}
  async getPendingContent(): Promise<CrowdsourcedTip[]> {
    this.loadingSubject.next(true);
    try {
      const q = query(
        collection(db, 'crowdsourced_tips'),
        where('status', '==', 'pending'),
        orderBy('created_at', 'asc'),
        limit(100)
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
      console.error('Error fetching pending content:', error);
      this.errorSubject.next('Failed to load pending content');
      return [];
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async getFlaggedContent(): Promise<CrowdsourcedTip[]> {
    try {
      const q = query(
        collection(db, 'crowdsourced_tips'),
        where('reports', '>', 0),
        orderBy('reports', 'desc'),
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
      console.error('Error fetching flagged content:', error);
      return [];
    }
  }

  async getRecentlyReviewed(limitCount: number = 20): Promise<CrowdsourcedTip[]> {
    try {
      const q = query(
        collection(db, 'crowdsourced_tips'),
        where('status', 'in', ['approved', 'rejected']),
        orderBy('approved_at', 'desc'),
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
      console.error('Error fetching recently reviewed content:', error);
      return [];
    }
  }

  async approveContent(tipId: string, notes?: string, attribution?: 'waive' | 'credit'): Promise<boolean> {
    this.loadingSubject.next(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        this.errorSubject.next('Authentication required');
        return false;
      }

      const tipRef = doc(db, 'crowdsourced_tips', tipId);
      const updateData: any = {
        status: 'approved',
        approved_at: serverTimestamp(),
        moderator_id: user.uid,
        moderatorNotes: notes || ''
      };

      if (attribution) {
        updateData.attribution = attribution;
        if (attribution === 'waive') {
          updateData.attributionWaived = true;
        }
      }

      await updateDoc(tipRef, updateData);

      await this.logModerationAction(tipId, 'approve', notes);

      this.successSubject.next('Content approved successfully');
      await this.refreshModerationQueue();
      return true;
    } catch (error) {
      console.error('Error approving content:', error);
      this.errorSubject.next('Failed to approve content');
      return false;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async rejectContent(tipId: string, reason: string, notes?: string): Promise<boolean> {
    this.loadingSubject.next(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        this.errorSubject.next('Authentication required');
        return false;
      }

      const tipRef = doc(db, 'crowdsourced_tips', tipId);
      await updateDoc(tipRef, {
        status: 'rejected',
        approved_at: serverTimestamp(),
        moderator_id: user.uid,
        moderatorNotes: notes || '',
        rejectionReason: reason
      });

      await this.logModerationAction(tipId, 'reject', notes);

      this.successSubject.next('Content rejected');
      await this.refreshModerationQueue();
      return true;
    } catch (error) {
      console.error('Error rejecting content:', error);
      this.errorSubject.next('Failed to reject content');
      return false;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async flagContent(tipId: string, reason: string): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) {
        this.errorSubject.next('Authentication required');
        return false;
      }

      const tipRef = doc(db, 'crowdsourced_tips', tipId);
      await updateDoc(tipRef, {
        reports: 1, 
        flagged_at: serverTimestamp(),
        flagReason: reason,
        flaggedBy: user.uid
      });

      await this.logModerationAction(tipId, 'flag', reason);

      this.successSubject.next('Content flagged for review');
      return true;
    } catch (error) {
      console.error('Error flagging content:', error);
      this.errorSubject.next('Failed to flag content');
      return false;
    }
  }

  async editContent(tipId: string, updates: Partial<CrowdsourcedTip>, notes?: string): Promise<boolean> {
    this.loadingSubject.next(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        this.errorSubject.next('Authentication required');
        return false;
      }

      const tipRef = doc(db, 'crowdsourced_tips', tipId);
      const updateData = {
        ...updates,
        edited_at: serverTimestamp(),
        edited_by: user.uid,
        editNotes: notes || ''
      };

      await updateDoc(tipRef, updateData);

      await this.logModerationAction(tipId, 'edit', notes);

      this.successSubject.next('Content updated successfully');
      await this.refreshModerationQueue();
      return true;
    } catch (error) {
      console.error('Error editing content:', error);
      this.errorSubject.next('Failed to edit content');
      return false;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async bulkApprove(tipIds: string[], notes?: string): Promise<boolean> {
    this.loadingSubject.next(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        this.errorSubject.next('Authentication required');
        return false;
      }

      const batch = writeBatch(db);
      
      tipIds.forEach(tipId => {
        const tipRef = doc(db, 'crowdsourced_tips', tipId);
        batch.update(tipRef, {
          status: 'approved',
          approved_at: serverTimestamp(),
          moderator_id: user.uid,
          moderatorNotes: notes || '',
          bulkApproved: true
        });
      });

      await batch.commit();

      await this.logBulkModerationAction(tipIds, 'approve', notes);

      this.successSubject.next(`${tipIds.length} items approved successfully`);
      await this.refreshModerationQueue();
      return true;
    } catch (error) {
      console.error('Error bulk approving content:', error);
      this.errorSubject.next('Failed to bulk approve content');
      return false;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async bulkReject(tipIds: string[], reason: string, notes?: string): Promise<boolean> {
    this.loadingSubject.next(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        this.errorSubject.next('Authentication required');
        return false;
      }

      const batch = writeBatch(db);
      
      tipIds.forEach(tipId => {
        const tipRef = doc(db, 'crowdsourced_tips', tipId);
        batch.update(tipRef, {
          status: 'rejected',
          approved_at: serverTimestamp(),
          moderator_id: user.uid,
          moderatorNotes: notes || '',
          rejectionReason: reason,
          bulkRejected: true
        });
      });

      await batch.commit();

      await this.logBulkModerationAction(tipIds, 'reject', notes);

      this.successSubject.next(`${tipIds.length} items rejected`);
      await this.refreshModerationQueue();
      return true;
    } catch (error) {
      console.error('Error bulk rejecting content:', error);
      this.errorSubject.next('Failed to bulk reject content');
      return false;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async getModerationStats(): Promise<ModerationStats> {
    try {
      const [pendingTips, approvedTips, rejectedTips, flaggedTips] = await Promise.all([
        this.getPendingContent(),
        this.getContentByStatus('approved'),
        this.getContentByStatus('rejected'),
        this.getFlaggedContent()
      ]);

      const pendingByType: { [key: string]: number } = {};
      pendingTips.forEach(tip => {
        pendingByType[tip.type] = (pendingByType[tip.type] || 0) + 1;
      });

      return {
        totalPending: pendingTips.length,
        totalApproved: approvedTips.length,
        totalRejected: rejectedTips.length,
        totalFlagged: flaggedTips.length,
        pendingByType,
        averageReviewTime: 0, 
        moderatorPerformance: {} 
      };
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
      return {
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        totalFlagged: 0,
        pendingByType: {},
        averageReviewTime: 0,
        moderatorPerformance: {}
      };
    }
  }

  private async getContentByStatus(status: string): Promise<CrowdsourcedTip[]> {
    try {
      const q = query(
        collection(db, 'crowdsourced_tips'),
        where('status', '==', status),
        orderBy('created_at', 'desc'),
        limit(1000)
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
      console.error(`Error fetching ${status} content:`, error);
      return [];
    }
  }

  private async logModerationAction(tipId: string, action: string, notes?: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const actionData = {
        tipId,
        action,
        moderatorId: user.uid,
        moderatorName: user.displayName || user.email || 'Unknown',
        notes: notes || '',
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'moderation_logs'), actionData);
    } catch (error) {
      console.error('Error logging moderation action:', error);
    }
  }

  private async logBulkModerationAction(tipIds: string[], action: string, notes?: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const actionData = {
        tipIds,
        action,
        moderatorId: user.uid,
        moderatorName: user.displayName || user.email || 'Unknown',
        notes: notes || '',
        timestamp: serverTimestamp(),
        count: tipIds.length
      };

      await addDoc(collection(db, 'moderation_logs'), actionData);
    } catch (error) {
      console.error('Error logging bulk moderation action:', error);
    }
  }

  async refreshModerationQueue(): Promise<void> {
    try {
      const [pending, flagged, recentlyReviewed] = await Promise.all([
        this.getPendingContent(),
        this.getFlaggedContent(),
        this.getRecentlyReviewed()
      ]);

      this.moderationQueueSubject.next({
        pending,
        flagged,
        recentlyReviewed
      });
    } catch (error) {
      console.error('Error refreshing moderation queue:', error);
    }
  }

  getAttributionOptions(): AttributionOption[] {
    return [
      {
        value: 'waive',
        label: 'Waive Rights',
        description: 'Submitter waives all rights to this content'
      },
      {
        value: 'credit',
        label: 'Give Credit',
        description: 'Credit the submitter for this content'
      }
    ];
  }

  getRejectionReasons(): Array<{value: string, label: string}> {
    return [
      { value: 'inappropriate', label: 'Inappropriate Content' },
      { value: 'inaccurate', label: 'Inaccurate Information' },
      { value: 'duplicate', label: 'Duplicate Content' },
      { value: 'low_quality', label: 'Low Quality' },
      { value: 'spam', label: 'Spam' },
      { value: 'copyright', label: 'Copyright Violation' },
      { value: 'other', label: 'Other' }
    ];
  }

  clearMessages(): void {
    this.errorSubject.next(null);
    this.successSubject.next(null);
  }
}
