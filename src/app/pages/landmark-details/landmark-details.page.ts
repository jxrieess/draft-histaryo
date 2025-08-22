import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import {
  collection, doc, getDoc, getDocs, query, where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { db } from '../../firebase.config';

interface LandmarkDoc {
  name: string;
  description: string;
  image_path?: string;
  then_image_path?: string;
  now_image_path?: string;
  video_url?: string;
  latitude?: number | string;
  longitude?: number | string;
  slug?: string;
  category?: string;
  city?: string;
}

interface LandmarkVM {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  thenUrl?: string;
  nowUrl?: string;
  videoUrl?: string;
  latitude?: number | string;
  longitude?: number | string;
  category?: string;
  city?: string;
}

@Component({
  selector: 'app-landmark-details',
  templateUrl: './landmark-details.page.html',
  styleUrls: ['./landmark-details.page.scss'],
  standalone: false
})
export class LandmarkDetailsPage implements OnInit {
  landmark: LandmarkVM | null = null;
  loading = true;
  activeTab = 'story';
  sliderValue = 50;
  isStamped = false;
  showArExperience = false;
  arContent: any = null;

  private storageSvc = getStorage();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private local: Storage,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit(): Promise<void> {
    await this.local.create();
    await this.loadLandmarkFromRoute();
  }

  private async loadLandmarkFromRoute(): Promise<void> {
    this.loading = true;
    this.landmark = null;

    try {
      const routeId = this.route.snapshot.paramMap.get('id');
      
      const queryId = this.route.snapshot.queryParamMap.get('id');
      const slug = this.route.snapshot.queryParamMap.get('slug');

      const landmarkId = routeId || queryId;

      if (landmarkId) {
        await this.loadById(landmarkId);
      } else if (slug) {
        await this.loadBySlug(slug);
      } else {
        await this.toast('Invalid landmark link.', 'danger');
        this.router.navigate(['/home']);
        return;
      }

      const currentLandmark = this.landmark as LandmarkVM | null;
      
      if (currentLandmark !== null && currentLandmark.id) {
        await this.syncStamp(currentLandmark.id);
        await this.loadArContent(currentLandmark.id);
      } else {
        await this.toast('Landmark not found.', 'danger');
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Error loading landmark:', error);
      await this.toast('Failed to load landmark.', 'danger');
      this.router.navigate(['/home']);
    } finally {
      this.loading = false;
    }
  }

  private async loadById(id: string): Promise<void> {
    try {
      const snap = await getDoc(doc(db, 'landmarks', id));
      if (!snap.exists()) {
        await this.toast('Landmark not found.', 'danger');
        this.landmark = null;
        return;
      }
      const data = snap.data() as LandmarkDoc;
      this.landmark = await this.toVM(snap.id, data);
    } catch (error) {
      console.error('Error loading landmark by ID:', error);
      this.landmark = null;
    }
  }

  private async loadBySlug(slug: string): Promise<void> {
    try {
      const q = query(collection(db, 'landmarks'), where('slug', '==', slug));
      const snap = await getDocs(q);
      if (snap.empty) {
        await this.toast('Landmark not found.', 'danger');
        this.landmark = null;
        return;
      }
      const d = snap.docs[0];
      this.landmark = await this.toVM(d.id, d.data() as LandmarkDoc);
    } catch (error) {
      console.error('Error loading landmark by slug:', error);
      this.landmark = null;
    }
  }

  private async toVM(id: string, data: LandmarkDoc): Promise<LandmarkVM> {
    const [img, thenImg, nowImg] = await Promise.all([
      this.resolveImage(data.image_path),
      this.resolveImage(data.then_image_path),
      this.resolveImage(data.now_image_path),
    ]);

    return {
      id,
      name: data.name,
      description: data.description,
      imageUrl: img ?? 'assets/img/placeholder.jpg',
      thenUrl: thenImg || undefined,
      nowUrl: nowImg || undefined,
      videoUrl: data.video_url,
      latitude: data.latitude,
      longitude: data.longitude,
      category: data.category,
      city: data.city,
    };
  }

  private async resolveImage(pathOrUrl?: string): Promise<string | null> {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    try {
      return await getDownloadURL(ref(this.storageSvc, pathOrUrl));
    } catch {
      return null;
    }
  }

  private async loadArContent(landmarkId: string): Promise<void> {
    try {
      const arDoc = await getDoc(doc(db, 'ar_content', landmarkId));
      if (arDoc.exists()) {
        this.arContent = arDoc.data();
      }
    } catch (error) {
      console.error('Error loading AR content:', error);
    }
  }

  async launchArExperience(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;
    
    try {
      this.showArExperience = true;
      await this.toast('AR Experience launched! 🚀', 'success');
      
      this.router.navigate(['/ar-experience'], { 
        queryParams: { id: currentLandmark.id } 
      });
    } catch (error) {
      await this.toast('Failed to launch AR experience', 'danger');
    }
  }

  private async syncStamp(id: string): Promise<void> {
    const stamps: string[] = (await this.local.get('stamps')) || [];
    this.isStamped = stamps.includes(id);
  }

  async collectStamp(): Promise<void> {
    const currentLandmark = this.landmark;
    if (!currentLandmark || this.isStamped) return;

    const stamps: string[] = (await this.local.get('stamps')) || [];
    stamps.push(currentLandmark.id);
    await this.local.set('stamps', stamps);
    
    this.isStamped = true;
    await this.toast('Stamp collected! 🎉', 'success');
  }

  startScavengerHunt(): void {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;
    this.router.navigate(['/scavenger'], { 
      queryParams: { landmarkId: currentLandmark.id } 
    });
  }

  viewTips(): void {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;
    this.router.navigate(['/tips'], { 
      queryParams: { landmarkId: currentLandmark.id } 
    });
  }

  submitTip(): void {
    const currentLandmark = this.landmark;
    if (!currentLandmark) return;
    this.router.navigate(['/submit-tip'], { 
      queryParams: { landmarkId: currentLandmark.id } 
    });
  }

  private async toast(
    message: string,
    color: 'success' | 'danger' | 'primary' = 'success'
  ): Promise<void> {
    const t = await this.toastCtrl.create({ 
      message, 
      duration: 2000, 
      color,
      position: 'bottom'
    });
    await t.present();
  }

  onSliderChange(event: any): void {
    this.sliderValue = event.detail.value;
  }
}