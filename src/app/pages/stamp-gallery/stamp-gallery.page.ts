// import { Component, OnInit } from '@angular/core';
// import { Storage } from '@ionic/storage-angular';
// import { collection, getDocs, doc } from 'firebase/firestore';
// import { db } from '../../firebase.config';

// interface Landmark {
//   id: string;
//   name: string;
//   image: string;
// }

// @Component({
//   selector: 'app-stamp-gallery',
//   templateUrl: './stamp-gallery.page.html',
//   styleUrls: ['./stamp-gallery.page.scss'],
//   standalone: false
// })
// export class StampGalleryPage implements OnInit {
//   allLandmarks: Landmark[] = [];
//   collectedStamps: string[] = [];
//   showBadge: boolean = false;

//   constructor(private storage: Storage) {}

//   async ngOnInit() {
//     await this.storage.create();

//     // Load collected stamps from storage
//     this.collectedStamps = (await this.storage.get('stamps')) || [];

//     // Load all landmarks from Firestore
//     const landmarkSnap = await getDocs(collection(db, 'landmarks'));
//     this.allLandmarks = landmarkSnap.docs.map((doc) => {
//       const data = doc.data() as Landmark;
//       return {
//         id: doc.id,
//         name: data.name,
//         image: data.image,
//       } as Landmark;
//     });

//     // Check if user collected all
//     this.showBadge = this.collectedStamps.length === this.allLandmarks.length;
//   }

//   isCollected(id: string): boolean {
//     return this.collectedStamps.includes(id);
//   }
// }





import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { collection, getDocs } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { db } from '../../firebase.config';

interface LandmarkDoc {
  name: string;
  image?: string;          // if you store direct URL
  image_path?: string;     // if you store Storage path (recommended)
}

interface LandmarkVM {
  id: string;
  name: string;
  imageUrl: string;        // always a resolvable URL in the VM
}

@Component({
  selector: 'app-stamp-gallery',
  templateUrl: './stamp-gallery.page.html',
  styleUrls: ['./stamp-gallery.page.scss'],
  standalone: false
})
export class StampGalleryPage implements OnInit {
  loading = true;

  // we’ll render when this is non-empty OR finished loading
  allLandmarks: LandmarkVM[] = [];
  collectedIds: string[] = [];

  // computed
  total = 0;
  collectedCount = 0;
  percent = 0;        // 0..100
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

  // ---------- data loaders ----------

  private async loadCollected() {
    const saved: unknown = await this.local.get('stamps');
    if (Array.isArray(saved)) {
      // ensure string array
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

  /** Accepts a Storage path like 'landmarks/foo.jpg'; returns URL or null.
   *  If you already store full https URLs in Firestore, skip this.
   */
  private async resolveImage(path?: string): Promise<string | null> {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    try {
      return await getDownloadURL(ref(this.storageSvc, path));
    } catch {
      return null;
    }
  }

  // ---------- computed helpers ----------

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
