import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { db } from '../../firebase.config';

interface LandmarkDoc {
  name: string;
  description: string;
  image_path?: string;
  latitude?: number | string;
  longitude?: number | string;
  slug?: string;
  category?: string;
  city?: string;
  historical_significance?: string;
  construction_date?: string;
  architect?: string;
  architectural_style?: string;
  fun_facts?: string[];
  visiting_tips?: string[];
}

interface LandmarkVM {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  latitude?: number | string;
  longitude?: number | string;
  category?: string;
  city?: string;
  historicalSignificance?: string;
  constructionDate?: string;
  architect?: string;
  architecturalStyle?: string;
  funFacts?: string[];
  visitingTips?: string[];
  triviaCount?: number;
  hasTrivia?: boolean;
}

@Component({
  selector: 'app-landmarks',
  templateUrl: './landmarks.page.html',
  styleUrls: ['./landmarks.page.scss'],
  standalone: false
})
export class LandmarksPage implements OnInit, OnDestroy {
  landmarks: LandmarkVM[] = [];
  filteredLandmarks: LandmarkVM[] = [];
  loading = true;
  error: string | null = null;
  
  searchQuery = '';
  categoryFilter = '';
  cityFilter = '';
  sortBy = 'name'; 
  viewMode: 'grid' | 'list' = 'grid';

  availableCategories: string[] = [];
  availableCities: string[] = [];

  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 1;
  
  userStamps: string[] = [];
  userBookmarks: string[] = [];

  private storageSvc = getStorage();

  constructor(
    private router: Router,
    private local: Storage,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit(): Promise<void> {
    await this.local.create();
    await this.loadUserPreferences();
    await this.loadLandmarks();
  }

  ngOnDestroy(): void {
  }

  private async loadUserPreferences(): Promise<void> {
    try {
      this.userStamps = (await this.local.get('stamps')) || [];
      this.userBookmarks = (await this.local.get('bookmarks')) || [];
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  private async loadLandmarks(): Promise<void> {
    this.loading = true;
    this.error = null;

    const loading = await this.loadingCtrl.create({
      message: 'Loading heritage landmarks...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      
      const landmarksRef = collection(db, 'landmarks');
      
      const q = query(landmarksRef, orderBy('name'), limit(100));
      
      const querySnapshot = await getDocs(q);
      
      const landmarks: LandmarkVM[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data() as LandmarkDoc;
        const landmark = await this.toVM(doc.id, data);
        landmarks.push(landmark);
      }
      
      this.landmarks = landmarks;
      this.filteredLandmarks = [...this.landmarks];
      this.extractFilterOptions();
      this.calculatePagination();
      
      
      if (this.landmarks.length > 0) {
        await this.showToast(`Loaded ${this.landmarks.length} heritage landmarks`, 'success');
      } else {
        this.addSampleLandmarks();
        await this.showToast('No landmarks found, showing sample data', 'warning');
      }
      
    } catch (error) {
      console.error('❌ Error loading landmarks:', error);
      console.error('❌ Error details:', error);
      
      this.addSampleLandmarks();
      this.error = null; 
      
      await this.showToast('Using sample landmarks (Firebase unavailable)', 'warning');
    } finally {
      this.loading = false;
      await loading.dismiss();
    }
  }

  private async toVM(id: string, data: LandmarkDoc): Promise<LandmarkVM> {
    const imageUrl = await this.resolveImage(data.image_path);

    const triviaCount = await this.loadTriviaCount(id);

    return {
      id,
      name: data.name,
      description: data.description,
      imageUrl: imageUrl || this.getDefaultImageUrl(undefined, data.category),
      latitude: data.latitude,
      longitude: data.longitude,
      category: data.category,
      city: data.city,
      historicalSignificance: data.historical_significance,
      constructionDate: data.construction_date,
      architect: data.architect,
      architecturalStyle: data.architectural_style,
      funFacts: data.fun_facts || [],
      visitingTips: data.visiting_tips || [],
      triviaCount,
      hasTrivia: triviaCount > 0
    };
  }

  private async loadTriviaCount(landmarkId: string): Promise<number> {
    try {
      const triviaRef = collection(db, 'trivia');
      const triviaQuery = query(
        triviaRef, 
        where('landmark_id', '==', landmarkId)
      );
      
      const querySnapshot = await getDocs(triviaQuery);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error loading trivia count for landmark:', landmarkId, error);
      return 0;
    }
  }

  private async resolveImage(pathOrUrl?: string): Promise<string | null> {
    if (!pathOrUrl) return null;
    if (pathOrUrl.startsWith('http')) return pathOrUrl;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Image load timeout')), 3000)
      );
      
      const imagePromise = getDownloadURL(ref(this.storageSvc, pathOrUrl));
      
      return await Promise.race([imagePromise, timeoutPromise]);
    } catch (error) {
      console.warn('Failed to load image:', pathOrUrl, error);
      return null;
    }
  }

  getDefaultImageUrl(imageUrl?: string, category?: string, landmarkId?: string, landmarkName?: string): string {
    if (landmarkName) {
      const name = landmarkName.toLowerCase().trim();
      
      if (name.includes('basilica') || name.includes('santo niño') || name.includes('santo nino')) {
        return 'assets/img/basilica.jpg';
      }

      if (name.includes('casa gorordo') || name.includes('gorordo')) {
        return 'assets/img/Casa-Gorordo.jpg';
      }

      if (name.includes('cathedral') || name.includes('archdiocesan')) {
        return 'assets/img/Cathedral-Museum.jpg';
      }

      if (name.includes('fort san pedro') || name.includes('fort') && name.includes('san pedro')) {
        return 'assets/img/fort-san-pedro.jpg';
      }

      if (name.includes('magellan') || name.includes('cross')) {
        return 'assets/img/magellans-cross.jpg';
      }

      if (name.includes('liberty') || name.includes('lapu-lapu') || name.includes('mactan')) {
        return 'assets/img/Liberty-Shrine.jpg';
      }

      if (name.includes('joseph') || name.includes('mandaue')) {
        return 'assets/img/Nat-Shrine-of-St.Joseph.jpg';
      }

      if (name.includes('san isidro') || name.includes('isidro') || name.includes('talisay')) {
        return 'assets/img/San-Isidro-Labrador.jpg';
      }
    }

    if (category) {
      const cat = category.toLowerCase();
      if (cat === 'religious') return 'assets/img/basilica.jpg';
      if (cat === 'historical') return 'assets/img/fort-san-pedro.jpg';
      if (cat === 'cultural') return 'assets/img/magellans-cross.jpg';
      if (cat === 'museum') return 'assets/img/Cathedral-Museum.jpg';
      if (cat === 'architecture') return 'assets/img/Casa-Gorordo.jpg';
      if (cat === 'park') return 'assets/img/Liberty-Shrine.jpg';
    }

    return 'assets/img/default-landmark.jpg';
  }

  private extractFilterOptions(): void {
    const categories = new Set<string>();
    const cities = new Set<string>();

    this.landmarks.forEach(landmark => {
      if (landmark.category && landmark.category !== 'General') {
        categories.add(landmark.category);
      }
      if (landmark.city && landmark.city !== 'Unknown') {
        cities.add(landmark.city);
      }
    });

    this.availableCategories = Array.from(categories).sort();
    this.availableCities = Array.from(cities).sort();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.landmarks];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(landmark => {
        const searchableText = `${landmark.name} ${landmark.description} ${landmark.city} ${landmark.category}`.toLowerCase();
        return searchableText.includes(query);
      });
    }

    if (this.categoryFilter) {
      filtered = filtered.filter(landmark => landmark.category === this.categoryFilter);
    }

    if (this.cityFilter) {
      filtered = filtered.filter(landmark => landmark.city === this.cityFilter);
    }

    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'city':
          return (a.city || '').localeCompare(b.city || '');
        case 'date':
          return (b.constructionDate || '').localeCompare(a.constructionDate || '');
        default:
          return 0;
      }
    });

    this.filteredLandmarks = filtered;
    this.currentPage = 1;
    this.calculatePagination();
  }

  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredLandmarks.length / this.itemsPerPage);
  }

  get paginatedLandmarks(): LandmarkVM[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredLandmarks.slice(startIndex, endIndex);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.categoryFilter = '';
    this.cityFilter = '';
    this.sortBy = 'name';
    this.applyFilters();
    this.showToast('Filters cleared', 'success');
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  async navigateToLandmark(landmark: LandmarkVM): Promise<void> {
    
    this.router.navigate(['/landmark-details', landmark.id]).then(success => {
      if (success) {
      } else {
        console.error('❌ Failed to navigate to landmark details');
        this.showToast('Failed to open landmark details', 'danger');
      }
    }).catch(error => {
      console.error('❌ Navigation error:', error);
      this.showToast('Navigation error occurred', 'danger');
    });
  }

  async navigateToMap(landmark: LandmarkVM): Promise<void> {
    
    this.router.navigate(['/map'], {
      queryParams: { 
        landmarkId: landmark.id,
        landmarkName: landmark.name
      }
    }).then(success => {
      if (success) {
        this.showToast(`Opening ${landmark.name} on map`, 'success');
      } else {
        console.error('❌ Failed to navigate to map');
        this.showToast('Failed to open map', 'danger');
      }
    }).catch(error => {
      console.error('❌ Navigation error:', error);
      this.showToast('Navigation error occurred', 'danger');
    });
  }

  async toggleBookmark(landmark: LandmarkVM): Promise<void> {
    try {
      const isBookmarked = this.userBookmarks.includes(landmark.id);
      
      if (isBookmarked) {
        const index = this.userBookmarks.indexOf(landmark.id);
        this.userBookmarks.splice(index, 1);
        await this.showToast('Bookmark removed', 'medium');
      } else {
        this.userBookmarks.push(landmark.id);
        await this.showToast('Landmark bookmarked! 📌', 'success');
      }
      
      await this.local.set('bookmarks', this.userBookmarks);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      await this.showToast('Failed to update bookmark', 'danger');
    }
  }

  async refreshLandmarks(): Promise<void> {
    await this.loadLandmarks();
  }

  goBackToHome(): void {
    this.router.navigate(['/home']).then(success => {
      if (success) {
      } else {
        console.error('❌ Failed to navigate to home page');
        this.showToast('Failed to navigate to home page', 'danger');
      }
    }).catch(error => {
      console.error('❌ Navigation error:', error);
      this.showToast('Navigation error occurred', 'danger');
    });
  }

  onImageError(event: any): void {
    event.target.src = 'assets/img/default-landmark.jpg';
  }

  trackByLandmarkId(index: number, landmark: LandmarkVM): string {
    return landmark.id;
  }

  get isBookmarked(): (landmarkId: string) => boolean {
    return (landmarkId: string) => this.userBookmarks.includes(landmarkId);
  }

  get isStamped(): (landmarkId: string) => boolean {
    return (landmarkId: string) => this.userStamps.includes(landmarkId);
  }

  get hasFilters(): boolean {
    return !!(this.searchQuery || this.categoryFilter || this.cityFilter);
  }

  get totalLandmarksCount(): number {
    return this.landmarks.length;
  }

  get filteredLandmarksCount(): number {
    return this.filteredLandmarks.length;
  }

  get showingResults(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredLandmarks.length);
    return `Showing ${start}-${end} of ${this.filteredLandmarks.length}`;
  }

  private addSampleLandmarks(): void {
    
    const sampleLandmarks: LandmarkVM[] = [
      {
        id: 'sample-1',
        name: 'Fort San Pedro',
        description: 'A military defense structure built by the Spanish colonial government in Cebu. It is the oldest triangular bastion fort in the Philippines.',
        imageUrl: 'assets/img/fort-san-pedro.jpg',
        category: 'Historical',
        city: 'Cebu City',
        latitude: 10.2936,
        longitude: 123.9044,
        constructionDate: '1565',
        historicalSignificance: 'Built by Spanish conquistador Miguel López de Legazpi',
        funFacts: ['Oldest fort in the Philippines', 'Triangular bastion design', 'Used as a military defense structure'],
        visitingTips: ['Open daily from 8 AM to 5 PM', 'Entrance fee required', 'Guided tours available'],
        triviaCount: 5,
        hasTrivia: true
      },
      {
        id: 'sample-2',
        name: 'Basilica del Santo Niño',
        description: 'The oldest Roman Catholic church in the Philippines, housing the image of the Santo Niño de Cebú.',
        imageUrl: 'assets/img/basilica.jpg',
        category: 'Religious',
        city: 'Cebu City',
        latitude: 10.2936,
        longitude: 123.9044,
        constructionDate: '1565',
        historicalSignificance: 'First Catholic church established in the Philippines',
        funFacts: ['Houses the oldest religious relic in the Philippines', 'Site of the Sinulog Festival', 'Pilgrimage destination'],
        visitingTips: ['Dress modestly when visiting', 'Mass schedules available', 'Museum and gift shop on site'],
        triviaCount: 8,
        hasTrivia: true
      },
      {
        id: 'sample-3',
        name: 'Magellan\'s Cross',
        description: 'A Christian cross planted by Portuguese and Spanish explorers as ordered by Ferdinand Magellan upon arriving in Cebu.',
        imageUrl: 'assets/img/magellans-cross.jpg',
        category: 'Historical',
        city: 'Cebu City',
        latitude: 10.2936,
        longitude: 123.9044,
        constructionDate: '1521',
        historicalSignificance: 'Marked the arrival of Christianity in the Philippines',
        funFacts: ['Original cross is encased in wood', 'Site of first Catholic mass in the Philippines', 'Symbol of Cebu\'s Christian heritage'],
        visitingTips: ['Free to visit', 'Located in downtown Cebu', 'Near other historical sites'],
        triviaCount: 6,
        hasTrivia: true
      },
      {
        id: 'sample-4',
        name: 'Taoist Temple',
        description: 'A Chinese temple built by the Cebu\'s Chinese community, offering panoramic views of the city.',
        imageUrl: 'assets/img/default-landmark.jpg',
        category: 'Cultural',
        city: 'Cebu City',
        latitude: 10.2936,
        longitude: 123.9044,
        constructionDate: '1972',
        historicalSignificance: 'Represents the Chinese community\'s contribution to Cebu',
        funFacts: ['Built by Cebu\'s Chinese community', 'Offers city views', 'Active place of worship'],
        visitingTips: ['Wear comfortable shoes for climbing', 'Respectful attire required', 'Best visited in the morning'],
        triviaCount: 3,
        hasTrivia: true
      },
      {
        id: 'sample-5',
        name: 'Casa Gorordo Museum',
        description: 'A well-preserved 19th-century house museum showcasing Cebuano lifestyle during the Spanish colonial period.',
        imageUrl: 'assets/img/default-landmark.jpg',
        category: 'Cultural',
        city: 'Cebu City',
        latitude: 10.2936,
        longitude: 123.9044,
        constructionDate: '1850',
        historicalSignificance: 'Example of Spanish colonial architecture in Cebu',
        funFacts: ['Former residence of Cebu\'s first Filipino bishop', 'Well-preserved colonial furniture', 'Cultural heritage site'],
        visitingTips: ['Guided tours available', 'Photography allowed', 'Educational programs for students'],
        triviaCount: 4,
        hasTrivia: true
      },
      {
        id: 'sample-6',
        name: 'Colon Street',
        description: 'The oldest street in the Philippines, established by Spanish colonizers and now a bustling commercial area.',
        imageUrl: 'assets/img/default-landmark.jpg',
        category: 'Historical',
        city: 'Cebu City',
        latitude: 10.2936,
        longitude: 123.9044,
        constructionDate: '1565',
        historicalSignificance: 'Oldest street in the Philippines',
        funFacts: ['Named after Christopher Columbus', 'Major commercial district', 'Mix of old and new architecture'],
        visitingTips: ['Best visited during business hours', 'Shopping and dining options', 'Historical walking tours available'],
        triviaCount: 7,
        hasTrivia: true
      }
    ];

    this.landmarks = sampleLandmarks;
    this.filteredLandmarks = [...this.landmarks];
    this.extractFilterOptions();
    this.calculatePagination();
    
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' | 'primary' | 'medium' = 'success'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({ 
      message, 
      duration: 3000, 
      color,
      position: 'bottom',
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
}
