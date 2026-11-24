import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC1MHhOUrUtsDv2KsRs9B1jfgjhtpKwErY',
  authDomain: 'a-store-3ae5c.firebaseapp.com',
  projectId: 'a-store-3ae5c',
  storageBucket: 'a-store-3ae5c.firebasestorage.app',
  messagingSenderId: '931388573936',
  appId: '1:931388573936:web:530acdd6dfb9b1a7441a35',
  measurementId: 'G-PDHJ6G0WYJ',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Auto-detect long-polling so writes don't hang silently behind blockers/proxies
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
export const googleProvider = new GoogleAuthProvider();
// Always show the Google account chooser
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_EMAILS = ['amedsaad036@gmail.com'];
