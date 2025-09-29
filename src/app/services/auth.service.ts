import { Injectable } from '@angular/core';
import {createUserWithEmailAndPassword, signInWithEmailAndPassword,  signOut,  sendPasswordResetEmail,  GoogleAuthProvider,
  FacebookAuthProvider, signInWithPopup, onAuthStateChanged, User, UserCredential as FirebaseUserCredential, sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

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
    this.initAuthListener();
  }

  private initAuthListener(): void {
    onAuthStateChanged(auth, async (user) => {
      this.currentUserSubject.next(user);
      
      if (user) {
        await this.loadUserProfile(user.uid);
      } else {
        this.userProfileSubject.next(null);
      }
    });
  }

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

  async register(userData: UserData): Promise<AuthUserCredential> {
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      const uid = userCred.user.uid;

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

  async login(email: string, password: string): Promise<FirebaseUserCredential> {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    return this.signOut();
  }

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

  async signInWithGoogle(): Promise<AuthUserCredential> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      
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

  async signInWithFacebook(): Promise<AuthUserCredential> {
    try {
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      
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

  private async createOrUpdateUserProfile(user: User, defaultRole: string = 'visitor'): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      const photoURL = (user as any).photoURL || '';
      
      if (!userDoc.exists()) {
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
        await setDoc(userDocRef, {
          updatedAt: serverTimestamp(),
          photoURL: photoURL
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(!!user);
      });
    });
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  getCurrentUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

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

  hasRole(role: string): boolean {
    const userProfile = this.getCurrentUserProfile();
    return userProfile?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isCurator(): boolean {
    return this.hasRole('curator') || this.hasRole('admin');
  }

  isVisitor(): boolean {
    return this.hasRole('visitor');
  }

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

  async deleteAccount(): Promise<AuthResult> {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      await deleteDoc(userDocRef);

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

  isEmailVerified(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.emailVerified || false;
  }

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