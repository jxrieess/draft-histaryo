import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import * as mapboxgl from 'mapbox-gl';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { LandmarkService, Landmark } from '../../services/landmark.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
  standalone: false
})
export class MapPage implements OnInit, AfterViewInit, OnDestroy {
  map!: mapboxgl.Map;
  
  userLat = 10.3157; 
  userLng = 123.8854;
  userLocation: any = null;
  
  landmarks: Landmark[] = [];
  filteredLandmarks: Landmark[] = [];
  
  searchQuery = '';
  categoryFilter = '';
  cityFilter = '';
  difficultyFilter = '';
  showFilters = true;
  
  loading = true;
  mapLoaded = false;
  
  availableCities: string[] = [];
  availableCategories: string[] = [];

  showDirections = false;
  currentRoute: any = null;
  routeSteps: any[] = [];
  routeDistance = '';
  routeDuration = '';
  routeProfile = 'walking'; 
  directionsPanelVisible = false;
  selectedLandmark: Landmark | null = null;
  isCalculatingRoute = false;
  
  private storage = getStorage();
  private landmarksSubscription?: Subscription;

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private landmarkService: LandmarkService
  ) {}

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

  onImageError(event: any): void {
    event.target.src = 'assets/img/default-landmark.jpg';
  }

  async ngOnInit() {
    await this.requestLocationPermission();
    this.loadLandmarksFromService();
    
    this.route.queryParams.subscribe(params => {
      if (params['landmarkId']) {
        this.focusOnLandmark(params['landmarkId']);
      }
    });
    
    (window as any).refreshLocation = () => this.refreshLocation();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
    }, 100);
    
    setTimeout(() => {
      if (!this.mapLoaded) {
    this.initializeMap();
      }
    }, 1000);

    setTimeout(() => {
      if (this.mapLoaded) {
        this.addSampleLandmarks();
      }
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
    if (this.landmarksSubscription) {
      this.landmarksSubscription.unsubscribe();
    }
  }

  private async requestLocationPermission(): Promise<void> {
    try {
      const permission = await Geolocation.requestPermissions();
      
      if (permission.location === 'granted') {
        await this.getCurrentLocation();
      } else {
        await this.showToast('Location permission denied. Using default location.', 'warning');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      await this.showToast('Could not access location services.', 'warning');
    }
  }

  private async getCurrentLocation(): Promise<void> {
    
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000 
      });

      this.userLat = position.coords.latitude;
      this.userLng = position.coords.longitude;
      this.userLocation = {
        latitude: this.userLat,
        longitude: this.userLng,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };


      if (this.mapLoaded) {
        this.updateUserLocationOnMap();
      }
    } catch (error) {
      console.error('❌ Error getting real-time location:', error);
      this.handleLocationError(error);
    }
  }

  private handleLocationError(error: any): void {
    let errorMessage = '';
    
    if (error.code) {
      switch (error.code) {
        case 1: 
          errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
          break;
        case 2: 
          errorMessage = 'Location information is unavailable. Please check your GPS/network connection.';
          break;
        case 3:
          errorMessage = 'Location request timed out. Please try again.';
          break;
        default:
          errorMessage = 'An unknown error occurred while retrieving location.';
          break;
      }
    } else {
      errorMessage = 'Unable to access location services.';
    }
    
    console.error(`❌ Location Error: ${errorMessage}`);
    
    this.showToast(`Location Error: ${errorMessage}`, 'warning');

    this.setFallbackLocation();
  }

  private setFallbackLocation(): void {
    this.userLat = 10.3157;
    this.userLng = 123.8854;
    this.userLocation = {
      latitude: this.userLat,
      longitude: this.userLng,
      accuracy: null,
      timestamp: Date.now(),
      isFallback: true
    };
    
    if (this.mapLoaded) {
      this.updateUserLocationOnMap();
    }
  }

  private loadLandmarksFromService(): void {
    const loading = this.loadingCtrl.create({
      message: 'Loading heritage landmarks...',
      spinner: 'crescent'
    });
    
    loading.then(loader => loader.present());

    this.landmarksSubscription = this.landmarkService.getAllLandmarks().subscribe({
      next: (landmarks) => {
        
        this.landmarks = landmarks;
      this.filteredLandmarks = [...this.landmarks];
      this.extractFilterOptions();
      this.updateMarkers();
        
        this.loading = false;
        loading.then(loader => loader.dismiss());
      
      const message = this.landmarks.length > 0 
          ? `Loaded ${this.landmarks.length} landmarks`
          : 'No landmarks found. Please check your connection or contact support.';
        
        this.showToast(message, this.landmarks.length > 0 ? 'success' : 'warning');
      },
      error: (error) => {
        console.error('❌ Error loading landmarks from service:', error);
      this.loading = false;
        loading.then(loader => loader.dismiss());
        this.showToast('Failed to load landmarks. Please check your connection.', 'danger');
      }
    });
  }



  private async resolveImageUrl(imagePath?: string): Promise<string | null> {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    try {
      const url = await getDownloadURL(ref(this.storage, imagePath));
      return url;
    } catch (error) {
      console.error('Error resolving image URL:', error);
      return null;
    }
  }

  private isValidCoordinate(lat: any, lng: any): boolean {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    return !isNaN(latitude) && !isNaN(longitude) &&
           latitude >= -90 && latitude <= 90 &&
           longitude >= -180 && longitude <= 180;
  }

  private extractFilterOptions(): void {
    const cities = new Set<string>();
    const categories = new Set<string>();

    this.landmarks.forEach(landmark => {
      if (landmark.city && landmark.city !== 'Unknown') cities.add(landmark.city);
      if (landmark.category && landmark.category !== 'General') categories.add(landmark.category);
    });

    this.availableCities = Array.from(cities).sort();
    this.availableCategories = Array.from(categories).sort();
  }

  private applyFilters(): void {
    this.filteredLandmarks = this.landmarks.filter(landmark => {
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const searchableText = `${landmark.name} ${landmark.description} ${landmark.city} ${landmark.category}`.toLowerCase();
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      if (this.categoryFilter && landmark.category !== this.categoryFilter) {
        return false;
      }

      if (this.cityFilter && landmark.city !== this.cityFilter) {
        return false;
      }

      if (this.difficultyFilter && landmark.difficulty !== this.difficultyFilter) {
        return false;
      }

      return true;
    });
  }

  updateMarkers(): void {
    this.applyFilters();
    
    if (this.mapLoaded) {
      this.addLandmarksToMap();
    }
  }

  private initializeMap(): void {
    try {
      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        console.error('❌ Map container not found');
        this.showToast('Map container not found. Please refresh the page.', 'danger');
        return;
      }

      (mapboxgl as any).accessToken = 'pk.eyJ1IjoianhyaWVlc3NzIiwiYSI6ImNtZDVxejZ6djAxamEyb29yMWRkajM4aWUifQ.a3uBgsbAZHm-hQf27958wA';


      this.map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [this.userLng, this.userLat],
        zoom: 13,
        attributionControl: true
      });

    this.map.on('load', () => {
      this.mapLoaded = true;
      this.setupMap();
    });

    this.map.on('error', (e) => {
      console.error('❌ Mapbox error:', e);
      this.showToast('Map failed to load. Please check your internet connection.', 'danger');
    });

    this.map.on('style.load', () => {
    });

    this.map.on('style.error', (e) => {
      console.error('❌ Map style error:', e);
      this.map.setStyle('mapbox://styles/mapbox/outdoors-v12');
    });

    } catch (error) {
      console.error('❌ Error initializing map:', error);
      this.showToast('Failed to initialize map. Please refresh the page.', 'danger');
    }
  }

  private setupMap(): void {
    if (this.userLocation) {
      this.updateUserLocationOnMap();
    }

    this.addLandmarksToMap();
    
    this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    
    this.fitMapToLandmarks();
  }

  private updateUserLocationOnMap(): void {
    if (!this.map || !this.userLocation) return;


    const userMarker = document.createElement('div');
    userMarker.className = 'user-location-marker';
    userMarker.innerHTML = `
      <div class="user-marker-pulse"></div>
      <div class="user-marker-center">
        <ion-icon name="person" style="color: white; font-size: 12px;"></ion-icon>
      </div>
    `;
    
    userMarker.style.cssText = `
      width: 30px;
      height: 30px;
      position: relative;
      cursor: pointer;
    `;

    const pulseStyle = document.createElement('style');
    pulseStyle.textContent = `
      .user-marker-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 30px;
        height: 30px;
        background: #d97706;
        border-radius: 50%;
        animation: userPulse 2s infinite;
        opacity: 0.6;
      }
      .user-marker-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: #d97706;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 2;
      }
      @keyframes userPulse {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.3; }
        100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
      }
    `;
    
    if (!document.head.querySelector('#user-marker-styles')) {
      pulseStyle.id = 'user-marker-styles';
      document.head.appendChild(pulseStyle);
    }

    const marker = new mapboxgl.Marker({ element: userMarker })
      .setLngLat([this.userLocation.longitude, this.userLocation.latitude])
      .setPopup(new mapboxgl.Popup({ 
        offset: 25,
        className: 'user-location-popup'
      }).setHTML(`
        <div class="user-popup-content">
          <h3>📍 You are here</h3>
          <p>${this.userLocation.isFallback ? 'Using default location (Cebu City)' : 'Real-time location detected'}</p>
          <div class="location-coords">
            <small>Lat: ${this.userLocation.latitude.toFixed(6)}</small><br>
            <small>Lng: ${this.userLocation.longitude.toFixed(6)}</small>
            ${this.userLocation.accuracy ? `<br><small>Accuracy: ±${Math.round(this.userLocation.accuracy)}m</small>` : ''}
          </div>
          <div class="location-actions">
            <button class="refresh-location-btn" onclick="window.refreshLocation()">
              🔄 Refresh Location
            </button>
          </div>
        </div>
      `))
      .addTo(this.map);

    this.map.flyTo({
      center: [this.userLocation.longitude, this.userLocation.latitude],
      zoom: 14,
      duration: 2000
    });

  }

  private addLandmarksToMap(): void {
    if (!this.map || !this.mapLoaded) return;


    if (this.map.getSource('landmarks')) {
      this.map.removeLayer('landmarks-layer');
      this.map.removeLayer('landmarks-glow');
      this.map.removeLayer('landmarks-labels');
      this.map.removeSource('landmarks');
    }

    const validLandmarks = this.filteredLandmarks.filter(landmark => {
      const lat = landmark.latitude;
      const lng = landmark.longitude;
      const isValid = lat && lng && lat !== 0 && lng !== 0 && 
                     lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      
      if (!isValid) {
        console.warn('⚠️ Invalid coordinates for landmark:', landmark.name, { lat, lng });
      }
      
      return isValid;
    });


    if (validLandmarks.length === 0) {
      console.warn('⚠️ No valid landmarks to display on map');
      return;
    }

    this.loadCustomIcons().then(() => {
      this.addLandmarksWithCustomIcons(validLandmarks);
    });
  }

  private async loadCustomIcons(): Promise<void> {
    const iconCategories = ['church', 'fortress', 'museum', 'monument', 'historical', 'cultural', 'religious', 'default'];
    
    for (const category of iconCategories) {
      const iconName = `landmark-${category}`;
      
      if (!this.map.hasImage(iconName)) {
        const svgIcon = this.createCustomIcon(category);
        const img = new Image();
        img.onload = () => {
          this.map.addImage(iconName, img);
        };
        img.src = `data:image/svg+xml;base64,${btoa(svgIcon)}`;
      }
    }
  }

  private createCustomIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      church: this.getChurchIcon(),
      fortress: this.getFortressIcon(),
      museum: this.getMuseumIcon(),
      monument: this.getMonumentIcon(),
      historical: this.getHistoricalIcon(),
      cultural: this.getCulturalIcon(),
      religious: this.getReligiousIcon(),
      default: this.getDefaultIcon()
    };

    return iconMap[category] || iconMap['default'];
  }

  private getChurchIcon(): string {
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#d97706" stroke="#fff" stroke-width="2"/>
        <path d="M16 6 L20 10 L20 14 L18 14 L18 26 L14 26 L14 14 L12 14 L12 10 Z" fill="#fff"/>
        <circle cx="16" cy="8" r="2" fill="#d97706"/>
        <rect x="15" y="20" width="2" height="6" fill="#fff"/>
      </svg>
    `;
  }

  private getFortressIcon(): string {
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#dc2626" stroke="#fff" stroke-width="2"/>
        <rect x="8" y="12" width="16" height="12" fill="#fff"/>
        <rect x="10" y="8" width="4" height="8" fill="#fff"/>
        <rect x="18" y="8" width="4" height="8" fill="#fff"/>
        <rect x="14" y="6" width="4" height="6" fill="#fff"/>
        <rect x="12" y="16" width="2" height="4" fill="#dc2626"/>
        <rect x="18" y="16" width="2" height="4" fill="#dc2626"/>
      </svg>
    `;
  }

  private getMuseumIcon(): string {
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#059669" stroke="#fff" stroke-width="2"/>
        <rect x="6" y="12" width="20" height="12" fill="#fff"/>
        <rect x="8" y="8" width="16" height="4" fill="#fff"/>
        <rect x="10" y="6" width="12" height="2" fill="#fff"/>
        <rect x="12" y="16" width="2" height="6" fill="#059669"/>
        <rect x="18" y="16" width="2" height="6" fill="#059669"/>
        <circle cx="16" cy="10" r="1" fill="#059669"/>
      </svg>
    `;
  }

  private getMonumentIcon(): string {
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#7c3aed" stroke="#fff" stroke-width="2"/>
        <rect x="14" y="8" width="4" height="16" fill="#fff"/>
        <rect x="12" y="6" width="8" height="2" fill="#fff"/>
        <rect x="13" y="4" width="6" height="2" fill="#fff"/>
        <rect x="14" y="2" width="4" height="2" fill="#fff"/>
        <circle cx="16" cy="20" r="2" fill="#7c3aed"/>
      </svg>
    `;
  }

  private getHistoricalIcon(): string {
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#ea580c" stroke="#fff" stroke-width="2"/>
        <path d="M16 6 L22 12 L22 18 L20 18 L20 26 L12 26 L12 18 L10 18 L10 12 Z" fill="#fff"/>
        <rect x="14" y="14" width="4" height="8" fill="#ea580c"/>
        <circle cx="16" cy="10" r="1.5" fill="#ea580c"/>
      </svg>
    `;
  }

  private getCulturalIcon(): string {
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#be185d" stroke="#fff" stroke-width="2"/>
        <path d="M16 6 C20 6, 24 10, 24 16 C24 22, 20 26, 16 26 C12 26, 8 22, 8 16 C8 10, 12 6, 16 6 Z" fill="#fff"/>
        <circle cx="16" cy="16" r="6" fill="#be185d"/>
        <circle cx="16" cy="16" r="3" fill="#fff"/>
        <circle cx="16" cy="16" r="1" fill="#be185d"/>
      </svg>
    `;
  }

  private getReligiousIcon(): string {
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#0891b2" stroke="#fff" stroke-width="2"/>
        <path d="M16 4 L20 8 L20 12 L18 12 L18 24 L14 24 L14 12 L12 12 L12 8 Z" fill="#fff"/>
        <circle cx="16" cy="6" r="1.5" fill="#0891b2"/>
        <rect x="15" y="18" width="2" height="4" fill="#0891b2"/>
        <path d="M14 14 L18 14 L17 16 L15 16 Z" fill="#0891b2"/>
      </svg>
    `;
  }

  private getDefaultIcon(): string {
    return `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#6b7280" stroke="#fff" stroke-width="2"/>
        <path d="M16 6 L20 10 L20 14 L18 14 L18 26 L14 26 L14 14 L12 14 L12 10 Z" fill="#fff"/>
        <circle cx="16" cy="8" r="2" fill="#6b7280"/>
      </svg>
    `;
  }

  private getIconCategory(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'church': 'church',
      'cathedral': 'church',
      'basilica': 'church',
      'fortress': 'fortress',
      'fort': 'fortress',
      'castle': 'fortress',
      'museum': 'museum',
      'monument': 'monument',
      'memorial': 'monument',
      'statue': 'monument',
      'historical': 'historical',
      'heritage': 'historical',
      'cultural': 'cultural',
      'culture': 'cultural',
      'religious': 'religious',
      'temple': 'religious',
      'shrine': 'religious',
      'mosque': 'religious'
    };

    const normalizedCategory = category.toLowerCase().trim();
    return categoryMap[normalizedCategory] || 'default';
  }

  private addLandmarksWithCustomIcons(validLandmarks: Landmark[]): void {
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: validLandmarks.map((landmark) => {
        const coords = [landmark.longitude!, landmark.latitude!];
        const category = this.getIconCategory(landmark.category || 'default');
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coords
          },
          properties: {
            id: landmark.id,
            name: landmark.name,
            description: landmark.description,
            category: landmark.category || null,
            city: landmark.city || null,
            imageUrl: landmark.imageUrl || null,
            iconCategory: category,
            created_by_role: 'service',
            created_by_email: ''
          }
        };
      })
    };

    this.map.addSource('landmarks', {
      type: 'geojson',
      data: geojson
    });

    this.map.addLayer({
      id: 'landmarks-glow',
      type: 'circle',
      source: 'landmarks',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 20,
          15, 30,
          20, 40
        ],
        'circle-color': [
          'match',
          ['get', 'iconCategory'],
          'church', '#d97706',
          'fortress', '#dc2626',
          'museum', '#059669',
          'monument', '#7c3aed',
          'historical', '#ea580c',
          'cultural', '#be185d',
          'religious', '#0891b2',
          '#6b7280'
        ],
        'circle-opacity': 0.15,
        'circle-stroke-width': 0
      }
    });

    this.map.addLayer({
      id: 'landmarks-layer',
      type: 'symbol',
      source: 'landmarks',
      layout: {
        'icon-image': [
          'concat',
          'landmark-',
          ['get', 'iconCategory']
        ],
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.8,
          15, 1.2,
          20, 1.6
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });

    this.map.addLayer({
      id: 'landmarks-labels',
      type: 'symbol',
      source: 'landmarks',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 2.5],
        'text-anchor': 'top',
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 10,
          15, 12,
          20, 14
        ],
        'text-optional': true,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#1e293b',
        'text-halo-color': '#fff',
        'text-halo-width': 2,
        'text-halo-blur': 1
      }
    });

    if (validLandmarks.length === 0) {
      const testLandmarks: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [123.8854, 10.3157] 
            },
            properties: {
              id: 'test-1',
              name: 'Cebu City Center',
              description: 'Test landmark in Cebu City',
              category: 'Test',
              city: 'Cebu City'
            }
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [123.9400, 10.3200] 
            },
            properties: {
              id: 'test-2',
              name: 'Test Landmark 2',
              description: 'Another test landmark',
              category: 'Test',
              city: 'Cebu City'
            }
          }
        ]
      };

      this.map.addSource('test-landmarks', {
        type: 'geojson',
        data: testLandmarks
      });

      this.map.addLayer({
        id: 'test-landmarks-layer',
        type: 'circle',
        source: 'test-landmarks',
        paint: {
          'circle-radius': 10,
          'circle-color': '#4ecdc4',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.8
        }
      });
    }


    this.map.on('click', 'landmarks-layer', (e) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice();
      const properties = feature.properties;
      
      if (!properties) return;
      
      const popupContent = `
        <div class="landmark-popup">
          <h3>${properties['name'] || 'Unknown Landmark'}</h3>
          <p>${properties['description'] || 'No description available'}</p>
          <div class="popup-meta">
            <span class="category">${properties['category'] || 'General'}</span>
            <span class="city">${properties['city'] || 'Unknown'}</span>
          </div>
        </div>
      `;

      new mapboxgl.Popup()
        .setLngLat(coordinates as [number, number])
        .setHTML(popupContent)
        .addTo(this.map);
    });

    this.map.on('mouseenter', 'landmarks-layer', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'landmarks-layer', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  navigateToLandmark(landmarkId: string): void {
    
    if (!landmarkId) {
      console.error('❌ No landmark ID provided');
      this.showToast('Error: No landmark ID found', 'danger');
      return;
    }
    
    this.router.navigate(['/landmark-details', landmarkId]).then(success => {
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

  async getDirectionsToLandmark(landmarkId: string): Promise<void> {
    
    const landmark = this.landmarks.find(l => l.id === landmarkId);
    if (!landmark || !landmark.latitude || !landmark.longitude) {
      this.showToast('Landmark location not available', 'warning');
      return;
    }

    if (!this.userLat || !this.userLng) {
      this.showToast('Your location is not available. Please enable location services.', 'warning');
      await this.getCurrentLocation();
      return;
    }

    this.selectedLandmark = landmark;
    this.isCalculatingRoute = true;
    this.showDirections = true;
    this.directionsPanelVisible = true;

    try {
      await this.getMapboxDirections(landmark);
    } catch (error) {
      console.error('Error getting directions:', error);
      this.showToast('Failed to get directions', 'danger');
      this.isCalculatingRoute = false;
    }
  }

  async getMapboxDirections(landmark: Landmark): Promise<void> {
    if (!this.userLat || !this.userLng) return;

    try {
      const start = [this.userLng, this.userLat];
      const end = [landmark.longitude!, landmark.latitude!];
      

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${this.routeProfile}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=pk.eyJ1IjoianhyaWVlc3NzIiwiYSI6ImNtZDVxejZ6djAxamEyb29yMWRkajM4aWUifQ.a3uBgsbAZHm-hQf27958wA`
      );

      if (!response.ok) {
        throw new Error(`Directions API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        this.currentRoute = data.routes[0];
        this.routeSteps = data.routes[0].legs[0].steps;
        this.routeDistance = this.formatDistance(data.routes[0].distance);
        this.routeDuration = this.formatDuration(data.routes[0].duration);
        
        this.addRouteToMap(data.routes[0]);
        this.fitMapToRoute(data.routes[0]);
        
      } else {
        throw new Error('No routes found');
      }
    } catch (error) {
      console.error('❌ Mapbox Directions API error:', error);
      this.showSimpleDirections(landmark);
    } finally {
      this.isCalculatingRoute = false;
    }
  }

  private addRouteToMap(route: any): void {
    if (!this.map) return;

    if (this.map.getSource('route')) {
      this.map.removeLayer('route');
      this.map.removeSource('route');
    }

    this.map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }
    });

    this.map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#d97706',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  }

  private fitMapToRoute(route: any): void {
    if (!this.map) return;

    const coordinates = route.geometry.coordinates;
    const bounds = coordinates.reduce((bounds: any, coord: any) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

    this.map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 16
    });
  }

  private showSimpleDirections(landmark: Landmark): void {
    const distance = this.calculateDistance(
      this.userLat!, this.userLng!,
      landmark.latitude!, landmark.longitude!
    );
    
    const bearing = this.calculateBearing(
      this.userLat!, this.userLng!,
      landmark.latitude!, landmark.longitude!
    );

    const direction = this.getDirectionText(bearing);
    
    this.routeDistance = this.formatDistance(distance * 1000);
    this.routeDuration = this.formatDuration(Math.round(distance * 12));
    this.routeSteps = [{
      maneuver: {
        type: 'depart',
        instruction: `Head ${direction} towards ${landmark.name}`
      },
      distance: distance * 1000
    }];
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x);
    bearing = this.toDegrees(bearing);
    bearing = (bearing + 360) % 360;
    
    return bearing;
  }

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  private getDirectionText(bearing: number): string {
    const directions = [
      'North', 'Northeast', 'East', 'Southeast',
      'South', 'Southwest', 'West', 'Northwest'
    ];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  clearRoute(): void {
    if (this.map && this.map.getSource('route')) {
      this.map.removeLayer('route');
      this.map.removeSource('route');
    }
    this.currentRoute = null;
    this.routeSteps = [];
    this.routeDistance = '';
    this.routeDuration = '';
    this.directionsPanelVisible = false;
    this.showDirections = false;
    this.selectedLandmark = null;
    this.showToast('Route cleared', 'success');
  }

  changeRouteProfile(profile: string | number | undefined): void {
    if (!profile) return;
     const profileString = String(profile);
    this.routeProfile = profileString;
    this.showToast(`Route profile changed to ${profileString}`, 'primary');
    
    if (this.currentRoute && this.selectedLandmark) {
      this.getMapboxDirections(this.selectedLandmark);
    }
  }

  getStepIcon(maneuverType: string): string {
    switch (maneuverType) {
      case 'turn': return 'arrow-forward';
      case 'depart': return 'play';
      case 'arrive': return 'flag';
      case 'continue': return 'arrow-forward';
      case 'merge': return 'git-merge';
      case 'ramp': return 'trending-up';
      default: return 'arrow-forward';
    }
  }

  openInExternalMaps(): void {
    if (!this.selectedLandmark) return;
    
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${this.selectedLandmark.latitude},${this.selectedLandmark.longitude}&travelmode=${this.routeProfile}`;
    window.open(googleMapsUrl, '_blank');
  }

  private showDirectionsPopup(landmark: Landmark, distance: number, direction: string, bearing: number): void {
    if (!this.map) return;

    const distanceText = distance < 1 ? 
      `${Math.round(distance * 1000)}m` : 
      `${distance.toFixed(1)}km`;

    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false,
      className: 'directions-popup'
    }).setLngLat([landmark.longitude!, landmark.latitude!])
      .setHTML(`
        <div class="directions-popup-content">
          <h3>🧭 Directions to ${landmark.name.replace(/['"]/g, '')}</h3>
          <div class="direction-info">
            <div class="direction-item">
              <span class="direction-icon">📏</span>
              <span class="direction-text">Distance: ${distanceText}</span>
            </div>
            <div class="direction-item">
              <span class="direction-icon">🧭</span>
              <span class="direction-text">Direction: ${direction}</span>
            </div>
            <div class="direction-item">
              <span class="direction-icon">📍</span>
              <span class="direction-text">Bearing: ${Math.round(bearing)}°</span>
            </div>
          </div>
          <div class="direction-actions">
            <button class="direction-btn" data-lat="${landmark.latitude}" data-lng="${landmark.longitude}" data-name="${landmark.name}" id="open-directions-btn">
              Open in Maps
            </button>
            <button class="direction-btn secondary" id="close-popup-btn">
              Close
            </button>
          </div>
        </div>
      `);
    
    popup.addTo(this.map);
    
    setTimeout(() => {
      const openDirectionsBtn = document.getElementById('open-directions-btn');
      const closePopupBtn = document.getElementById('close-popup-btn');
      
      if (openDirectionsBtn) {
        openDirectionsBtn.addEventListener('click', () => {
          const lat = openDirectionsBtn.getAttribute('data-lat');
          const lng = openDirectionsBtn.getAttribute('data-lng');
          const name = openDirectionsBtn.getAttribute('data-name');
          
          if (lat && lng) {
            const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
            window.open(googleMapsUrl, '_blank');
          }
        });
      }
      
      if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => {
          popup.remove();
        });
      }
    }, 100);
  }


  recenterToUser(): void {
    if (this.map && this.userLocation) {
      this.map.flyTo({
        center: [this.userLocation.longitude, this.userLocation.latitude],
        zoom: 15,
        duration: 2000
      });
      this.showToast('Centered on your location', 'success');
    } else {
      this.getCurrentLocation().then(() => {
        if (this.userLocation && this.map) {
          this.map.flyTo({
            center: [this.userLocation.longitude, this.userLocation.latitude],
            zoom: 15,
            duration: 2000
          });
          this.showToast('Centered on your location', 'success');
        } else {
          this.showToast('Location not available. Using default location.', 'warning');
        }
      });
    }
  }

  refreshLocation(): void {
    this.showToast('Refreshing your location...', 'primary');
    this.getCurrentLocation();
  }


  clearFilters(): void {
    this.searchQuery = '';
    this.categoryFilter = '';
    this.cityFilter = '';
    this.difficultyFilter = '';
    this.updateMarkers();
    this.showToast('Filters cleared', 'success');
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  focusOnLandmark(landmarkId: string): void {
    
    const checkAndFocus = () => {
      if (this.landmarks.length > 0 && this.map && this.mapLoaded) {
        const landmark = this.landmarks.find(l => l.id === landmarkId);
        if (landmark && landmark.latitude && landmark.longitude) {
          
          this.map.flyTo({
            center: [landmark.longitude, landmark.latitude],
            zoom: 16,
            duration: 2000
          });
          
          this.highlightLandmarkInList(landmarkId);
          
          setTimeout(() => {
            this.showLandmarkPopup(landmark);
          }, 1000);
          
        } else {
          console.warn('❌ Landmark not found or missing coordinates:', landmarkId);
          this.showToast('Landmark not found on map', 'warning');
        }
      } else {
        setTimeout(checkAndFocus, 500);
      }
    };
    
    checkAndFocus();
  }

  private highlightLandmarkInList(landmarkId: string): void {
    const landmarkElement = document.querySelector(`[data-landmark-id="${landmarkId}"]`);
    if (landmarkElement) {
      landmarkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private showLandmarkPopup(landmark: Landmark): void {
    if (!this.map) return;
    
    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: true,
      closeOnClick: false
    }).setLngLat([landmark.longitude!, landmark.latitude!])
      .setHTML(`
        <div class="landmark-popup">
          <h3>${landmark.name}</h3>
          <p>${landmark.description}</p>
          <div class="popup-meta">
            <span class="category-badge">${landmark.category}</span>
            <span class="city-badge">${landmark.city}</span>
          </div>
        </div>
      `);
    
    popup.addTo(this.map);
    
    setTimeout(() => {
      popup.remove();
    }, 5000);
  }

  private async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  private fitMapToLandmarks(): void {
    if (!this.map) return;

    const coordinates = this.filteredLandmarks
      .filter(landmark => landmark.longitude && landmark.latitude && 
                         landmark.longitude !== 0 && landmark.latitude !== 0)
      .map(landmark => [landmark.longitude!, landmark.latitude!] as [number, number]);


    if (coordinates.length === 0) {
      this.map.flyTo({
        center: [123.8854, 10.3157], 
        zoom: 12
      });
      return;
    }

    const bounds = coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

    if (this.userLocation) {
      bounds.extend([this.userLocation.longitude, this.userLocation.latitude]);
    }

    this.map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15
    });
  }

  debugMapStatus(): void {
    
    this.addSampleLandmarks();
  }

  addSampleLandmarks(): void {
    if (!this.map || !this.mapLoaded) return;


    this.map.addLayer({
      id: 'sample-landmarks-layer',
      type: 'circle',
      source: 'sample-landmarks',
      paint: {
        'circle-radius': 12,
        'circle-color': '#d97706',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.8
      }
    });

    this.map.addLayer({
      id: 'sample-landmarks-labels',
      type: 'symbol',
      source: 'sample-landmarks',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 2],
        'text-anchor': 'top',
        'text-size': 12
      },
      paint: {
        'text-color': '#1e293b',
        'text-halo-color': '#fff',
        'text-halo-width': 2
      }
    });

    this.map.on('click', 'sample-landmarks-layer', (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice();
      const properties = feature.properties;
      
      if (!properties) return;
      
      const popupContent = `
        <div class="landmark-popup">
          <div class="popup-header">
            <h3>${properties['name'] || 'Unknown Landmark'}</h3>
            <div class="popup-badge">🏛️</div>
          </div>
          <p class="popup-description">${properties['description'] || 'No description available'}</p>
          <div class="popup-meta">
            <span class="category-badge">${properties['category'] || 'General'}</span>
            <span class="city-badge">${properties['city'] || 'Unknown'}</span>
          </div>
          <div class="popup-actions">
            <button class="popup-btn" onclick="window.open('/landmark-details?id=${properties['id']}', '_blank')">
              View Details
            </button>
          </div>
        </div>
      `;
      
      new mapboxgl.Popup({ 
        offset: 25,
        className: 'landmark-popup-container',
        closeButton: true,
        closeOnClick: false
      })
        .setLngLat(coordinates as [number, number])
        .setHTML(popupContent)
        .addTo(this.map);
    });

    this.map.on('mouseenter', 'sample-landmarks-layer', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'sample-landmarks-layer', () => {
      this.map.getCanvas().style.cursor = '';
    });

    this.map.fitBounds([
      [123.8854, 10.3000],
      [123.9500, 10.3500] 
    ], {
      padding: 50
    });

    this.showToast('Sample landmarks added for testing', 'success');
  }

  trackByLandmark(index: number, landmark: Landmark): string {
    return landmark.id;
  }

  get displayedLandmarksCount(): number {
    return this.filteredLandmarks.length;
  }

  get totalLandmarksCount(): number {
    return this.landmarks.length;
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
}