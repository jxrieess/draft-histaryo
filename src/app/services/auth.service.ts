// import { Injectable } from '@angular/core';
// import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// import { auth , db} from '../firebase.config';
// import { Router } from '@angular/router';

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {
//   constructor(private router: Router) {}

//   async register(email: string, password: string, role: 'visitor' | 'curator' | 'admin' = 'visitor') {
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

//   async login(email: string, password: string) {
//     return signInWithEmailAndPassword(auth, email, password);
//   }

//   async logout() {
//     await signOut(auth);
//     this.router.navigate(['/login']);
//   }
// }



import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.config';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private router: Router) {}

  // Register and store user info in Firestore
  async register(
    email: string,
    password: string,
    role: 'visitor' | 'curator' | 'admin' = 'visitor'
  ): Promise<UserCredential> {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      uid,
      email,
      role,
      createdAt: serverTimestamp()
    });

    return userCred;
  }

  // Login user
  async login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout and redirect
  async logout(): Promise<void> {
    await signOut(auth);
    this.router.navigate(['/login']);
  }
}
