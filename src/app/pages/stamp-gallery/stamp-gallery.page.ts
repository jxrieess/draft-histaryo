import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { collection, getDocs } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { db } from '../../firebase.config';

interface LandmarkDoc {
  name: string;
  image?: string;          
  image_path?: string;     
}

interface LandmarkVM {
  id: string;
  name: string;
  imageUrl: string;       
}

@Component({
  selector: 'app-stamp-gallery',
  templateUrl: './stamp-gallery.page.html',
  styleUrls: ['./stamp-gallery.page.scss'],
  standalone: false
})
export class StampGalleryPage implements OnInit {
  loading = true;

  allLandmarks: LandmarkVM[] = [];
  collectedIds: string[] = [];

  total = 0;
  collectedCount = 0;
  percent = 0;        
  showBadge = false;

  private storageReady = false;
  private storageSvc = getStorage();

  constructor(private local: Storage) {}

  async ngOnInit() {
    await this.local.create();
    this.storageReady = true;

    try {
      await Promise.all([this.loadCollected(), this.loadLandmarks()]);
      this.recompute();
    } finally {
      this.loading = false;
    }
  }


  private async loadCollected() {
    const saved: unknown = await this.local.get('stamps');
    if (Array.isArray(saved)) {
      this.collectedIds = saved.filter((x) => typeof x === 'string');
    } else {
      this.collectedIds = [];
    }
  }

  private async loadLandmarks() {
    const snap = await getDocs(collection(db, 'landmarks'));
    const items = await Promise.all(
      snap.docs.map(async (d): Promise<LandmarkVM> => {
        const data = d.data() as LandmarkDoc;
        const url =
          (await this.resolveImage(data.image_path)) ||
          data.image ||
          'assets/img/placeholder.jpg';

        return {
          id: d.id,
          name: data.name,
          imageUrl: url,
        };
      })
    );

    this.allLandmarks = items;
  }

  private async resolveImage(path?: string): Promise<string | null> {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    try {
      return await getDownloadURL(ref(this.storageSvc, path));
    } catch {
      return null;
    }
  }


  isCollected(id: string): boolean {
    return this.collectedIds.includes(id);
  }

  private recompute() {
    this.total = this.allLandmarks.length;
    this.collectedCount = this.collectedIds.filter((id) =>
      this.allLandmarks.some((lm) => lm.id === id)
    ).length;

    this.percent = this.total > 0 ? Math.round((this.collectedCount / this.total) * 100) : 0;
    this.showBadge = this.total > 0 && this.collectedCount === this.total;
  }
}
