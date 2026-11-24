import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  // Login/register set this while they are creating the user doc, so the
  // "removed account" check below does not sign them out mid-flow.
  const busyRef = useRef(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u && !busyRef.current) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (!snap.exists()) {
            sessionStorage.setItem('accountRemoved', '1');
            await fbSignOut(auth);
            localStorage.removeItem('brandA_user');
            setUser(null);
            setReady(true);
            return;
          }
        } catch (e) { /* network error: let them through */ }
      }
      setUser(u);
      setReady(true);
    });
  }, []);

  const signOut = () => fbSignOut(auth).then(() => localStorage.removeItem('brandA_user'));

  return (
    <AuthContext.Provider value={{ user, ready, busyRef, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
