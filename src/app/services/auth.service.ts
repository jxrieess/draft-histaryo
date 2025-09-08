// // import { Injectable } from '@angular/core';
// // import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// // import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// // import { auth , db} from '../firebase.config';
// // import { Router } from '@angular/router';

// // @Injectable({
// //   providedIn: 'root'
// // })
// // export class AuthService {
// //   constructor(private router: Router) {}

// //   async register(email: string, password: string, role: 'visitor' | 'curator' | 'admin' = 'visitor') {
// //     const userCred = await createUserWithEmailAndPassword(auth, email, password);
// //     const uid = userCred.user.uid;

// //     const userDocRef = doc(db, 'users', uid);
// //     await setDoc(userDocRef, {
// //       uid,
// //       email,
// //       role,
// //       createdAt: serverTimestamp()
// //     });

// //     return userCred;
// //   }

// //   async login(email: string, password: string) {
// //     return signInWithEmailAndPassword(auth, email, password);
// //   }

// //   async logout() {
// //     await signOut(auth);
// //     this.router.navigate(['/login']);
// //   }
// // }



// import { Injectable } from '@angular/core';
// import {
//   createUserWithEmailAndPassword,
//   signInWithEmailAndPassword,
//   signOut,
//   UserCredential
// } from 'firebase/auth';
// import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// import { auth, db } from '../firebase.config';
// import { Router } from '@angular/router';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {
//   constructor(private router: Router) {}

//   // Register and store user info in Firestore
//   async register(
//     email: string,
//     password: string,
//     role: 'visitor' | 'curator' | 'admin' = 'visitor'
//   ): Promise<UserCredential> {
//     const userCred = await createUserWithEmailAndPassword(auth, email, password);
//     const uid = userCred.user.uid;

//     const userDocRef = doc(db, 'users', uid);
//     await setDoc(userDocRef, {
//       uid,
//       email,
//       role,
//       createdAt: serverTimestamp()
//     });

//     return userCred;
//   }

//   // Login user
//   async login(email: string, password: string): Promise<UserCredential> {
//     return signInWithEmailAndPassword(auth, email, password);
//   }

//   // Logout and redirect
//   async logout(): Promise<void> {
//     await signOut(auth);
//     this.router.navigate(['/login']);
//   }
// }


import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
  UserCredential as FirebaseUserCredential,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

// Custom interfaces to avoid conflicts with Firebase types
export interface AuthUserCredential {
  success: boolean;
  user?: any;
  error?: string;
}

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

export interface UserData {
  fullName: string;
  email: string;
  password: string;
  role: 'visitor' | 'curator' | 'guide' | 'admin';
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName?: string;
  role: string;
  createdAt: any;
  updatedAt?: any;
  photoURL?: string;
  preferences?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  constructor(private router: Router) {
    // Initialize auth state listener
    this.initAuthListener();
  }

  /**
   * Initialize authentication state listener
   */
  private initAuthListener(): void {
    onAuthStateChanged(auth, async (user) => {
      this.currentUserSubject.next(user);
      
      if (user) {
        // Load user profile when authenticated
        await this.loadUserProfile(user.uid);
      } else {
        this.userProfileSubject.next(null);
      }
    });
  }

  /**
   * Load user profile from Firestore
   */
  private async loadUserProfile(uid: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        this.userProfileSubject.next(userDoc.data() as UserProfile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  /**
   * Register new user with email and password
   */
  async register(userData: UserData): Promise<AuthUserCredential> {
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      const uid = userCred.user.uid;

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        createdAt: serverTimestamp(),
        preferences: {
          notifications: true,
          newsletter: false,
          language: 'en'
        }
      };

      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, userProfile);

      return {
        success: true,
        user: userCred.user
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthUserCredential> {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      return {
        success: true,
        user: userCred.user
      };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Legacy login method (for backward compatibility)
   */
  async login(email: string, password: string): Promise<FirebaseUserCredential> {
    return signInWithEmailAndPassword(auth, email, password);
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Legacy logout method (for backward compatibility)
   */
  async logout(): Promise<void> {
    return this.signOut();
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<AuthUserCredential> {
    try {
      const provider = new GoogleAuthProvider();
      // Add additional scopes if needed
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      
      // Create or update user profile
      await this.createOrUpdateUserProfile(result.user, 'visitor');
      
      return {
        success: true,
        user: result.user
      };
    } catch (error: any) {
      console.error('Google sign in error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sign in with Facebook
   */
  async signInWithFacebook(): Promise<AuthUserCredential> {
    try {
      const provider = new FacebookAuthProvider();
      // Add additional scopes if needed
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      
      // Create or update user profile
      await this.createOrUpdateUserProfile(result.user, 'visitor');
      
      return {
        success: true,
        user: result.user
      };
    } catch (error: any) {
      console.error('Facebook sign in error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create or update user profile for social login
   */
  private async createOrUpdateUserProfile(user: User, defaultRole: string = 'visitor'): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      // Safely extract photoURL
      const photoURL = (user as any).photoURL || '';
      
      if (!userDoc.exists()) {
        // Create new user profile
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          fullName: user.displayName || '',
          role: defaultRole,
          createdAt: serverTimestamp(),
          photoURL: photoURL,
          preferences: {
            notifications: true,
            newsletter: false,
            language: 'en'
          }
        };
        
        await setDoc(userDocRef, userProfile);
      } else {
        // Update existing profile with latest info
        await setDoc(userDocRef, {
          updatedAt: serverTimestamp(),
          photoURL: photoURL
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(!!user);
      });
    });
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Get current user profile
   */
  getCurrentUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(profileData: Partial<UserProfile>): Promise<AuthResult> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Reload user profile
      await this.loadUserProfile(currentUser.uid);

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const userProfile = this.getCurrentUserProfile();
    return userProfile?.role === role;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if user is curator
   */
  isCurator(): boolean {
    return this.hasRole('curator') || this.hasRole('admin');
  }

  /**
   * Check if user is visitor
   */
  isVisitor(): boolean {
    return this.hasRole('visitor');
  }

  /**
   * Get user's authentication token
   */
  async getAuthToken(): Promise<string | null> {
    try {
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        return await currentUser.getIdToken();
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        return await currentUser.getIdToken(true);
      }
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(): Promise<AuthResult> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Delete user profile from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      await deleteDoc(userDocRef);

      // Delete Firebase Auth account
      await currentUser.delete();

      return {
        success: true
      };
    } catch (error: any) {
      console.error('Delete account error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(): Promise<AuthResult> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      await sendEmailVerification(currentUser);
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Send email verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user's email is verified
   */
  isEmailVerified(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.emailVerified || false;
  }

  /**
   * Get authentication error message in user-friendly format
   */
  getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}