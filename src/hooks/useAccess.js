import { useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase.js';

/** 'none' | 'pending' | 'confirmed' — live status of the user's active order. */
export function useOrderStatus(user) {
  const [status, setStatus] = useState('none');
  const [order, setOrder] = useState(null);
  useEffect(() => {
    if (!user) { setStatus('none'); setOrder(null); return; }
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      where('status', 'in', ['pending', 'confirmed'])
    );
    return onSnapshot(q, (snap) => {
      if (snap.empty) { setStatus('none'); setOrder(null); return; }
      const d = snap.docs[0];
      const o = { id: d.id, ...d.data() };
      setOrder(o);
      setStatus(o.status);
    }, () => {});
  }, [user]);
  return { status, order };
}

/** Returns { blocked, reason } — checks blockedUsers by uid and by email. */
export function useBlocked(user) {
  const [state, setState] = useState({ blocked: false, reason: '' });
  useEffect(() => {
    let alive = true;
    if (!user) { setState({ blocked: false, reason: '' }); return; }
    (async () => {
      try {
        const checks = [query(collection(db, 'blockedUsers'), where('uid', '==', user.uid))];
        if (user.email) checks.push(query(collection(db, 'blockedUsers'), where('email', '==', user.email)));
        for (const q of checks) {
          const snap = await getDocs(q);
          if (!snap.empty) { if (alive) setState({ blocked: true, reason: snap.docs[0].data().reason || '' }); return; }
        }
        if (alive) setState({ blocked: false, reason: '' });
      } catch (e) { console.warn('Block check error:', e); }
    })();
    return () => { alive = false; };
  }, [user]);
  return state;
}
