import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyDRR0XhqQycSr7-_flmxJ8XRW63vS0px0w",
  authDomain: "histaryo-backend.firebaseapp.com",
  databaseURL: "https://histaryo-backend-default-rtdb.firebaseio.com",
  projectId: "histaryo-backend",
  storageBucket: "histaryo-backend.firebasestorage.app",
  messagingSenderId: "575185762981",
  appId: "1:575185762981:web:72a17ace0bdb3656c12b4c"
};

const app: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage = getStorage(app);

export { app };
