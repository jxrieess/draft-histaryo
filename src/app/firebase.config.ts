import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDRR0XhqQycSr7-_flmxJ8XRW63vS0px0w",
  authDomain: "histaryo-backend.firebaseapp.com",
  databaseURL: "https://histaryo-backend-default-rtdb.firebaseio.com",
  projectId: "histaryo-backend",
  storageBucket: "histaryo-backend.firebasestorage.app",
  messagingSenderId: "575185762981",
  appId: "1:575185762981:web:72a17ace0bdb3656c12b4c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
