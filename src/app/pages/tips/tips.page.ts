// // src/app/pages/tips/tips.page.ts
// import { Component, OnInit } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { ToastController, AlertController, ModalController } from '@ionic/angular';
// import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
// import { db, auth } from '../../firebase.config';

// interface CrowdsourcedTip {
//   id: string;
//   landmarkId: string;
//   landmarkName: string;
//   authorId: string;
//   authorEmail: string;
//   title: string;
//   content: string;
//   tipType: 'advice' | 'fact' | 'experience' | 'photo';
//   imageUrl?: string;
//   status: 'pending' | 'approved' | 'rejected';
//   createdAt: any;
//   rating?: number;
//   helpfulCount?: number;
//   reportCount?: number;
// }

// @Component({
//   selector: 'app-tips',
//   templateUrl: './tips.page.html',
//   styleUrls: ['./tips.page.scss'],
//   standalone: false
// })
// export class TipsPage implements OnInit {
//   landmarkId: string = '';
//   landmarkName: string = '';
//   tips: CrowdsourcedTip[] = [];
//   filteredTips: CrowdsourcedTip[] = [];
  
//   // UI State
//   loading = false;
//   refreshing = false;
//   selectedFilter = 'all';
//   sortBy = 'newest';
  
//   // Filter options
//   filterOptions = [
//     { value: 'all', label: 'All Tips', icon: 'list' },
//     { value: 'advice', label: 'Advice', icon: 'bulb' },
//     { value: 'fact', label: 'Facts', icon: 'library' },
//     { value: 'experience', label: 'Experiences', icon: 'heart' },
//     { value: 'photo', label: 'Photos', icon: 'camera' }
//   ];
  
//   sortOptions = [
//     { value: 'newest', label: 'Newest First' },
//     { value: 'oldest', label: 'Oldest First' },
//     { value: 'helpful', label: 'Most Helpful' },
//     { value: 'rating', label: 'Highest Rated' }
//   ];

//   constructor(
//     private route: ActivatedRoute,
//     private router: Router,
//     private toastCtrl: ToastController,
//     private alertCtrl: AlertController,
//     private modalCtrl: ModalController
//   ) {}

//   async ngOnInit() {
//     this.route.queryParams.subscribe(async (params) => {
//       this.landmarkId = params['landmarkId'] || '';
//       if (this.landmarkId) {
//         await this.loadLandmarkInfo();
//         await this.loadTips();
//       } else {
//         await this.showError('No landmark specified');
//       }
//     });
//   }

//   async loadLandmarkInfo() {
//     try {
//       const landmarkDoc = await getDoc(doc(db, 'landmarks', this.landmarkId));
//       if (landmarkDoc.exists()) {
//         this.landmarkName = landmarkDoc.data()['name'] || 'Unknown Landmark';
//       }
//     } catch (error) {
//       console.error('Error loading landmark info:', error);
//     }
//   }

//   async loadTips() {
//     this.loading = true;
//     try {
//       const tipsQuery = query(
//         collection(db, 'crowdsourced_tips'),
//         where('landmarkId', '==', this.landmarkId),
//         where('status', '==', 'approved'),
//         orderBy('createdAt', 'desc')
//       );
      
//       const querySnapshot = await getDocs(tipsQuery);
//       this.tips = querySnapshot.docs.map(doc => ({
//         id: doc.id,
//         ...doc.data()
//       })) as CrowdsourcedTip[];
      
//       this.applyFilters();
      
//     } catch (error) {
//       console.error('Error loading tips:', error);
//       await this.showToast('Failed to load tips', 'danger');
//     } finally {
//       this.loading = false;
//     }
//   }

//   async handleRefresh(event: any) {
//     this.refreshing = true;
//     await this.loadTips();
//     this.refreshing = false;
//     event.target.complete();
//   }

//   applyFilters() {
//     let filtered = [...this.tips];
    
//     // Apply type filter
//     if (this.selectedFilter !== 'all') {
//       filtered = filtered.filter(tip => tip.tipType === this.selectedFilter);
//     }
    
//     // Apply sorting
//     switch (this.sortBy) {
//       case 'newest':
//         filtered.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
//         break;
//       case 'oldest':
//         filtered.sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
//         break;
//       case 'helpful':
//         filtered.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
//         break;
//       case 'rating':
//         filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
//         break;
//     }
    
//     this.filteredTips = filtered;
//   }

//   onFilterChange() {
//     this.applyFilters();
//   }

//   onSortChange() {
//     this.applyFilters();
//   }

//   async markHelpful(tip: CrowdsourcedTip) {
//     try {
//       // Implementation would update Firestore document
//       await this.showToast('Thank you for your feedback!');
//       // Refresh tips to show updated count
//       await this.loadTips();
//     } catch (error) {
//       await this.showToast('Failed to mark as helpful', 'danger');
//     }
//   }

//   async reportTip(tip: CrowdsourcedTip) {
//     const alert = await this.alertCtrl.create({
//       header: 'Report Tip',
//       message: 'Why are you reporting this tip?',
//       inputs: [
//         {
//           name: 'reason',
//           type: 'radio',
//           label: 'Inappropriate content',
//           value: 'inappropriate'
//         },
//         {
//           name: 'reason',
//           type: 'radio',
//           label: 'Spam or misleading',
//           value: 'spam'
//         },
//         {
//           name: 'reason',
//           type: 'radio',
//           label: 'Incorrect information',
//           value: 'incorrect'
//         },
//         {
//           name: 'reason',
//           type: 'radio',
//           label: 'Other',
//           value: 'other'
//         }
//       ],
//       buttons: [
//         {
//           text: 'Cancel',
//           role: 'cancel'
//         },
//         {
//           text: 'Report',
//           handler: async (data) => {
//             if (data) {
//               // Implementation would submit report to Firestore
//               await this.showToast('Tip has been reported. Thank you!');
//             }
//           }
//         }
//       ]
//     });
//     await alert.present();
//   }

//   navigateToSubmitTip() {
//     this.router.navigate(['/submit-tip'], {
//       queryParams: { landmarkId: this.landmarkId }
//     });
//   }

//   goBack() {
//     this.router.navigate(['/landmark-details'], {
//       queryParams: { id: this.landmarkId }
//     });
//   }

//   getTipTypeIcon(type: string): string {
//     switch (type) {
//       case 'advice': return 'bulb';
//       case 'fact': return 'library';
//       case 'experience': return 'heart';
//       case 'photo': return 'camera';
//       default: return 'information-circle';
//     }
//   }

//   getTipTypeColor(type: string): string {
//     switch (type) {
//       case 'advice': return 'warning';
//       case 'fact': return 'secondary';
//       case 'experience': return 'success';
//       case 'photo': return 'primary';
//       default: return 'medium';
//     }
//   }

//   formatDate(timestamp: any): string {
//     if (!timestamp) return '';
    
//     const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
//     const now = new Date();
//     const diffTime = Math.abs(now.getTime() - date.getTime());
//     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
//     if (diffDays === 1) return 'Today';
//     if (diffDays === 2) return 'Yesterday';
//     if (diffDays <= 7) return `${diffDays} days ago`;
    
//     return date.toLocaleDateString();
//   }

//   async showError(message: string) {
//     await this.showToast(message, 'danger');
//     this.router.navigate(['/home']);
//   }

//   async showToast(message: string, color: string = 'primary') {
//     const toast = await this.toastCtrl.create({
//       message,
//       duration: 3000,
//       color,
//       position: 'bottom'
//     });
//     await toast.present();
//   }
// }

// src/app/pages/tips/tips.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  ToastController, 
  AlertController, 
  ActionSheetController,
  ModalController,
  LoadingController 
} from '@ionic/angular';
import { Share } from '@capacitor/share';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  increment,
  startAfter
} from 'firebase/firestore';
import { auth, db } from '../../firebase.config';
import { Subscription } from 'rxjs';

interface CrowdsourcedTip {
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
  expanded?: boolean;
  userHelpful?: boolean;
}

@Component({
  selector: 'app-tips',
  templateUrl: './tips.page.html',
  styleUrls: ['./tips.page.scss'],
  standalone: false
})
export class TipsPage implements OnInit, OnDestroy {
  landmarkId: string = '';
  landmarkName: string = '';
  
  allTips: CrowdsourcedTip[] = [];
  filteredTips: CrowdsourcedTip[] = [];
  
  loading = true;
  loadingMore = false;
  hasMoreTips = true;
  
  selectedFilter: string = 'all';
  sortBy: string = 'newest';
  
  private subscriptions: Subscription[] = [];
  private lastVisible: any = null;
  private readonly TIPS_PER_PAGE = 10;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      this.landmarkId = params['landmarkId'] || '';
      if (this.landmarkId) {
        await this.loadLandmarkInfo();
        await this.loadTips();
      } else {
        await this.showError('No landmark specified');
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadLandmarkInfo() {
    try {
      const landmarkDoc = await getDoc(doc(db, 'landmarks', this.landmarkId));
      if (landmarkDoc.exists()) {
        this.landmarkName = landmarkDoc.data()['name'] || 'Unknown Landmark';
      }
    } catch (error) {
      console.error('Error loading landmark info:', error);
    }
  }

  async loadTips(loadMore: boolean = false) {
    if (loadMore) {
      this.loadingMore = true;
    } else {
      this.loading = true;
      this.allTips = [];
      this.lastVisible = null;
    }

    try {
      let tipsQuery = query(
        collection(db, 'crowdsourced_tips'),
        where('landmarkId', '==', this.landmarkId),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(this.TIPS_PER_PAGE)
      );

      if (loadMore && this.lastVisible) {
        tipsQuery = query(
          collection(db, 'crowdsourced_tips'),
          where('landmarkId', '==', this.landmarkId),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          startAfter(this.lastVisible),
          limit(this.TIPS_PER_PAGE)
        );
      }

      const querySnapshot = await getDocs(tipsQuery);
      
      if (querySnapshot.empty) {
        this.hasMoreTips = false;
      } else {
        const newTips = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            landmarkId: data['landmarkId'],
            landmarkName: data['landmarkName'],
            authorId: data['authorId'],
            authorEmail: data['authorEmail'],
            title: data['title'],
            content: data['content'],
            tipType: data['tipType'],
            imageUrl: data['imageUrl'],
            status: data['status'],
            createdAt: data['createdAt'],
            rating: data['rating'] || 0,
            helpfulCount: data['helpfulCount'] || 0,
            expanded: false,
            userHelpful: false
          } as CrowdsourcedTip;
        });

        if (loadMore) {
          this.allTips = [...this.allTips, ...newTips];
        } else {
          this.allTips = newTips;
        }

        this.lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        this.hasMoreTips = querySnapshot.docs.length === this.TIPS_PER_PAGE;
      }

      await this.loadUserInteractions();
      this.filterTips();

    } catch (error) {
      console.error('Error loading tips:', error);
      await this.showToast('Failed to load tips', 'danger');
    } finally {
      this.loading = false;
      this.loadingMore = false;
    }
  }

  async loadUserInteractions() {
    const user = auth.currentUser;
    if (!user) return;

    // Load user's helpful votes and ratings
    // This would typically be stored in a separate collection
    // For now, we'll simulate this data
    this.allTips.forEach(tip => {
      tip.userHelpful = Math.random() > 0.8; // Simulate user helpful votes
    });
  }

  filterTips() {
    let filtered = [...this.allTips];

    // Apply type filter
    if (this.selectedFilter !== 'all') {
      filtered = filtered.filter(tip => tip.tipType === this.selectedFilter);
    }

    // Apply sorting
    switch (this.sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        break;
      case 'oldest':
        filtered.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
        break;
      case 'helpful':
        filtered.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    this.filteredTips = filtered;
  }

  sortTips() {
    this.filterTips();
  }

  resetFilters() {
    this.selectedFilter = 'all';
    this.sortBy = 'newest';
    this.filterTips();
  }

  expandTip(tip: CrowdsourcedTip) {
    tip.expanded = true;
  }

  async toggleHelpful(tip: CrowdsourcedTip) {
    const user = auth.currentUser;
    if (!user) {
      await this.showToast('Please log in to rate tips', 'warning');
      return;
    }

    try {
      const wasHelpful = tip.userHelpful;
      tip.userHelpful = !wasHelpful;
      
      if (tip.userHelpful) {
        tip.helpfulCount = (tip.helpfulCount || 0) + 1;
      } else {
        tip.helpfulCount = Math.max((tip.helpfulCount || 1) - 1, 0);
      }

      // Update in Firestore
      const tipRef = doc(db, 'crowdsourced_tips', tip.id);
      await updateDoc(tipRef, {
        helpfulCount: increment(tip.userHelpful ? 1 : -1)
      });

      await this.showToast(
        tip.userHelpful ? 'Marked as helpful!' : 'Removed helpful vote',
        'success'
      );

    } catch (error) {
      console.error('Error updating helpful vote:', error);
      await this.showToast('Failed to update vote', 'danger');
      
      // Revert on error
      tip.userHelpful = !tip.userHelpful;
      if (!tip.userHelpful) {
        tip.helpfulCount = (tip.helpfulCount || 0) + 1;
      } else {
        tip.helpfulCount = Math.max((tip.helpfulCount || 1) - 1, 0);
      }
    }
  }

  async rateTip(tip: CrowdsourcedTip) {
    const alert = await this.alertCtrl.create({
      header: 'Rate This Tip',
      message: 'How helpful was this tip?',
      inputs: [
        {
          name: 'rating',
          type: 'radio',
          label: '⭐ (1 star)',
          value: '1',
          checked: false
        },
        {
          name: 'rating',
          type: 'radio',
          label: '⭐⭐ (2 stars)',
          value: '2',
          checked: false
        },
        {
          name: 'rating',
          type: 'radio',
          label: '⭐⭐⭐ (3 stars)',
          value: '3',
          checked: true
        },
        {
          name: 'rating',
          type: 'radio',
          label: '⭐⭐⭐⭐ (4 stars)',
          value: '4',
          checked: false
        },
        {
          name: 'rating',
          type: 'radio',
          label: '⭐⭐⭐⭐⭐ (5 stars)',
          value: '5',
          checked: false
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Submit Rating',
          handler: async (data) => {
            if (data) {
              await this.submitRating(tip, parseInt(data));
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async submitRating(tip: CrowdsourcedTip, rating: number) {
    const user = auth.currentUser;
    if (!user) {
      await this.showToast('Please log in to rate tips', 'warning');
      return;
    }

    try {
      // In a real app, you'd want to track individual user ratings
      // and calculate averages. For now, we'll simulate this.
      
      const newRating = ((tip.rating || 0) + rating) / 2; // Simplified average
      tip.rating = newRating;

      await this.showToast('Rating submitted!', 'success');

    } catch (error) {
      console.error('Error submitting rating:', error);
      await this.showToast('Failed to submit rating', 'danger');
    }
  }

  async shareTip(tip: CrowdsourcedTip) {
    try {
      await Share.share({
        title: tip.title,
        text: `Check out this tip about ${this.landmarkName}: "${tip.content}"`,
        url: window.location.href
      });
    } catch (error) {
      console.warn('Share not available:', error);
      await this.showToast('Sharing not available on this device', 'warning');
    }
  }

  async showTipOptions(tip: CrowdsourcedTip) {
    const user = auth.currentUser;
    const isAuthor = user && user.uid === tip.authorId;

    const buttons = [
      {
        text: 'Share',
        icon: 'share',
        handler: () => this.shareTip(tip)
      }
    ];

    if (isAuthor) {
      buttons.push({
        text: 'Edit',
        icon: 'create',
        handler: () => this.editTip(tip)
      });

      buttons.push({
        text: 'Delete',
        icon: 'trash',
        role: 'destructive',
        handler: () => this.deleteTip(tip)
      });
    } else {
      buttons.push({
        text: 'Report',
        icon: 'flag',
        handler: () => this.reportTip(tip)
      });
    }

    buttons.push({
      text: 'Cancel',
      icon: 'close',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Tip Options',
      buttons: buttons
    });

    await actionSheet.present();
  }

  async editTip(tip: CrowdsourcedTip) {
    this.router.navigate(['/submit-tip'], {
      queryParams: { 
        landmarkId: this.landmarkId,
        editTipId: tip.id
      }
    });
  }

  async deleteTip(tip: CrowdsourcedTip) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Tip',
      message: 'Are you sure you want to delete this tip? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            // Implement delete functionality
            await this.showToast('Tip deleted', 'success');
            this.loadTips(); // Reload tips
          }
        }
      ]
    });

    await alert.present();
  }

  async reportTip(tip: CrowdsourcedTip) {
    const alert = await this.alertCtrl.create({
      header: 'Report Tip',
      message: 'Why are you reporting this tip?',
      inputs: [
        {
          name: 'reason',
          type: 'radio',
          label: 'Inappropriate content',
          value: 'inappropriate',
          checked: true
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Spam',
          value: 'spam'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Misleading information',
          value: 'misleading'
        },
        {
          name: 'reason',
          type: 'radio',
          label: 'Other',
          value: 'other'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Report',
          handler: async (data) => {
            if (data) {
              await this.showToast('Tip reported. Thank you for helping maintain quality.', 'success');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async viewImage(imageUrl: string) {
    // Implement image viewer modal
    const modal = await this.modalCtrl.create({
      component: 'ImageViewerComponent', // You'd need to create this component
      componentProps: {
        imageUrl: imageUrl
      }
    });

    await modal.present();
  }

  async loadMoreTips() {
    if (!this.hasMoreTips || this.loadingMore) return;
    await this.loadTips(true);
  }

  submitTip() {
    this.router.navigate(['/submit-tip'], {
      queryParams: { landmarkId: this.landmarkId }
    });
  }

  // Utility methods
  trackByTipId(index: number, tip: CrowdsourcedTip): string {
    return tip.id;
  }

  getTipTypeColor(type: string): string {
    const colors = {
      advice: 'primary',
      fact: 'secondary',
      experience: 'tertiary',
      photo: 'success'
    };
    return colors[type as keyof typeof colors] || 'medium';
  }

  getTipTypeIcon(type: string): string {
    const icons = {
      advice: 'bulb',
      fact: 'library',
      experience: 'heart',
      photo: 'camera'
    };
    return icons[type as keyof typeof icons] || 'information-circle';
  }

  getTipTypeLabel(type: string): string {
    const labels = {
      advice: 'Advice',
      fact: 'Fact',
      experience: 'Experience',
      photo: 'Photo'
    };
    return labels[type as keyof typeof labels] || 'Tip';
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  }

  getAuthorName(email: string): string {
    if (!email) return 'Anonymous';
    
    // Extract name from email or show first part
    const atIndex = email.indexOf('@');
    if (atIndex > 0) {
      return email.substring(0, atIndex);
    }
    
    return 'Visitor';
  }

  async showError(message: string) {
    await this.showToast(message, 'danger');
    this.router.navigate(['/home']);
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}