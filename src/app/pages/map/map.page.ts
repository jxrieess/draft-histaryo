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
  
  private storage = getStorage();
  private landmarksSubscription?: Subscription;

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private landmarkService: LandmarkService
  ) {}

  getDefaultImageUrl(imageUrl?: string, category?: string): string {
    if (imageUrl && imageUrl.trim() !== '' && !imageUrl.includes('placeholder')) {
      return imageUrl;
    }

    switch (category?.toLowerCase()) {
      case 'religious':
        return 'assets/img/basilica.jpg';
      case 'historical':
        return 'assets/img/fort-san-pedro.jpg';
      case 'cultural':
        return 'assets/img/magellans-cross.jpg';
      default:
        return 'assets/img/default-landmark.jpg';
    }
  }

  onImageError(event: any): void {
    console.log('Image load error, using fallback');
    event.target.src = 'assets/img/default-landmark.jpg';
  }

  async ngOnInit() {
    await this.requestLocationPermission();
    this.loadLandmarksFromService();
    
    this.route.queryParams.subscribe(params => {
      if (params['landmarkId']) {
        console.log('🎯 Map opened with specific landmark ID:', params['landmarkId']);
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
        console.log('🔄 Retrying map initialization...');
    this.initializeMap();
      }
    }, 1000);

    setTimeout(() => {
      if (this.mapLoaded) {
        console.log('🗺️ Auto-adding sample landmarks for testing');
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
    console.log('🌍 Requesting real-time user location...');
    
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

      console.log('✅ Real-time user location obtained:', this.userLocation);
      console.log(`📍 Accuracy: ${position.coords.accuracy} meters`);

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
    console.log('📍 Using fallback location (Cebu City):', this.userLocation);
    
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
        console.log(`🏛️ Map received ${landmarks.length} landmarks from service`);
        
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

      console.log('🗺️ Initializing map with center:', [this.userLng, this.userLat]);

      this.map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [this.userLng, this.userLat],
        zoom: 13,
        attributionControl: true
      });

    this.map.on('load', () => {
      console.log('🗺️ Map loaded successfully');
      this.mapLoaded = true;
      this.setupMap();
    });

    this.map.on('error', (e) => {
      console.error('❌ Mapbox error:', e);
      this.showToast('Map failed to load. Please check your internet connection.', 'danger');
    });

    this.map.on('style.load', () => {
      console.log('🗺️ Map style loaded');
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

    console.log('📍 Adding user location marker at:', this.userLocation);

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

    console.log('✅ User location marker added successfully');
  }

  private addLandmarksToMap(): void {
    if (!this.map || !this.mapLoaded) return;

    console.log('🗺️ Adding landmarks to map:', this.filteredLandmarks.length);

    if (this.map.getSource('landmarks')) {
      this.map.removeLayer('landmarks-layer');
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

    console.log('🗺️ Valid landmarks for map:', validLandmarks.length);

    if (validLandmarks.length === 0) {
      console.warn('⚠️ No valid landmarks to display on map');
      return;
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: validLandmarks.map((landmark) => {
        const coords = [landmark.longitude!, landmark.latitude!];
        console.log('📍 Adding landmark:', landmark.name, 'at', coords);
        
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

    if (validLandmarks.length === 0) {
      console.log('🗺️ Adding test landmarks for Cebu area');
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

    this.map.addLayer({
      id: 'landmarks-layer',
      type: 'circle',
      source: 'landmarks',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 8,
          15, 12,
          20, 16
        ],
        'circle-color': '#d97706',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9,
        'circle-stroke-opacity': 1
      }
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
          10, 16,
          15, 24,
          20, 32
        ],
        'circle-color': '#d97706',
        'circle-opacity': 0.2,
        'circle-stroke-width': 0
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
    console.log('🔗 Navigating to landmark details for ID:', landmarkId);
    console.log('🔗 Landmark ID type:', typeof landmarkId);
    console.log('🔗 Landmark ID length:', landmarkId?.length);
    
    if (!landmarkId) {
      console.error('❌ No landmark ID provided');
      this.showToast('Error: No landmark ID found', 'danger');
      return;
    }
    
    this.router.navigate(['/landmark-details', landmarkId]).then(success => {
      if (success) {
        console.log('✅ Successfully navigated to landmark details');
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
    console.log('🧭 Getting directions to landmark:', landmarkId);
    
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

    try {
      const distance = this.calculateDistance(
        this.userLat, this.userLng,
        landmark.latitude, landmark.longitude
      );
      
      const bearing = this.calculateBearing(
        this.userLat, this.userLng,
        landmark.latitude, landmark.longitude
      );

      const direction = this.getDirectionText(bearing);
      
      this.showDirectionsPopup(landmark, distance, direction, bearing);
      
    } catch (error) {
      console.error('Error getting directions:', error);
      this.showToast('Failed to get directions', 'danger');
    }
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
    console.log('🔄 Refreshing user location...');
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
    console.log('🎯 Focusing on landmark:', landmarkId);
    
    const checkAndFocus = () => {
      if (this.landmarks.length > 0 && this.map && this.mapLoaded) {
        const landmark = this.landmarks.find(l => l.id === landmarkId);
        if (landmark && landmark.latitude && landmark.longitude) {
          console.log('🎯 Found landmark, centering map:', landmark.name);
          
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

    console.log('🗺️ Fitting map to landmarks:', coordinates.length);

    if (coordinates.length === 0) {
      console.log('🗺️ No valid landmarks, centering on Cebu City');
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
    console.log('🔍 Map Debug Status:');
    console.log('- Map instance:', this.map);
    console.log('- Map loaded:', this.mapLoaded);
    console.log('- Map container exists:', !!document.getElementById('map'));
    console.log('- Landmarks count:', this.landmarks.length);
    console.log('- Filtered landmarks count:', this.filteredLandmarks.length);
    console.log('- User location:', { lat: this.userLat, lng: this.userLng });
    console.log('- Landmark coordinates:', this.filteredLandmarks.map(l => [l.longitude, l.latitude]));
    
    this.addSampleLandmarks();
  }

  addSampleLandmarks(): void {
    if (!this.map || !this.mapLoaded) return;

    console.log('🗺️ Adding sample landmarks for testing');

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
}