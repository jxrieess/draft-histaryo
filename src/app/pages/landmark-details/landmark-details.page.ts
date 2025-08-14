import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import {
  collection, doc, getDoc, getDocs, query, where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { db } from '../../firebase.config';

// interface LandmarkDoc {
//   name: string;
//   description: string;
//   image_path?: string;
//   then_image_path?: string;
//   now_image_path?: string;
//   video_url?: string;
//   latitude?: number | string;
//   longitude?: number | string;
//   slug?: string;
// }

// interface LandmarkVM {
//   id: string;
//   name: string;
//   description: string;
//   imageUrl: string;
//   thenUrl?: string;
//   nowUrl?: string;
//   videoUrl?: string;
//   latitude?: number | string;
//   longitude?: number | string;
// }

@Component({
  selector: 'app-landmark-details',
  templateUrl: './landmark-details.page.html',
  styleUrls: ['./landmark-details.page.scss'],
  standalone: false
})
export class LandmarkDetailsPage implements OnInit {
//   // Explicitly nullable to play nice with Angular's template checker
//   landmark: LandmarkVM | null = null;
//   loading = true;

//   activeTab = 'story';
//   sliderValue = 50;
//   isStamped = false;

//   private storageSvc = getStorage();

//   constructor(
//     private route: ActivatedRoute,
//     private local: Storage,
//     private toastCtrl: ToastController
//   ) {}

  async ngOnInit() {
//     await this.local.create();

//     this.route.queryParams.subscribe(async (params) => {
//       this.loading = true;
//       this.landmark = null; // reset while loading

//       const id = params['id'] as string | undefined;
//       const slug = params['slug'] as string | undefined;

//       try {
//         if (id) {
//           await this.loadById(id);
//         } else if (slug) {
//           await this.loadBySlug(slug);
//         } else {
//           await this.toast('Invalid landmark link.', 'danger');
//         }

//         if (this.landmark) {
//           await this.syncStamp(this.landmark.id);
//         }
//       } catch {
//         await this.toast('Failed to load landmark.', 'danger');
//       } finally {
//         this.loading = false;
//       }
//     });
//   }

//   // ---------- Firestore loaders ----------

//   private async loadById(id: string) {
//     const snap = await getDoc(doc(db, 'landmarks', id));
//     if (!snap.exists()) {
//       await this.toast('Landmark not found.', 'danger');
//       return;
//     }
//     const data = snap.data() as LandmarkDoc;
//     this.landmark = await this.toVM(snap.id, data);
//   }

//   private async loadBySlug(slug: string) {
//     const q = query(collection(db, 'landmarks'), where('slug', '==', slug));
//     const snap = await getDocs(q);
//     if (snap.empty) {
//       await this.toast('Landmark not found.', 'danger');
//       return;
//     }
//     const d = snap.docs[0];
//     this.landmark = await this.toVM(d.id, d.data() as LandmarkDoc);
//   }

//   // ---------- Helpers ----------

//   private async toVM(id: string, data: LandmarkDoc): Promise<LandmarkVM> {
//     const [img, thenImg, nowImg] = await Promise.all([
//       this.resolveImage(data.image_path),
//       this.resolveImage(data.then_image_path),
//       this.resolveImage(data.now_image_path),
//     ]);

//     return {
//       id,
//       name: data.name,
//       description: data.description,
//       imageUrl: img ?? '',
//       thenUrl: thenImg || undefined,
//       nowUrl: nowImg || undefined,
//       videoUrl: data.video_url,
//       latitude: data.latitude,
//       longitude: data.longitude,
//     };
//   }

//   /** Accepts a Storage path (e.g., 'landmarks/foo.jpg') OR a full https URL. */
//   private async resolveImage(pathOrUrl?: string): Promise<string | null> {
//     if (!pathOrUrl) return null;
//     if (pathOrUrl.startsWith('http')) return pathOrUrl;
//     try {
//       return await getDownloadURL(ref(this.storageSvc, pathOrUrl));
//     } catch {
//       return null;
//     }
//   }

//   // ---------- Stamps ----------

//   private async syncStamp(id: string) {
//     const stamps: string[] = (await this.local.get('stamps')) || [];
//     this.isStamped = stamps.includes(id);
//   }

//   // ---------- UI ----------

//   private async toast(
//     message: string,
//     color: 'success' | 'danger' | 'primary' = 'success'
//   ) {
//     const t = await this.toastCtrl.create({ message, duration: 2000, color });
//     await t.present();
  }
}
