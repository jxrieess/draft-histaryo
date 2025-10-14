import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ModerationService, ModerationStats, ModerationQueue } from '../../services/moderation.service';
import { CrowdsourcedTip } from '../../services/tips.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-moderation',
  templateUrl: './moderation.page.html',
  styleUrls: ['./moderation.page.scss'],
  standalone: false
})
export class ModerationPage implements OnInit, OnDestroy {
  
  moderationQueue: ModerationQueue = {
    pending: [],
    flagged: [],
    recentlyReviewed: []
  };
  
  moderationStats: ModerationStats = {
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    totalFlagged: 0,
    pendingByType: {},
    averageReviewTime: 0,
    moderatorPerformance: {}
  };
  
  selectedTab = 'pending';
  selectedItems: string[] = [];
  loading = true;
  error = '';
  
  rejectionReasons: Array<{value: string, label: string}> = [];
  attributionOptions: Array<{value: string, label: string, description: string}> = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private moderationService: ModerationService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.rejectionReasons = this.moderationService.getRejectionReasons();
    this.attributionOptions = this.moderationService.getAttributionOptions();
    
    await this.loadModerationData();
    this.setupRealtimeUpdates();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async loadModerationData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadModerationQueue(),
        this.loadModerationStats()
      ]);
    } catch (error) {
      console.error('Error loading moderation data:', error);
      this.error = 'Failed to load moderation data';
    } finally {
      this.loading = false;
    }
  }

  private async loadModerationQueue() {
    await this.moderationService.refreshModerationQueue();
  }

  private async loadModerationStats() {
    this.moderationStats = await this.moderationService.getModerationStats();
  }

  private setupRealtimeUpdates() {
    const queueSubscription = this.moderationService.moderationQueue$.subscribe({
      next: (queue) => {
        this.moderationQueue = queue;
      },
      error: (error) => {
        console.error('Error in moderation queue updates:', error);
      }
    });
    
    this.subscriptions.push(queueSubscription);
  }

  selectTab(tab: string) {
    this.selectedTab = tab;
    this.selectedItems = [];
  }

  toggleItemSelection(itemId: string) {
    const index = this.selectedItems.indexOf(itemId);
    if (index > -1) {
      this.selectedItems.splice(index, 1);
    } else {
      this.selectedItems.push(itemId);
    }
  }

  selectAllItems() {
    const currentItems = this.getCurrentItems();
    this.selectedItems = currentItems.map(item => item.id!);
  }

  clearSelection() {
    this.selectedItems = [];
  }

  getCurrentItems(): CrowdsourcedTip[] {
    switch (this.selectedTab) {
      case 'pending':
        return this.moderationQueue.pending;
      case 'flagged':
        return this.moderationQueue.flagged;
      case 'reviewed':
        return this.moderationQueue.recentlyReviewed;
      default:
        return [];
    }
  }

  async approveItem(item: CrowdsourcedTip) {
    const alert = await this.alertCtrl.create({
      header: 'Approve Content',
      message: `Approve "${item.title}"?`,
      inputs: [
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Moderator notes (optional)',
          value: ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Approve',
          handler: async (data) => {
            const success = await this.moderationService.approveContent(item.id!, data.notes);
            if (success) {
              await this.showToast('Content approved', 'success');
              await this.loadModerationData();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  async rejectItem(item: CrowdsourcedTip) {
    const alert = await this.alertCtrl.create({
      header: 'Reject Content',
      message: `Reject "${item.title}"?`,
      inputs: [
        ...this.rejectionReasons.map(r => ({
          name: 'reason',
          type: 'radio' as const,
          label: r.label,
          value: r.value,
          checked: false
        })),
        {
          name: 'notes',
          type: 'textarea' as const,
          placeholder: 'Additional notes (optional)',
          value: ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reject',
          handler: async (data) => {
            if (!data.reason) {
              await this.showToast('Please select a rejection reason', 'danger');
              return;
            }
            
            const success = await this.moderationService.rejectContent(item.id!, data.reason, data.notes);
            if (success) {
              await this.showToast('Content rejected', 'warning');
              await this.loadModerationData();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  async flagItem(item: CrowdsourcedTip) {
    const alert = await this.alertCtrl.create({
      header: 'Flag Content',
      message: `Flag "${item.title}" for review?`,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Reason for flagging',
          value: ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Flag',
          handler: async (data) => {
            if (!data.reason.trim()) {
              await this.showToast('Please provide a reason for flagging', 'danger');
              return;
            }
            
            const success = await this.moderationService.flagContent(item.id!, data.reason);
            if (success) {
              await this.showToast('Content flagged', 'warning');
              await this.loadModerationData();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  async editItem(item: CrowdsourcedTip) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Content',
      message: `Edit "${item.title}"?`,
      inputs: [
        {
          name: 'title',
          type: 'text',
          placeholder: 'Title',
          value: item.title
        },
        {
          name: 'content',
          type: 'textarea',
          placeholder: 'Content',
          value: item.content
        },
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Edit notes (optional)',
          value: ''
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
            const updates = {
              title: data.title,
              content: data.content
            };
            
            const success = await this.moderationService.editContent(item.id!, updates, data.notes);
            if (success) {
              await this.showToast('Content updated', 'success');
              await this.loadModerationData();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  async bulkApprove() {
    if (this.selectedItems.length === 0) {
      await this.showToast('Please select items to approve', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Bulk Approve',
      message: `Approve ${this.selectedItems.length} items?`,
      inputs: [
        {
          name: 'notes',
          type: 'textarea',
          placeholder: 'Moderator notes (optional)',
          value: ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Approve All',
          handler: async (data) => {
            const success = await this.moderationService.bulkApprove(this.selectedItems, data.notes);
            if (success) {
              await this.showToast(`${this.selectedItems.length} items approved`, 'success');
              this.clearSelection();
              await this.loadModerationData();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  async bulkReject() {
    if (this.selectedItems.length === 0) {
      await this.showToast('Please select items to reject', 'warning');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Bulk Reject',
      message: `Reject ${this.selectedItems.length} items?`,
      inputs: [
        ...this.rejectionReasons.map(r => ({
          name: 'reason',
          type: 'radio' as const,
          label: r.label,
          value: r.value,
          checked: false
        })),
        {
          name: 'notes',
          type: 'textarea' as const,
          placeholder: 'Additional notes (optional)',
          value: ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reject All',
          handler: async (data) => {
            if (!data.reason) {
              await this.showToast('Please select a rejection reason', 'danger');
              return;
            }
            
            const success = await this.moderationService.bulkReject(this.selectedItems, data.reason, data.notes);
            if (success) {
              await this.showToast(`${this.selectedItems.length} items rejected`, 'warning');
              this.clearSelection();
              await this.loadModerationData();
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  async viewItemDetails(item: CrowdsourcedTip) {
    const alert = await this.alertCtrl.create({
      header: item.title,
      message: `
        <div class="item-details">
          <p><strong>Type:</strong> ${item.type}</p>
          <p><strong>Landmark:</strong> ${item.landmarkName}</p>
          <p><strong>Submitted by:</strong> ${item.submittedBy}</p>
          <p><strong>Status:</strong> ${item.status}</p>
          <p><strong>Content:</strong></p>
          <p>${item.content}</p>
          ${item.imageUrl ? `<img src="${item.imageUrl}" style="max-width: 100%; height: auto;">` : ''}
          ${item.moderatorNotes ? `<p><strong>Moderator Notes:</strong> ${item.moderatorNotes}</p>` : ''}
        </div>
      `,
      buttons: [
        {
          text: 'Close',
          role: 'cancel'
        }
      ]
    });
    
    await alert.present();
  }

  async refreshData(event?: any) {
    try {
      await this.loadModerationData();
      if (event) {
        event.target.complete();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (event) {
        event.target.complete();
      }
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'approved':
        return 'checkmark-circle-outline';
      case 'rejected':
        return 'close-circle-outline';
      default:
        return 'help-circle-outline';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'advice':
        return 'bulb-outline';
      case 'experience':
        return 'person-outline';
      case 'fact':
        return 'information-circle-outline';
      case 'history':
        return 'library-outline';
      case 'photo':
        return 'camera-outline';
      default:
        return 'document-outline';
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid date';
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  trackByItemId(index: number, item: CrowdsourcedTip): string {
    return item.id || index.toString();
  }
}
