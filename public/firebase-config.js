// ══════════════════════════════════════
//  BRAND A — Firebase Configuration
// ══════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc,
         serverTimestamp, query, where, getDocs, orderBy,
         updateDoc, onSnapshot, deleteDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1MHhOUrUtsDv2KsRs9B1jfgjhtpKwErY",
  authDomain: "a-store-3ae5c.firebaseapp.com",
  projectId: "a-store-3ae5c",
  storageBucket: "a-store-3ae5c.firebasestorage.app",
  messagingSenderId: "931388573936",
  appId: "1:931388573936:web:530acdd6dfb9b1a7441a35",
  measurementId: "G-PDHJ6G0WYJ"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider,
  GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile,
  doc, setDoc, getDoc, collection, addDoc, serverTimestamp,
  query, where, getDocs, orderBy,
  updateDoc, onSnapshot, deleteDoc };
