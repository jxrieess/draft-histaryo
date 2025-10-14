import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { TipsService, TipSubmission } from '../../services/tips.service';
import { LandmarkService, Landmark } from '../../services/landmark.service';

@Component({
  selector: 'app-submit-content',
  templateUrl: './submit-content.page.html',
  styleUrls: ['./submit-content.page.scss'],
  standalone: false
})
export class SubmitContentPage implements OnInit, OnDestroy {
  
  landmark: Landmark | null = null;
  landmarkId: string = '';
  
  tipType: string = 'advice';
  title: string = '';
  content: string = '';
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  tags: string[] = [];
  attribution: 'waive' | 'credit' = 'credit';
  
  loading = false;
  error = '';
  
  private subscriptions: Subscription[] = [];
  
  tipTypes = [
    { value: 'advice', label: 'Travel Advice', description: 'Tips about visiting, timing, what to bring' },
    { value: 'experience', label: 'Personal Experience', description: 'Your story or memorable moment at this place' },
    { value: 'fact', label: 'Interesting Fact', description: 'Lesser-known information or trivia' },
    { value: 'history', label: 'Historical Detail', description: 'Additional historical context or stories' },
    { value: 'photo', label: 'Photo Spot', description: 'Great photography locations or angles' }
  ];
  
  attributionOptions = [
    { value: 'credit', label: 'Give Credit', description: 'Credit me for this content' },
    { value: 'waive', label: 'Waive Rights', description: 'I waive all rights to this content' }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private tipsService: TipsService,
    private landmarkService: LandmarkService
  ) {}

  async ngOnInit() {
    this.landmarkId = this.route.snapshot.queryParams['landmarkId'] || '';
    
    if (!this.landmarkId) {
      await this.showToast('No landmark selected', 'danger');
      this.navCtrl.back();
      return;
    }
    
    await this.loadLandmark();
  }

  private async loadLandmark() {
    try {
      const subscription = this.landmarkService.getLandmarkById(this.landmarkId).subscribe({
        next: (landmark) => {
          this.landmark = landmark;
          if (!landmark) {
            this.showToast('Landmark not found', 'danger');
            this.navCtrl.back();
          }
        },
        error: (error) => {
          console.error('Error loading landmark:', error);
          this.showToast('Failed to load landmark', 'danger');
          this.navCtrl.back();
        }
      });
      this.subscriptions.push(subscription);
    } catch (error) {
      console.error('Error loading landmark:', error);
      await this.showToast('Failed to load landmark', 'danger');
      this.navCtrl.back();
    }
  }

  async selectImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.selectedImage = file;
        this.createImagePreview(file);
      }
    };
    input.click();
  }

  private createImagePreview(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.selectedImage = null;
    this.imagePreview = null;
  }

  private validateForm(): boolean {
    if (!this.title.trim()) {
      this.error = 'Please enter a title';
      return false;
    }
    
    if (this.title.trim().length < 5) {
      this.error = 'Title must be at least 5 characters long';
      return false;
    }
    
    if (!this.content.trim()) {
      this.error = 'Please enter content';
      return false;
    }
    
    if (this.content.trim().length < 10) {
      this.error = 'Content must be at least 10 characters long';
      return false;
    }
    
    if (this.title.trim().length > 100) {
      this.error = 'Title cannot exceed 100 characters';
      return false;
    }
    
    if (this.content.trim().length > 1000) {
      this.error = 'Content cannot exceed 1000 characters';
      return false;
    }
    
    return true;
  }

  async submitTip() {
    if (!this.validateForm()) {
      await this.showToast(this.error, 'danger');
      return;
    }
    
    if (!this.landmark) {
      await this.showToast('Landmark not found', 'danger');
      return;
    }
    
    this.loading = true;
    this.error = '';
    
    try {
      const submission: TipSubmission = {
        landmarkId: this.landmark.id,
        landmarkName: this.landmark.name,
        type: this.tipType as any,
        title: this.title.trim(),
        content: this.content.trim(),
        image: this.selectedImage || undefined,
        tags: this.tags
      };
      
      const success = await this.tipsService.submitTip(submission);
      
      if (success) {
        await this.showToast('Tip submitted successfully! It will be reviewed before being published.', 'success');
        this.navCtrl.back();
      } else {
        await this.showToast('Failed to submit tip. Please try again.', 'danger');
      }
      
    } catch (error) {
      console.error('Error submitting tip:', error);
      await this.showToast('An error occurred while submitting your tip', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async cancelSubmission() {
    if (this.title.trim() || this.content.trim() || this.selectedImage) {
      const alert = await this.alertCtrl.create({
        header: 'Discard Changes?',
        message: 'You have unsaved changes. Are you sure you want to go back?',
        buttons: [
          {
            text: 'Keep Editing',
            role: 'cancel'
          },
          {
            text: 'Discard',
            handler: () => {
              this.navCtrl.back();
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.navCtrl.back();
    }
  }

  async addTag() {
    const alert = await this.alertCtrl.create({
      header: 'Add Tag',
      inputs: [
        {
          name: 'tag',
          type: 'text',
          placeholder: 'Enter a tag',
          value: ''
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add',
          handler: (data) => {
            if (data.tag && data.tag.trim()) {
              const tag = data.tag.trim().toLowerCase();
              if (!this.tags.includes(tag)) {
                this.tags.push(tag);
              }
            }
          }
        }
      ]
    });
    await alert.present();
  }

  removeTag(tag: string) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
    }
  }

  get characterCount(): number {
    return this.content.length;
  }

  get titleCharacterCount(): number {
    return this.title.length;
  }

  get currentTipTypeDescription(): string {
    const tipType = this.tipTypes.find(t => t.value === this.tipType);
    return tipType?.description || '';
  }

  get currentAttributionDescription(): string {
    const attribution = this.attributionOptions.find(a => a.value === this.attribution);
    return attribution?.description || '';
  }

  counterFormatter(inputLength: number, maxLength: number): string {
    return `${inputLength}/${maxLength}`;
  }

  goBack() {
    this.navCtrl.back();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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

  onImageError(event: any) {
    console.error('🖼️ Image failed to load:', event.target.src);
    event.target.src = 'assets/img/default-landmark.jpg';
  }

  onImageLoad(event: any) {
  }

  getLandmarkImageWithCacheBust(landmark: any): string {
    const imagePath = this.getLandmarkImage(landmark);
    const finalPath = `${imagePath}?t=${Date.now()}`;
    return finalPath;
  }

  getLandmarkImage(landmark: any): string {
    if (landmark.name) {
      const name = landmark.name.toLowerCase().trim();
      
      if (name.includes('liberty shrine')) {
        return 'assets/img/Liberty-Shrine.jpg';
      }
      
      if (name.includes('cathedral museum')) {
        return 'assets/img/Cathedral-Museum.jpg';
      }
      
      if (name.includes('san isidro') || name.includes('labrador') || name.includes('talisay church')) {
        return 'assets/img/San-Isidro-Labrador.jpg';
      }
      
      if (name.includes('national shrine') || name.includes('st. joseph') || name.includes('mandaue church')) {
        return 'assets/img/Nat-Shrine-of-St.Joseph.jpg';
      }
      
      if (name.includes('basilica') || name.includes('santo niño') || name.includes('santo nino')) {
        return 'assets/img/basilica.jpg';
      }
      
      if (name.includes('casa gorordo') || name.includes('gorordo')) {
        return 'assets/img/Casa-Gorordo.jpg';
      }
      
      if (name.includes('cathedral') || name.includes('metropolitan')) {
        return 'assets/img/cathedral.jpg';
      }
      
      if (name.includes('fort san pedro') || name.includes('fort') || name.includes('san pedro')) {
        return 'assets/img/fort-san-pedro.jpg';
      }
      
      if (name.includes('magellan') || name.includes('cross')) {
        return 'assets/img/magellans-cross.jpg';
      }
      
    }

    return 'assets/img/default-landmark.jpg';
  }
}
