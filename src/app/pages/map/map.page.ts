import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import * as mapboxgl from 'mapbox-gl';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { db } from '../../firebase.config';

interface Landmark {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number]; // [longitude, latitude] for Mapbox
  city?: string;
  category?: string;
  imageUrl?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  arContent?: boolean;
  estimatedTime?: number;
  // Curator tracking fields
  created_by_uid?: string;
  created_by_email?: string;
  created_by_role?: string;
  status?: string;
  source?: string;
  created_at?: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
  standalone: false
})
export class MapPage implements OnInit, AfterViewInit, OnDestroy {
  map!: mapboxgl.Map;
  
  // User location
  userLat = 10.3157; // Default to Cebu City
  userLng = 123.8854;
  userLocation: any = null;
  
  // Landmarks data (only curator-added)
  landmarks: Landmark[] = [];
  filteredLandmarks: Landmark[] = [];
  
  // Basic filters
  searchQuery = '';
  categoryFilter = '';
  cityFilter = '';
  
  // UI state
  loading = true;
  mapLoaded = false;
  
  // Filter options extracted from curator landmarks
  availableCities: string[] = [];
  availableCategories: string[] = [];
  
  private storage = getStorage();

  constructor(
    public router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    await this.requestLocationPermission();
    await this.loadCuratorLandmarksFromFirebase();
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Request location permission and get user's current location
   */
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

  /**
   * Get user's current location
   */
  private async getCurrentLocation(): Promise<void> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      this.userLat = position.coords.latitude;
      this.userLng = position.coords.longitude;
      this.userLocation = {
        latitude: this.userLat,
        longitude: this.userLng
      };

      if (this.mapLoaded) {
        this.updateUserLocationOnMap();
      }
    } catch (error) {
      console.error('Error getting current position:', error);
    }
  }

  /**
   * Load ONLY curator-added landmarks from Firebase
   */
  private async loadCuratorLandmarksFromFirebase(): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Loading heritage landmarks...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Query Firebase for ONLY curator/admin created landmarks
      const landmarksRef = collection(db, 'landmarks');
      
      // Multiple queries to get curator and admin landmarks
      const curatorQuery = query(landmarksRef, 
        where('created_by_role', '==', 'curator'),
        where('status', '==', 'approved')
      );
      
      const adminQuery = query(landmarksRef, 
        where('created_by_role', '==', 'admin'),
        where('status', '==', 'approved')
      );

      // Execute both queries
      const [curatorSnapshot, adminSnapshot] = await Promise.all([
        getDocs(curatorQuery),
        getDocs(adminQuery)
      ]);

      const landmarkPromises: Promise<Landmark | null>[] = [];

      // Process curator landmarks
      curatorSnapshot.forEach((doc) => {
        landmarkPromises.push(this.processLandmarkDocument(doc));
      });

      // Process admin landmarks
      adminSnapshot.forEach((doc) => {
        landmarkPromises.push(this.processLandmarkDocument(doc));
      });

      const processedLandmarks = await Promise.all(landmarkPromises);
      this.landmarks = processedLandmarks.filter((landmark): landmark is Landmark => landmark !== null);
      
      // If no curator/admin landmarks found, try fallback for existing data
      if (this.landmarks.length === 0) {
        console.log('No curator landmarks found with new structure, trying fallback...');
        await this.loadLandmarksWithFallback();
      }

      this.filteredLandmarks = [...this.landmarks];
      this.extractFilterOptions();
      this.updateMarkers();
      
      const message = this.landmarks.length > 0 
        ? `Loaded ${this.landmarks.length} curator-approved landmarks`
        : 'No curator-approved landmarks found. Ask curators to add some landmarks through the web interface.';
      
      await this.showToast(message, this.landmarks.length > 0 ? 'success' : 'warning');

    } catch (error) {
      console.error('Error loading curator landmarks:', error);
      await this.showToast('Failed to load landmarks from database.', 'danger');
    } finally {
      this.loading = false;
      await loading.dismiss();
    }
  }

  /**
   * Fallback method for existing landmarks without proper curator fields
   */
  private async loadLandmarksWithFallback(): Promise<void> {
    try {
      const landmarksSnapshot = await getDocs(collection(db, 'landmarks'));
      const landmarkPromises: Promise<Landmark | null>[] = [];

      landmarksSnapshot.forEach((doc) => {
        landmarkPromises.push(this.processLandmarkDocument(doc, true));
      });

      const processedLandmarks = await Promise.all(landmarkPromises);
      const fallbackLandmarks = processedLandmarks.filter((landmark): landmark is Landmark => landmark !== null);
      
      this.landmarks = fallbackLandmarks;
      console.log(`Loaded ${fallbackLandmarks.length} landmarks using fallback method`);
      
    } catch (error) {
      console.error('Error in fallback loading:', error);
    }
  }

  /**
   * Process individual landmark document with strict curator filtering
   */
  private async processLandmarkDocument(doc: any, isFallback: boolean = false): Promise<Landmark | null> {
    try {
      const data = doc.data();
      
      // Validate required fields
      if (!data.name) {
        console.warn(`Landmark ${doc.id} has no name, skipping`);
        return null;
      }

      // STRICT CURATOR FILTERING (unless fallback mode)
      if (!isFallback) {
        const createdByRole = data.created_by_role;
        const status = data.status;
        
        // Only allow curator/admin created landmarks with approved status
        if (!createdByRole || (createdByRole !== 'curator' && createdByRole !== 'admin')) {
          console.log(`Skipping landmark ${doc.id} - not created by curator/admin (role: ${createdByRole})`);
          return null;
        }
        
        if (!status || status !== 'approved') {
          console.log(`Skipping landmark ${doc.id} - not approved (status: ${status})`);
          return null;
        }
      }

      // Get coordinates (prefer latitude/longitude, fallback to old lati/longti)
      const lat = data.latitude ?? data.lati ?? null;
      const lng = data.longitude ?? data.longti ?? null;

      if (!lat || !lng || !this.isValidCoordinate(lat, lng)) {
        console.warn(`Landmark ${doc.id} has invalid coordinates, skipping`);
        return null;
      }

      // Resolve image URL
      const imageUrl = await this.resolveImageUrl(data.image_path || data.image);

      const landmark: Landmark = {
        id: doc.id,
        name: data.name,
        description: data.description || '',
        coordinates: [parseFloat(lng), parseFloat(lat)], // Mapbox uses [lng, lat]
        city: data.city || 'Unknown',
        category: data.category || 'General',
        imageUrl: imageUrl || 'assets/img/default-landmark.jpg',
        difficulty: data.difficulty || 'medium',
        arContent: data.arContent || false,
        estimatedTime: data.estimatedTime || 30,
        // Store creator info for display
        created_by_uid: data.created_by_uid || '',
        created_by_email: data.created_by_email || '',
        created_by_role: data.created_by_role || (isFallback ? 'curator' : ''),
        status: data.status || 'approved',
        source: data.source || 'curator',
        created_at: data.created_at || ''
      };

      return landmark;
    } catch (error) {
      console.error(`Error processing landmark ${doc.id}:`, error);
      return null;
    }
  }

  /**
   * Resolve image URL from Firebase Storage path
   */
  private async resolveImageUrl(imagePath?: string): Promise<string | null> {
    if (!imagePath) return null;
    
    // If it's already a URL, return it
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    try {
      // Get download URL from Firebase Storage
      const url = await getDownloadURL(ref(this.storage, imagePath));
      return url;
    } catch (error) {
      console.error('Error resolving image URL:', error);
      return null;
    }
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinate(lat: any, lng: any): boolean {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    return !isNaN(latitude) && !isNaN(longitude) &&
           latitude >= -90 && latitude <= 90 &&
           longitude >= -180 && longitude <= 180;
  }

  /**
   * Extract filter options from curator landmarks
   */
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

  /**
   * Apply filters to curator landmarks
   */
  private applyFilters(): void {
    this.filteredLandmarks = this.landmarks.filter(landmark => {
      // Search query filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const searchableText = `${landmark.name} ${landmark.description} ${landmark.city} ${landmark.category}`.toLowerCase();
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // Category filter
      if (this.categoryFilter && landmark.category !== this.categoryFilter) {
        return false;
      }

      // City filter
      if (this.cityFilter && landmark.city !== this.cityFilter) {
        return false;
      }

      return true;
    });
  }

  /**
   * Update map markers when filters change
   */
  updateMarkers(): void {
    this.applyFilters();
    
    if (this.mapLoaded) {
      this.addLandmarksToMap();
    }
  }

  /**
   * Initialize Mapbox map
   */
  private initializeMap(): void {
    // Set Mapbox access token
    (mapboxgl as any).accessToken = 'pk.eyJ1IjoianhyaWVlc3NzIiwiYSI6ImNtZDVxejZ6djAxamEyb29yMWRkajM4aWUifQ.a3uBgsbAZHm-hQf27958wA';

    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [this.userLng, this.userLat],
      zoom: 13,
      attributionControl: false
    });

    this.map.on('load', () => {
      this.mapLoaded = true;
      this.setupMap();
    });

    this.map.on('error', (e) => {
      console.error('Mapbox error:', e);
      this.showToast('Map failed to load properly.', 'danger');
    });
  }

  /**
   * Setup map after loading
   */
  private setupMap(): void {
    // Add user location marker if available
    if (this.userLocation) {
      this.updateUserLocationOnMap();
    }

    // Add curator landmarks to map
    this.addLandmarksToMap();
    
    // Add map controls
    this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
  }

  /**
   * Add user location marker to map
   */
  private updateUserLocationOnMap(): void {
    if (!this.map || !this.userLocation) return;

    // Create user location marker
    const userMarker = document.createElement('div');
    userMarker.className = 'user-location-marker';
    userMarker.style.width = '20px';
    userMarker.style.height = '20px';
    userMarker.style.backgroundColor = '#4285f4';
    userMarker.style.borderRadius = '50%';
    userMarker.style.border = '3px solid white';
    userMarker.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

    new mapboxgl.Marker({ element: userMarker })
      .setLngLat([this.userLocation.longitude, this.userLocation.latitude])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>You are here</strong>'))
      .addTo(this.map);
  }

  /**
   * Add curator landmarks to map
   */
  private addLandmarksToMap(): void {
    if (!this.map || !this.mapLoaded) return;

    // Remove existing landmarks layer if it exists
    if (this.map.getSource('landmarks')) {
      this.map.removeLayer('landmarks-layer');
      this.map.removeSource('landmarks');
    }

    // Create GeoJSON from filtered curator landmarks
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: this.filteredLandmarks.map((landmark) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: landmark.coordinates
        },
        properties: {
          id: landmark.id,
          name: landmark.name,
          description: landmark.description,
          category: landmark.category || null,
          city: landmark.city || null,
          imageUrl: landmark.imageUrl || null,
          created_by_role: landmark.created_by_role || null,
          created_by_email: landmark.created_by_email || null
        }
      }))
    };

    this.map.addSource('landmarks', {
      type: 'geojson',
      data: geojson
    });

    // Add curator landmarks layer
    this.map.addLayer({
      id: 'landmarks-layer',
      type: 'circle',
      source: 'landmarks',
      paint: {
        'circle-radius': 8,
        'circle-color': '#3498db', // Blue for curator landmarks
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff'
      }
    });

    // Handle landmark clicks
    this.map.on('click', 'landmarks-layer', (e) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const geometry = feature.geometry as GeoJSON.Point;
      const coordinates = geometry.coordinates as [number, number];
      const properties = feature.properties!;

      const popupHtml = `
        <div class="landmark-popup">
          <h3>${properties['name']}</h3>
          <p>${properties['description']}</p>
          <div class="popup-meta">
            <span class="category-badge">${properties['category']}</span>
            <span class="curator-badge">✓ Curator Approved</span>
          </div>
          <button id="details-btn-${properties['id']}" class="popup-button">
            View Details
          </button>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setLngLat(coordinates)
        .setHTML(popupHtml)
        .addTo(this.map);

      // Add click event to details button
      popup.on('open', () => {
        setTimeout(() => {
          const btn = document.getElementById(`details-btn-${properties['id']}`);
          if (btn) {
            btn.addEventListener('click', () => {
              this.navigateToLandmark(properties['id']);
              popup.remove();
            });
          }
        }, 100);
      });
    });

    this.map.on('mouseenter', 'landmarks-layer', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'landmarks-layer', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  /**
   * Navigate to landmark details
   */
  navigateToLandmark(landmarkId: string): void {
    this.router.navigate(['/landmark-details'], {
      queryParams: { id: landmarkId }
    });
  }

  /**
   * Recenter map to user location
   */
  recenterToUser(): void {
    if (this.map && this.userLocation) {
      this.map.flyTo({
        center: [this.userLocation.longitude, this.userLocation.latitude],
        zoom: 15
      });
    } else {
      this.showToast('Location not available', 'warning');
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchQuery = '';
    this.categoryFilter = '';
    this.cityFilter = '';
    this.updateMarkers();
    this.showToast('Filters cleared', 'success');
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  /**
   * Track by function for landmark list performance
   */
  trackByLandmark(index: number, landmark: Landmark): string {
    return landmark.id;
  }

  /**
   * Get landmarks count for display
   */
  get displayedLandmarksCount(): number {
    return this.filteredLandmarks.length;
  }

  get totalLandmarksCount(): number {
    return this.landmarks.length;
  }
}