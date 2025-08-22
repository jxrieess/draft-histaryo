import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, AlertController, ActionSheetController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db } from '../../firebase.config';

interface TipSubmission {
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
  moderationNotes?: string;
}

@Component({
  selector: 'app-submit-tip',
  templateUrl: './submit-tip.page.html',
  styleUrls: ['./submit-tip.page.scss'],
  standalone: false
})
export class SubmitTipPage implements OnInit {
  landmarkId: string = '';
  landmarkName: string = '';
  
  tipForm = {
    title: '',
    content: '',
    tipType: 'advice' as 'advice' | 'fact' | 'experience' | 'photo'
  };
  
  selectedImage: string | null = null;
  isSubmitting = false;
  
  tipTypes = [
    { value: 'advice', label: 'Helpful Advice', description: 'Share practical tips for visitors' },
    { value: 'fact', label: 'Interesting Fact', description: 'Share historical or cultural facts' },
    { value: 'experience', label: 'Personal Experience', description: 'Share your visit experience' },
    { value: 'photo', label: 'Photo Contribution', description: 'Share photos with descriptions' }
  ];

  private storage = getStorage();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe(async (params) => {
      this.landmarkId = params['landmarkId'] || '';
      if (this.landmarkId) {
        await this.loadLandmarkInfo();
      } else {
        await this.showError('No landmark specified');
      }
    });
  }

  async loadLandmarkInfo(): Promise<void> {
    try {
      const landmarkDoc = await getDoc(doc(db, 'landmarks', this.landmarkId));
      if (landmarkDoc.exists()) {
        this.landmarkName = landmarkDoc.data()['name'] || 'Unknown Landmark';
      } else {
        await this.showError('Landmark not found');
      }
    } catch (error) {
      console.error('Error loading landmark info:', error);
      await this.showError('Failed to load landmark information');
    }
  }

  async presentImageOptions(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Image Source',
      buttons: [
        {
          text: 'Camera',
          icon: 'camera',
          handler: () => {
            this.takePicture(CameraSource.Camera);
          }
        },
        {
          text: 'Photo Library',
          icon: 'image',
          handler: () => {
            this.takePicture(CameraSource.Photos);
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async takePicture(source: CameraSource): Promise<void> {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });

      this.selectedImage = image.dataUrl || null;
    } catch (error) {
      console.error('Error taking picture:', error);
      await this.showToast('Failed to capture image', 'danger');
    }
  }

  removeImage(): void {
    this.selectedImage = null;
  }

  async submitTip(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      await this.showError('You must be logged in to submit tips');
      return;
    }

    this.isSubmitting = true;

    try {
      let imageUrl: string | undefined;

      if (this.selectedImage) {
        imageUrl = await this.uploadImage();
      }

      const tipData: TipSubmission = {
        landmarkId: this.landmarkId,
        landmarkName: this.landmarkName,
        authorId: user.uid,
        authorEmail: user.email || '',
        title: this.tipForm.title.trim(),
        content: this.tipForm.content.trim(),
        tipType: this.tipForm.tipType,
        imageUrl: imageUrl,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'crowdsourced_tips'), tipData);

      await this.showSuccessAlert();
      
    } catch (error) {
      console.error('Error submitting tip:', error);
      await this.showToast('Failed to submit tip. Please try again.', 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  async uploadImage(): Promise<string> {
    if (!this.selectedImage) {
      throw new Error('No image selected');
    }

    const response = await fetch(this.selectedImage);
    const blob = await response.blob();

    const timestamp = Date.now();
    const filename = `tips/${this.landmarkId}/${timestamp}.jpg`;
    
    const storageRef = ref(this.storage, filename);
    const snapshot = await uploadBytes(storageRef, blob);
    
    return await getDownloadURL(snapshot.ref);
  }

  validateForm(): boolean {
    if (!this.tipForm.title.trim()) {
      this.showToast('Please enter a title', 'warning');
      return false;
    }

    if (!this.tipForm.content.trim()) {
      this.showToast('Please enter some content', 'warning');
      return false;
    }

    if (this.tipForm.tipType === 'photo' && !this.selectedImage) {
      this.showToast('Please select an image for photo contributions', 'warning');
      return false;
    }

    if (this.tipForm.title.length < 5) {
      this.showToast('Title must be at least 5 characters long', 'warning');
      return false;
    }

    if (this.tipForm.content.length < 10) {
      this.showToast('Content must be at least 10 characters long', 'warning');
      return false;
    }

    return true;
  }

  async showSuccessAlert(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Tip Submitted!',
      message: 'Thank you for your contribution! Your tip has been submitted for review and will be published once approved by our moderation team.',
      buttons: [
        {
          text: 'Submit Another',
          handler: () => {
            this.resetForm();
          }
        },
        {
          text: 'Back to Landmark',
          handler: () => {
            this.router.navigate(['/landmark-details'], { 
              queryParams: { id: this.landmarkId } 
            });
          }
        }
      ]
    });
    await alert.present();
  }

  resetForm(): void {
    this.tipForm = {
      title: '',
      content: '',
      tipType: 'advice'
    };
    this.selectedImage = null;
  }

  async showError(message: string): Promise<void> {
    await this.showToast(message, 'danger');
    this.router.navigate(['/home']);
  }

  async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  goBack(): void {
    this.router.navigate(['/landmark-details'], { 
      queryParams: { id: this.landmarkId } 
    });
  }

  getTipTypeIcon(type: string): string {
    switch (type) {
      case 'advice': return 'bulb';
      case 'fact': return 'library';
      case 'experience': return 'heart';
      case 'photo': return 'camera';
      default: return 'information-circle';
    }
  }
}