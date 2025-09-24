// import { Injectable } from '@angular/core';
// import { BehaviorSubject, Observable } from 'rxjs';
// import { 
//   collection, 
//   doc, 
//   getDocs, 
//   getDoc, 
//   addDoc, 
//   updateDoc,
//   query, 
//   where,
//   orderBy,
//   serverTimestamp
// } from 'firebase/firestore';
// import { db } from '../firebase.config';
// import { auth } from '../firebase.config';

// export interface ARContent {
//   id: string;
//   landmarkId: string;
//   landmarkName: string;
//   contentType: 'model_3d' | 'video' | 'image_overlay' | 'text_overlay' | 'animation';
//   title: string;
//   description: string;
//   resourceUrl: string; // URL to 3D model, video, or image
//   thumbnailUrl?: string;
//   overlayData?: {
//     position: { x: number; y: number; z: number };
//     rotation: { x: number; y: number; z: number };
//     scale: { x: number; y: number; z: number };
//   };
//   interactionType: 'tap_to_view' | 'auto_play' | 'gesture_control' | 'voice_control';
//   duration?: number; // For videos/animations
//   isActive: boolean;
//   category: 'historical' | 'architectural' | 'cultural' | 'educational';
//   tags: string[];
//   created_at: any;
//   updated_at: any;
// }

// export interface ARSession {
//   id: string;
//   userId: string;
//   landmarkId: string;
//   startTime: Date;
//   endTime?: Date;
//   duration: number; // in seconds
//   interactionsCount: number;
//   contentViewed: string[];
//   completed: boolean;
//   rating?: number;
//   feedback?: string;
//   deviceInfo: {
//     platform: string;
//     arSupported: boolean;
//     cameraPermission: boolean;
//   };
// }

// export interface ARInteraction {
//   id: string;
//   sessionId: string;
//   contentId: string;
//   interactionType: 'view' | 'tap' | 'gesture' | 'share' | 'screenshot';
//   timestamp: Date;
//   duration?: number;
//   metadata?: any;
// }

// export interface ARStats {
//   totalSessions: number;
//   totalDuration: number; // in seconds
//   averageSessionDuration: number;
//   favoriteContent: string[];
//   completionRate: number;
//   mostViewedLandmark: string;
//   recentSessions: number; // last 7 days
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class ARExperienceService {
//   private arContentSubject = new BehaviorSubject<ARContent[]>([]);
//   private currentSessionSubject = new BehaviorSubject<ARSession | null>(null);
//   private arStatsSubject = new BehaviorSubject<ARStats | null>(null);
//   private loadingSubject = new BehaviorSubject<boolean>(false);
//   private errorSubject = new BehaviorSubject<string | null>(null);
//   private arSupportedSubject = new BehaviorSubject<boolean>(false);

//   public arContent$ = this.arContentSubject.asObservable();
//   public currentSession$ = this.currentSessionSubject.asObservable();
//   public arStats$ = this.arStatsSubject.asObservable();
//   public loading$ = this.loadingSubject.asObservable();
//   public error$ = this.errorSubject.asObservable();
//   public arSupported$ = this.arSupportedSubject.asObservable();

//   // AR detection and support flags
//   private arSupported: boolean = false;
//   private cameraPermission: boolean = false;

//   constructor() {
//     this.detectARSupport();
//   }

//   // Detect if device supports AR
//   private async detectARSupport(): Promise<void> {
//     try {
//       // Check for WebXR AR support
//       if ('navigator' in window && 'xr' in navigator) {
//         const isSupported = await (navigator as any).xr?.isSessionSupported('immersive-ar');
//         this.arSupported = isSupported || false;
//       }

//       // Fallback: Check for basic camera/media support
//       if (!this.arSupported) {
//         this.arSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
//       }

//       // Check camera permission
//       if (navigator.permissions) {
//         const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
//         this.cameraPermission = permission.state === 'granted';
//       }

//       this.arSupportedSubject.next(this.arSupported);

//     } catch (error) {
//       console.error('Error detecting AR support:', error);
//       this.arSupported = false;
//       this.arSupportedSubject.next(false);
//     }
//   }

//   // Load AR content for a landmark
//   async loadARContent(landmarkId: string): Promise<void> {
//     this.loadingSubject.next(true);
    
//     try {
//       const q = query(
//         collection(db, 'ar_content'),
//         where('landmarkId', '==', landmarkId),
//         where('isActive', '==', true),
//         orderBy('created_at', 'asc')
//       );

//       const snapshot = await getDocs(q);
//       const arContent: ARContent[] = [];

//       snapshot.forEach((doc) => {
//         arContent.push({
//           id: doc.id,
//           ...doc.data()
//         } as ARContent);
//       });

//       this.arContentSubject.next(arContent);

//     } catch (error) {
//       console.error('Error loading AR content:', error);
//       this.errorSubject.next('Failed to load AR content');
//     } finally {
//       this.loadingSubject.next(false);
//     }
//   }

//   // Start AR session
//   async startARSession(landmarkId: string): Promise<ARSession | null> {
//     try {
//       const user = auth.currentUser;
//       if (!user) {
//         this.errorSubject.next('Please log in to start AR experience');
//         return null;
//       }

//       if (!this.arSupported) {
//         this.errorSubject.next('AR is not supported on this device');
//         return null;
//       }

//       // Request camera permission if needed
//       if (!this.cameraPermission) {
//         const granted = await this.requestCameraPermission();
//         if (!granted) {
//           this.errorSubject.next('Camera permission is required for AR');
//           return null;
//         }
//       }

//       const session: ARSession = {
//         id: this.generateSessionId(),
//         userId: user.uid,
//         landmarkId: landmarkId,
//         startTime: new Date(),
//         duration: 0,
//         interactionsCount: 0,
//         contentViewed: [],
//         completed: false,
//         deviceInfo: {
//           platform: this.getPlatform(),
//           arSupported: this.arSupported,
//           cameraPermission: this.cameraPermission
//         }
//       };

//       this.currentSessionSubject.next(session);
      
//       // Start duration tracking
//       this.startDurationTracking();

//       return session;

//     } catch (error) {
//       console.error('Error starting AR session:', error);
//       this.errorSubject.next('Failed to start AR session');
//       return null;
//     }
//   }

//   // Request camera permission
//   private async requestCameraPermission(): Promise<boolean> {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: { facingMode: 'environment' }
//       });
      
//       // Stop the stream immediately as we only needed to request permission
//       stream.getTracks().forEach(track => track.stop());
      
//       this.cameraPermission = true;
//       return true;

//     } catch (error) {
//       console.error('Camera permission denied:', error);
//       this.cameraPermission = false;
//       return false;
//     }
//   }

//   // Track AR interaction
//   async trackInteraction(
//     contentId: string, 
//     interactionType: 'view' | 'tap' | 'gesture' | 'share' | 'screenshot',
//     duration?: number,
//     metadata?: any
//   ): Promise<void> {
//     try {
//       const currentSession = this.currentSessionSubject.value;
//       if (!currentSession) return;

//       const interaction: Omit<ARInteraction, 'id'> = {
//         sessionId: currentSession.id,
//         contentId: contentId,
//         interactionType: interactionType,
//         timestamp: new Date(),
//         duration: duration,
//         metadata: metadata
//       };

//       // Save interaction to Firestore
//       await addDoc(collection(db, 'ar_interactions'), {
//         ...interaction,
//         created_at: serverTimestamp()
//       });

//       // Update session data
//       currentSession.interactionsCount++;
      
//       if (interactionType === 'view' && !currentSession.contentViewed.includes(contentId)) {
//         currentSession.contentViewed.push(contentId);
//       }

//       this.currentSessionSubject.next({ ...currentSession });

//     } catch (error) {
//       console.error('Error tracking AR interaction:', error);
//     }
//   }

//   // End AR session
//   async endARSession(rating?: number, feedback?: string): Promise<void> {
//     try {
//       const currentSession = this.currentSessionSubject.value;
//       if (!currentSession) return;

//       // Calculate final duration
//       const endTime = new Date();
//       const duration = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / 1000);

//       currentSession.endTime = endTime;
//       currentSession.duration = duration;
//       currentSession.completed = true;
//       currentSession.rating = rating;
//       currentSession.feedback = feedback;

//       // Save session to Firestore
//       await addDoc(collection(db, 'ar_sessions'), {
//         ...currentSession,
//         created_at: serverTimestamp(),
//         completed_at: serverTimestamp()
//       });

//       // Clear current session
//       this.currentSessionSubject.next(null);

//       // Update user AR stats
//       await this.updateUserARStats();

//     } catch (error) {
//       console.error('Error ending AR session:', error);
//       this.errorSubject.next('Failed to save AR session');
//     }
//   }

//   // Start tracking session duration
//   private startDurationTracking(): void {
//     const updateInterval = setInterval(() => {
//       const currentSession = this.currentSessionSubject.value;
//       if (!currentSession) {
//         clearInterval(updateInterval);
//         return;
//       }

//       const now = new Date();
//       const duration = Math.floor((now.getTime() - currentSession.startTime.getTime()) / 1000);
//       currentSession.duration = duration;

//       this.currentSessionSubject.next({ ...currentSession });
//     }, 1000);
//   }

//   // Update user AR statistics
//   private async updateUserARStats(): Promise<void> {
//     try {
//       const user = auth.currentUser;
//       if (!user) return;

//       // Get all user AR sessions
//       const q = query(
//         collection(db, 'ar_sessions'),
//         where('userId', '==', user.uid),
//         orderBy('created_at', 'desc')
//       );

//       const snapshot = await getDocs(q);
//       const sessions: ARSession[] = [];

//       snapshot.forEach((doc) => {
//         const data = doc.data();
//         sessions.push({
//           id: doc.id,
//           ...data,
//           startTime: data.startTime?.toDate() || new Date(),
//           endTime: data.endTime?.toDate() || null
//         } as ARSession);
//       });

//       if (sessions.length === 0) return;

//       // Calculate stats
//       const totalSessions = sessions.length;
//       const completedSessions = sessions.filter(s => s.completed);
//       const totalDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0);
//       const averageSessionDuration = totalDuration / completedSessions.length;
//       const completionRate = (completedSessions.length / totalSessions) * 100;

//       // Get recent sessions (last 7 days)
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//       const recentSessions = sessions.filter(s => s.startTime > sevenDaysAgo).length;

//       // Find most viewed landmark
//       const landmarkCounts = new Map<string, number>();
//       sessions.forEach(s => {
//         const count = landmarkCounts.get(s.landmarkId) || 0;
//         landmarkCounts.set(s.landmarkId, count + 1);
//       });

//       const mostViewedLandmark = Array.from(landmarkCounts.entries())
//         .sort(([, a], [, b]) => b - a)[0]?.[0] || '';

//       // Get favorite content
//       const contentViews = new Map<string, number>();
//       sessions.forEach(s => {
//         s.contentViewed.forEach(contentId => {
//           const count = contentViews.get(contentId) || 0;
//           contentViews.set(contentId, count + 1);
//         });
//       });

//       const favoriteContent = Array.from(contentViews.entries())
//         .sort(([, a], [, b]) => b - a)
//         .slice(0, 5)
//         .map(([contentId]) => contentId);

//       const stats: ARStats = {
//         totalSessions,
//         totalDuration,
//         averageSessionDuration,
//         favoriteContent,
//         completionRate,
//         mostViewedLandmark,
//         recentSessions
//       };

//       this.arStatsSubject.next(stats);

//     } catch (error) {
//       console.error('Error updating AR stats:', error);
//     }
//   }

//   // Initialize AR scene (placeholder for AR library integration)
//   async initializeARScene(containerId: string): Promise<boolean> {
//     try {
//       // This is where you would integrate with AR.js, Three.js, or WebXR
//       // For now, we'll create a placeholder implementation
      
//       const container = document.getElementById(containerId);
//       if (!container) {
//         this.errorSubject.next('AR container not found');
//         return false;
//       }

//       // Placeholder: Create a simple video element for camera feed
//       const video = document.createElement('video');
//       video.style.width = '100%';
//       video.style.height = '100%';
//       video.style.objectFit = 'cover';
//       video.autoplay = true;
//       video.playsInline = true;

//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({ 
//           video: { 
//             facingMode: 'environment',
//             width: { ideal: 1280 },
//             height: { ideal: 720 }
//           }
//         });
        
//         video.srcObject = stream;
//         container.appendChild(video);

//         // Add AR overlay div
//         const overlay = document.createElement('div');
//         overlay.id = 'ar-overlay';
//         overlay.style.position = 'absolute';
//         overlay.style.top = '0';
//         overlay.style.left = '0';
//         overlay.style.width = '100%';
//         overlay.style.height = '100%';
//         overlay.style.pointerEvents = 'none';
//         container.appendChild(overlay);

//         return true;

//       } catch (error) {
//         console.error('Error accessing camera:', error);
//         this.errorSubject.next('Failed to access camera');
//         return false;
//       }

//     } catch (error) {
//       console.error('Error initializing AR scene:', error);
//       this.errorSubject.next('Failed to initialize AR scene');
//       return false;
//     }
//   }

//   // Load AR content into scene
//   async loadContentIntoScene(contentId: string): Promise<void> {
//     try {
//       const arContent = this.arContentSubject.value;
//       const content = arContent.find(c => c.id === contentId);
      
//       if (!content) {
//         this.errorSubject.next('AR content not found');
//         return;
//       }

//       // Track the view interaction
//       await this.trackInteraction(contentId, 'view');

//       // Placeholder implementation for loading content
//       const overlay = document.getElementById('ar-overlay');
//       if (!overlay) return;

//       // Clear previous content
//       overlay.innerHTML = '';

//       if (content.contentType === 'text_overlay') {
//         const textDiv = document.createElement('div');
//         textDiv.style.position = 'absolute';
//         textDiv.style.top = '50%';
//         textDiv.style.left = '50%';
//         textDiv.style.transform = 'translate(-50%, -50%)';
//         textDiv.style.background = 'rgba(0, 0, 0, 0.8)';
//         textDiv.style.color = 'white';
//         textDiv.style.padding = '20px';
//         textDiv.style.borderRadius = '10px';
//         textDiv.style.fontSize = '18px';
//         textDiv.style.maxWidth = '80%';
//         textDiv.style.textAlign = 'center';
//         textDiv.innerHTML = `<h3>${content.title}</h3><p>${content.description}</p>`;
//         overlay.appendChild(textDiv);

//       } else if (content.contentType === 'image_overlay') {
//         const img = document.createElement('img');
//         img.src = content.resourceUrl;
//         img.style.position = 'absolute';
//         img.style.top = '20%';
//         img.style.left = '50%';
//         img.style.transform = 'translateX(-50%)';
//         img.style.maxWidth = '80%';
//         img.style.maxHeight = '60%';
//         img.style.objectFit = 'contain';
//         img.style.borderRadius = '10px';
//         img.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
//         overlay.appendChild(img);

//       } else if (content.contentType === 'video') {
//         const video = document.createElement('video');
//         video.src = content.resourceUrl;
//         video.controls = true;
//         video.style.position = 'absolute';
//         video.style.top = '20%';
//         video.style.left = '50%';
//         video.style.transform = 'translateX(-50%)';
//         video.style.maxWidth = '80%';
//         video.style.maxHeight = '60%';
//         video.style.borderRadius = '10px';
//         video.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
//         overlay.appendChild(video);
//       }

//     } catch (error) {
//       console.error('Error loading content into AR scene:', error);
//       this.errorSubject.next('Failed to load AR content');
//     }
//   }

//   // Cleanup AR scene
//   cleanupARScene(containerId: string): void {
//     try {
//       const container = document.getElementById(containerId);
//       if (!container) return;

//       // Stop video streams
//       const video = container.querySelector('video');
//       if (video && video.srcObject) {
//         const stream = video.srcObject as MediaStream;
//         stream.getTracks().forEach(track => track.stop());
//       }

//       // Clear container
//       container.innerHTML = '';

//     } catch (error) {
//       console.error('Error cleaning up AR scene:', error);
//     }
//   }

//   // Utility methods
//   private generateSessionId(): string {
//     return `ar_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//   }

//   private getPlatform(): string {
//     const userAgent = navigator.userAgent;
//     if (/Android/i.test(userAgent)) return 'Android';
//     if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
//     if (/Windows/i.test(userAgent)) return 'Windows';
//     if (/Mac/i.test(userAgent)) return 'Mac';
//     if (/Linux/i.test(userAgent)) return 'Linux';
//     return 'Unknown';
//   }

//   // Public getters
//   isARSupported(): boolean {
//     return this.arSupported;
//   }

//   hasCameraPermission(): boolean {
//     return this.cameraPermission;
//   }

//   getCurrentARContent(): ARContent[] {
//     return this.arContentSubject.value;
//   }

//   getCurrentSession(): ARSession | null {
//     return this.currentSessionSubject.value;
//   }

//   getCurrentARStats(): ARStats | null {
//     return this.arStatsSubject.value;
//   }

//   // Clear error
//   clearError(): void {
//     this.errorSubject.next(null);
//   }
// }