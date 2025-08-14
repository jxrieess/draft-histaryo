// import { AfterViewInit, Component } from '@angular/core';
// import * as mapboxgl from 'mapbox-gl';

// @Component({
//   selector: 'app-map',
//   templateUrl: './map.page.html',
//   styleUrls: ['./map.page.scss'],
//   standalone: false
// })
// export class MapPage implements AfterViewInit {
//   map!: mapboxgl.Map;
//   userLat = 0;
//   userLng = 0;
//   radiusKm = 2;  
//   showNearbyOnly = false;
//   markers: mapboxgl.Marker[] = [];

//   landmarks = [
//     {
//       id: 'fort-san-pedro',
//       name: 'Fort San Pedro',
//       description: 'A historic Spanish fort in Cebu.',
//       coordinates: [123.9058, 10.2923]
//     },
//     {
//       id: 'magellans-cross',
//       name: "Magellan's Cross",
//       description: 'A Christian cross planted by explorers.',
//       coordinates: [123.9020, 10.2936]
//     },
//     {
//       id: 'sto-nino',
//       name: 'Basilica del Sto. Niño',
//       description: 'Oldest Roman Catholic Church in the Philippines.',
//       coordinates: [123.9020, 10.2943]
//     }
//   ];

//   ngAfterViewInit(): void {
//     (mapboxgl as any).accessToken = 'pk.eyJ1IjoianhyaWVlc3NzIiwiYSI6ImNtZDVxejZ6djAxamEyb29yMWRkajM4aWUifQ.a3uBgsbAZHm-hQf27958wA';

//     navigator.geolocation.getCurrentPosition((position) => {
//       this.userLat = position.coords.latitude;
//       this.userLng = position.coords.longitude;

//       this.map = new mapboxgl.Map({
//         container: 'map',
//         style: 'mapbox://styles/mapbox/streets-v11',
//         center: [this.userLng, this.userLat],
//         zoom: 15,
//       });

//       new mapboxgl.Marker({ color: 'red' })
//         .setLngLat([this.userLng, this.userLat])
//         .setPopup(new mapboxgl.Popup().setHTML('<strong>You are here</strong>'))
//         .addTo(this.map);

//       this.updateMarkers();
//     });
//   }

//   updateMarkers() {
//     this.markers.forEach(marker => marker.remove());
//     this.markers = [];

//     this.landmarks.forEach((landmark) => {
//       const [lng, lat] = landmark.coordinates;
//       const distance = this.getDistanceFromLatLonInKm(this.userLat, this.userLng, lat, lng);

//       if (!this.showNearbyOnly || distance <= this.radiusKm) {
//         const popupHtml = `
//           <strong>${landmark.name}</strong><br>
//           ${landmark.description}<br>
//           <em>${distance.toFixed(2)} km away</em><br>
//           <a href="/landmark-details?id=${landmark.id}">View Details</a>
//         `;

//         const marker = new mapboxgl.Marker({ color: '#3FB1CE' })
//           .setLngLat([lng, lat])
//           .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
//           .addTo(this.map);

//         this.markers.push(marker);
//       }
//     });
//   }

//   getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
//     const R = 6371;
//     const dLat = this.deg2rad(lat2 - lat1);
//     const dLon = this.deg2rad(lon2 - lon1);
//     const a =
//       Math.sin(dLat / 2) ** 2 +
//       Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
//       Math.sin(dLon / 2) ** 2;

//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c;
//   }

//   deg2rad(deg: number): number {
//     return deg * (Math.PI / 180);
//   }
// }





// import { AfterViewInit, Component } from '@angular/core';
// import * as mapboxgl from 'mapbox-gl';

// @Component({
//   selector: 'app-map',
//   templateUrl: './map.page.html',
//   styleUrls: ['./map.page.scss'],
//   standalone: false
// })
// export class MapPage implements AfterViewInit {
//   map!: mapboxgl.Map;
//   userLat = 0;
//   userLng = 0;
//   radiusKm = 2;  
//   showNearbyOnly = false;
//   markers: mapboxgl.Marker[] = [];

//   landmarks = [
//     {
//       id: 'fort-san-pedro',
//       name: 'Fort San Pedro',
//       description: 'A historic Spanish fort in Cebu.',
//       coordinates: [123.9058, 10.2923]
//     },
//     {
//       id: 'magellans-cross',
//       name: "Magellan's Cross",
//       description: 'A Christian cross planted by explorers.',
//       coordinates: [123.9020, 10.2936]
//     },
//     {
//       id: 'sto-nino',
//       name: 'Basilica del Sto. Niño',
//       description: 'Oldest Roman Catholic Church in the Philippines.',
//       coordinates: [123.9020, 10.2943]
//     }
//   ];

//   ngAfterViewInit(): void {
//     (mapboxgl as any).accessToken = 'pk.eyJ1IjoianhyaWVlc3NzIiwiYSI6ImNtZDVxejZ6djAxamEyb29yMWRkajM4aWUifQ.a3uBgsbAZHm-hQf27958wA';

//     navigator.geolocation.getCurrentPosition((position) => {
//       this.userLat = position.coords.latitude;
//       this.userLng = position.coords.longitude;

//       this.map = new mapboxgl.Map({
//         container: 'map',
//         style: 'mapbox://styles/mapbox/streets-v11',
//         center: [this.userLng, this.userLat],
//         zoom: 15,
//       });

//       new mapboxgl.Marker({ color: 'red' })
//         .setLngLat([this.userLng, this.userLat])
//         .setPopup(new mapboxgl.Popup().setHTML('<strong>You are here</strong>'))
//         .addTo(this.map);

//       this.updateMarkers();
//     });
//   }

//   updateMarkers() {
//     this.markers.forEach(marker => marker.remove());
//     this.markers = [];

//     this.landmarks.forEach((landmark) => {
//       const [lng, lat] = landmark.coordinates;
//       const distance = this.getDistanceFromLatLonInKm(this.userLat, this.userLng, lat, lng);

//       if (!this.showNearbyOnly || distance <= this.radiusKm) {
//         const popupHtml = `
//           <strong>${landmark.name}</strong><br>
//           ${landmark.description}<br>
//           <em>${distance.toFixed(2)} km away</em><br>
//           <a href="/landmark-details?id=${landmark.id}">View Details</a>
//         `;

//         const marker = new mapboxgl.Marker({ color: '#3FB1CE' })
//           .setLngLat([lng, lat])
//           .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml))
//           .addTo(this.map);

//         this.markers.push(marker);
//       }
//     });
//   }

//   getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
//     const R = 6371;
//     const dLat = this.deg2rad(lat2 - lat1);
//     const dLon = this.deg2rad(lon2 - lon1);
//     const a =
//       Math.sin(dLat / 2) ** 2 +
//       Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
//       Math.sin(dLon / 2) ** 2;

//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c;
//   }

//   deg2rad(deg: number): number {
//     return deg * (Math.PI / 180);
//   }
// }

// import { AfterViewInit, Component } from '@angular/core';
// import * as mapboxgl from 'mapbox-gl';

// @Component({
//   selector: 'app-map',
//   templateUrl: './map.page.html',
//   styleUrls: ['./map.page.scss'],
//   standalone: false
// })
// export class MapPage implements AfterViewInit {
//   map!: mapboxgl.Map;
//   userLat = 0;
//   userLng = 0;
//   cityFilter = '';
//   showNearbyOnly = false;
//   radiusKm = 2;
//   searchQuery = '';


//   landmarks = [
//     {
//       id: 'fort-san-pedro', name: 'Fort San Pedro', description: 'A historic Spanish fort in Cebu.', coordinates: [123.9058, 10.2923], city: 'Cebu City', type: 'Heritage'
//     },
//     {
//       id: 'magellans-cross', name: "Magellan's Cross", description: 'A Christian cross planted by explorers.', coordinates: [123.9021, 10.2930], city: 'Cebu City', type: 'Heritage'
//     },
//     {
//       id: 'sto-nino', name: 'Basilica del Sto. Niño', description: 'Oldest Roman Catholic Church in the Philippines.', coordinates: [123.9020, 10.2934], city: 'Cebu City', type: 'Church'
//     },
//     {
//       id: 'casa-gorordo', name: 'Casa Gorordo Museum', description: 'Historic ancestral house museum.', coordinates: [123.9010, 10.2915], city: 'Cebu City', type: 'Museum'
//     },
//     {
//       id: 'museo-de-talisay', name: 'Museo de Talisay', description: 'Talisay City museum.', coordinates: [123.8060, 10.2450], city: 'Talisay', type: 'Museum'
//     },
//     {
//       id: 'liberty-shrine', name: 'Liberty Shrine / Lapu‑Lapu City', description: 'Lapu‑Lapu hero monument site.', coordinates: [123.9810, 10.3130], city: 'Lapu-Lapu', type: 'Heritage'
//     }
//     // Add other landmarks following this format
//   ];

//   ngAfterViewInit(): void {
//     (mapboxgl as any).accessToken = 'pk.eyJ1IjoianhyaWVlc3NzIiwiYSI6ImNtZDVxejZ6djAxamEyb29yMWRkajM4aWUifQ.a3uBgsbAZHm-hQf27958wA';

//     navigator.geolocation.getCurrentPosition((position) => {
//       this.userLat = position.coords.latitude;
//       this.userLng = position.coords.longitude;

//       this.map = new mapboxgl.Map({
//         container: 'map',
//         style: 'mapbox://styles/mapbox/streets-v11',
//         center: [this.userLng, this.userLat],
//         zoom: 13,
//       });

//       this.map.on('load', () => {
//         this.loadCustomIcons();

//         // Current location marker
//         const el = document.createElement('div');
//         el.className = 'current-location';
//         el.style.backgroundImage = 'url(assets/icons/user-location.png)';
//         el.style.width = '30px';
//         el.style.height = '30px';
//         el.style.backgroundSize = 'cover';
//         el.style.borderRadius = '50%';

//         new mapboxgl.Marker({ element: el })
//           .setLngLat([this.userLng, this.userLat])
//           .setPopup(new mapboxgl.Popup().setHTML('<strong>You are here</strong>'))
//           .addTo(this.map);

//         // Landmarks as GeoJSON
//         this.map.addSource('landmarks', {
//           type: 'geojson',
//           data: this.getGeoJsonFromLandmarks(),
//           cluster: true,
//           clusterMaxZoom: 14,
//           clusterRadius: 50
//         });

//         this.addClusterLayers();
//         this.addUnclusteredLayer();
//       });
//     });
//   }

//   loadCustomIcons() {
//     const icons = ['user-location', 'museum', 'church', 'fort', 'religious', 'school', 'hotel', 'monument', 'heritage'];
//     icons.forEach(icon => {
//       this.map.loadImage(`assets/icons/${icon}.png`, (err, image) => {
//         if (!err && image && !this.map.hasImage(icon)) {
//           this.map.addImage(icon, image);
//         }
//       });
//     });
//   }

//   getGeoJsonFromLandmarks(): any {
//     return {
//       type: 'FeatureCollection',
//       features: this.landmarks
//         .filter(l => (!this.cityFilter || l.city === this.cityFilter))
//         .filter(l => {
//           if (!this.showNearbyOnly) return true;
//           const distance = this.getDistanceFromLatLonInKm(this.userLat, this.userLng, l.coordinates[1], l.coordinates[0]);
//           return distance <= this.radiusKm;
//         })
//         .filter(l => l.name.toLowerCase().includes(this.searchQuery.toLowerCase()))
//         .map((landmark) => ({
//           type: 'Feature',
//           geometry: { type: 'Point', coordinates: landmark.coordinates },
//           properties: {
//             id: landmark.id,
//             name: landmark.name,
//             description: landmark.description,
//             icon: landmark.type.toLowerCase(),
//             city: landmark.city
//           }
//         }))
//     };
//   }

//   addClusterLayers() {
//     this.map.addLayer({
//       id: 'clusters',
//       type: 'circle',
//       source: 'landmarks',
//       filter: ['has', 'point_count'],
//       paint: {
//         'circle-color': '#51bbd6',
//         'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40]
//       }
//     });

//     this.map.addLayer({
//       id: 'cluster-count',
//       type: 'symbol',
//       source: 'landmarks',
//       filter: ['has', 'point_count'],
//       layout: {
//         'text-field': '{point_count_abbreviated}',
//         'text-size': 12
//       }
//     });
//   }

//   addUnclusteredLayer() {
//     this.map.addLayer({
//       id: 'unclustered-point',
//       type: 'symbol',
//       source: 'landmarks',
//       filter: ['!', ['has', 'point_count']],
//       layout: {
//         'icon-image': ['get', 'icon'],
//         'icon-size': 0.1,
//         'text-field': ['get', 'name'],
//         'text-offset': [0, 1.5],
//         'text-anchor': 'top'
//       }
//     });

//     this.map.on('click', 'unclustered-point', (e) => {
//       const geometry = e.features![0].geometry as GeoJSON.Point;
//       const coordinates = geometry.coordinates as [number, number];
//       const { name, description, id } = e.features![0].properties!;
//       new mapboxgl.Popup()
//         .setLngLat(coordinates)
//         .setHTML(`
//           <strong>${name}</strong><br>
//           ${description}<br>
//           <a href="/landmark-details?id=${id}">View Details</a>
//         `)
//         .addTo(this.map);
//     });

//     this.map.on('mouseenter', 'unclustered-point', () => {
//       this.map.getCanvas().style.cursor = 'pointer';
//     });
//     this.map.on('mouseleave', 'unclustered-point', () => {
//       this.map.getCanvas().style.cursor = '';
//     });
//   }

//   filterByCity(city: string) {
//     this.cityFilter = city;
//     const source = this.map.getSource('landmarks') as mapboxgl.GeoJSONSource;
//     source.setData(this.getGeoJsonFromLandmarks());
//   }

//   updateMarkers(): void {
//     const source = this.map.getSource('landmarks') as mapboxgl.GeoJSONSource;
//     if (source) {
//       source.setData(this.getGeoJsonFromLandmarks());
//     }
//   }

//   getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
//     const R = 6371;
//     const dLat = this.deg2rad(lat2 - lat1);
//     const dLon = this.deg2rad(lon2 - lon1);
//     const a =
//       Math.sin(dLat / 2) ** 2 +
//       Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
//       Math.sin(dLon / 2) ** 2;
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c;
//   }

//   deg2rad(deg: number): number {
//     return deg * (Math.PI / 180);
//   }
// }


import { AfterViewInit, Component } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { Router } from '@angular/router';

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
  standalone: false
})
export class MapPage implements AfterViewInit {
  map!: mapboxgl.Map;
  userLat = 0;
  userLng = 0;
  cityFilter = '';
  showNearbyOnly = false;
  radiusKm = 2;
  searchQuery = '';
  categoryFilter = '';
  nearbyLandmarks: any[] = [];

  constructor(private router: Router) {}

  landmarks = [
    {
      id: 'fort-san-pedro', name: 'Fort San Pedro', description: 'A historic Spanish fort in Cebu.', coordinates: [123.9058, 10.2923], city: 'Cebu City', type: 'Heritage'
    },
    {
      id: 'magellans-cross', name: "Magellan's Cross", description: 'A Christian cross planted by explorers.', coordinates: [123.9021, 10.2930], city: 'Cebu City', type: 'Heritage'
    },
    {
      id: 'sto-nino', name: 'Basilica del Sto. Niño', description: 'Oldest Roman Catholic Church in the Philippines.', coordinates: [123.9020, 10.2934], city: 'Cebu City', type: 'Church'
    },
    {
      id: 'casa-gorordo', name: 'Casa Gorordo Museum', description: 'Historic ancestral house museum.', coordinates: [123.9010, 10.2915], city: 'Cebu City', type: 'Museum'
    },
    {
      id: 'museo-de-talisay', name: 'Museo de Talisay', description: 'Talisay City museum.', coordinates: [123.8060, 10.2450], city: 'Talisay', type: 'Museum'
    },
    {
      id: 'liberty-shrine', name: 'Liberty Shrine / Lapu‑Lapu City', description: 'Lapu‑Lapu hero monument site.', coordinates: [123.9810, 10.3130], city: 'Lapu-Lapu', type: 'Heritage'
    }
  ];

  get availableCities() {
    return [...new Set(this.landmarks.map(l => l.city))];
  }

  get availableCategories() {
    return [...new Set(this.landmarks.map(l => l.type))];
  }

  ngAfterViewInit(): void {
    (mapboxgl as any).accessToken = 'pk.eyJ1IjoianhyaWVlc3NzIiwiYSI6ImNtZDVxejZ6djAxamEyb29yMWRkajM4aWUifQ.a3uBgsbAZHm-hQf27958wA';

    navigator.geolocation.getCurrentPosition((position) => {
      this.userLat = position.coords.latitude;
      this.userLng = position.coords.longitude;

      this.map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [this.userLng, this.userLat],
        zoom: 13,
      });

      this.map.on('load', () => {
        this.loadCustomIcons();

        const el = document.createElement('div');
        el.className = 'current-location';
        el.style.backgroundImage = 'url(assets/icons/user-location.png)';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.backgroundSize = 'cover';
        el.style.borderRadius = '50%';

        new mapboxgl.Marker({ element: el })
          .setLngLat([this.userLng, this.userLat])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>You are here</strong>'))
          .addTo(this.map);

        this.map.addSource('landmarks', {
          type: 'geojson',
          data: this.getGeoJsonFromLandmarks(),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        this.addClusterLayers();
        this.addUnclusteredLayer();
      });
    });
  }

  loadCustomIcons() {
    const icons = ['user-location', 'museum', 'church', 'fort', 'religious', 'school', 'hotel', 'monument', 'heritage'];
    icons.forEach(icon => {
      this.map.loadImage(`assets/icons/${icon}.png`, (err, image) => {
        if (!err && image && !this.map.hasImage(icon)) {
          this.map.addImage(icon, image);
        }
      });
    });
  }

  getGeoJsonFromLandmarks(): any {
    const results = this.landmarks
      .filter(l => (!this.cityFilter || l.city === this.cityFilter))
      .filter(l => {
        if (!this.showNearbyOnly) return true;
        const distance = this.getDistanceFromLatLonInKm(this.userLat, this.userLng, l.coordinates[1], l.coordinates[0]);
        return distance <= this.radiusKm;
      })
      .filter(l => l.name.toLowerCase().includes(this.searchQuery.toLowerCase()));

    this.nearbyLandmarks = results;

    return {
      type: 'FeatureCollection',
      features: results.map((landmark) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: landmark.coordinates },
        properties: {
          id: landmark.id,
          name: landmark.name,
          description: landmark.description,
          icon: landmark.type.toLowerCase(),
          city: landmark.city
        }
      }))
    };
  }

  addClusterLayers() {
    this.map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'landmarks',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#51bbd6',
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40]
      }
    });

    this.map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'landmarks',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 12
      }
    });
  }

  addUnclusteredLayer() {
    this.map.addLayer({
      id: 'unclustered-point',
      type: 'symbol',
      source: 'landmarks',
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': 0.1,
        'text-field': ['get', 'name'],
        'text-offset': [0, 1.5],
        'text-anchor': 'top'
      }
    });

    this.map.on('click', 'unclustered-point', (e) => {
  const geometry = e.features![0].geometry as GeoJSON.Point;
  const coordinates = geometry.coordinates as [number, number];
  const { name, description, id } = e.features![0].properties!;

  const popup = new mapboxgl.Popup()
    .setLngLat(coordinates)
    .setHTML(`
      <strong>${name}</strong><br>
      ${description}<br>
      <button id="details-btn-${id}">View Details</button>
    `)
    .addTo(this.map);

  // Wait for the DOM to mount, then attach click listener
  popup.on('open', () => {
    setTimeout(() => {
      const btn = document.getElementById(`details-btn-${id}`);
      btn?.addEventListener('click', () => this.router.navigate(['/landmark-details'], { queryParams: { id } }));
    }, 0);
  });
});


    this.map.on('mouseenter', 'unclustered-point', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'unclustered-point', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  filterByCity(city: string) {
    this.cityFilter = city;
    const source = this.map.getSource('landmarks') as mapboxgl.GeoJSONSource;
    source.setData(this.getGeoJsonFromLandmarks());
  }

  setCategoryFilter(cat: string) {
    this.categoryFilter = cat;
    const source = this.map.getSource('landmarks') as mapboxgl.GeoJSONSource;
    source.setData(this.getGeoJsonFromLandmarks());
  }

  updateMarkers(): void {
    const source = this.map.getSource('landmarks') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(this.getGeoJsonFromLandmarks());
    }
  }

  recenterToUser() {
    if (this.map) {
      this.map.flyTo({ center: [this.userLng, this.userLat], zoom: 14 });
    }
  }

  getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
