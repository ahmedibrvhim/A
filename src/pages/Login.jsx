import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword,
  signInWithPopup, updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function saveUser(user, extraName = '') {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName || extraName || user.email.split('@')[0],
      email: user.email,
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      orders: [],
    });
  }
}

function rememberUser(user, name) {
  try {
    localStorage.setItem('brandA_user', JSON.stringify({
      uid: user.uid,
      name: name || user.displayName || user.email.split('@')[0],
      email: user.email,
      photo: user.photoURL || '',
    }));
  } catch (e) {}
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.96H.96A8.996 8.996 0 000 9c0 1.45.35 2.83.96 4.04l3.01-2.34z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);

export default function Login() {
  const { t } = useLang();
  const { user, ready, busyRef } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const [tab, setTab] = useState('login');
  const [msg, setMsg] = useState(null); // {text, type}
  const [loading, setLoading] = useState(''); // 'google' | 'login' | 'reg'

  const [lEmail, setLEmail] = useState('');
  const [lPass, setLPass] = useState('');
  const [rName, setRName] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPass, setRPass] = useState('');
  const [rConf, setRConf] = useState('');

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const inApp = /musical_ly|bytedancewebview|tiktok|instagram|fbav|fban|fb_iab|messenger|snapchat|linkedinapp|whatsapp/i.test(ua);
  const isAndroid = /android/i.test(ua);

  const afterLogin = () => {
    const to = sessionStorage.getItem('redirectAfterLogin') || '/';
    sessionStorage.removeItem('redirectAfterLogin');
    nav(to.startsWith('/') ? to : '/' + to.replace(/\.html$/, ''), { replace: true });
  };

  useEffect(() => {
    if (ready && user && !busyRef.current) afterLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  useEffect(() => {
    if (sessionStorage.getItem('accountRemoved')) {
      sessionStorage.removeItem('accountRemoved');
      setMsg({ text: t('login.removed'), type: 'error' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errMsg = (code) => {
    const key = code && code.startsWith('auth/') ? code : '';
    const txt = key && t(key) !== key ? t(key) : t('auth/generic');
    return txt;
  };
  const err = (text) => setMsg({ text, type: 'error' });

  const run = async (kind, fn) => {
    setMsg(null);
    setLoading(kind);
    busyRef.current = true;
    try {
      await fn();
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
      if (e.__handled) return;
      err(errMsg(e.code));
    } finally {
      busyRef.current = false;
      setLoading('');
    }
  };

  const google = () => run('google', async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await saveUser(cred.user);
    rememberUser(cred.user);
    toast(t('login.welcome'), 'success');
    afterLogin();
  });

  const login = () => {
    const email = lEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return err(t('login.e.email'));
    if (!lPass) return err(t('login.e.pass'));
    run('login', async () => {
      const cred = await signInWithEmailAndPassword(auth, email, lPass);
      await saveUser(cred.user);
      rememberUser(cred.user);
      toast(t('login.welcomeBack'), 'success');
      afterLogin();
    });
  };

  const register = () => {
    const name = rName.trim();
    const email = rEmail.trim().toLowerCase();
    if (!name) return err(t('login.e.name'));
    if (!EMAIL_RE.test(email)) return err(t('login.e.email'));
    if (rPass.length < 6) return err(t('login.e.short'));
    if (!/[a-z]/.test(rPass) || !/[A-Z]/.test(rPass)) return err(t('login.e.case'));
    if (rPass !== rConf) return err(t('login.e.match'));
    run('reg', async () => {
      const cred = await createUserWithEmailAndPassword(auth, email, rPass);
      await updateProfile(cred.user, { displayName: name });
      await saveUser(cred.user, name);
      rememberUser(cred.user, name);
      setMsg({ text: t('login.created'), type: 'success' });
      toast(t('login.welcome'), 'success');
      afterLogin();
    });
  };

  const forgot = async (e) => {
    e.preventDefault();
    const email = lEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return err(t('login.e.forgot'));
    setMsg({ text: t('login.sending'), type: 'info' });
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg({ text: t('login.sent', { email }), type: 'success' });
    } catch (e2) {
      const known = ['auth/user-not-found', 'auth/invalid-email', 'auth/too-many-requests'];
      err(known.includes(e2.code) ? t(e2.code) : t('login.e.reset'));
    }
  };

  const strength = useMemo(() => {
    if (!rPass) return null;
    let score = 0;
    if (rPass.length >= 6) score++;
    if (rPass.length >= 10) score++;
    if (/[A-Z]/.test(rPass)) score++;
    if (/[0-9]/.test(rPass)) score++;
    if (/[^A-Za-z0-9]/.test(rPass)) score++;
    const n = Math.max(1, score);
    return { n, pct: n * 20 };
  }, [rPass]);

  const openInChrome = () => {
    const url = window.location.href.replace(/^https?:\/\//, '');
    window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
  };

  const spinner = <span className="spinner" aria-hidden="true" />;
  const enter = (fn) => (e) => { if (e.key === 'Enter') fn(); };

  return (
    <section className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <img src="/Skull.png" alt="" className="auth-logo" />
          <div>
            <div className="auth-title">A</div>
            <div className="muted small">{t('login.portal')}</div>
          </div>
        </div>

        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'login'} className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); setMsg(null); }}>{t('login.signin')}</button>
          <button role="tab" aria-selected={tab === 'register'} className={tab === 'register' ? 'active' : ''} onClick={() => { setTab('register'); setMsg(null); }}>{t('login.register')}</button>
        </div>

        {inApp && (
          <div className="notice">
            <strong>{t('login.inapp.t')}</strong>
            <span>{t('login.inapp.d')}</span>
            {isAndroid && <button type="button" className="btn btn-ghost btn-sm" onClick={openInChrome}>{t('login.inapp.btn')}</button>}
          </div>
        )}

        <button className="btn btn-google wide" onClick={google} disabled={inApp || !!loading}>
          {loading === 'google' ? <>{spinner} {t('login.wait')}</> : <><GoogleIcon /> {t('login.google')}</>}
        </button>

        <div className="divider"><span>{t('login.or')}</span></div>

        {msg && <div className={`msg ${msg.type}`} role="alert">{msg.text}</div>}

        {tab === 'login' ? (
          <div className="form">
            <label className="field">
              <span>{t('login.email')}</span>
              <input type="email" dir="ltr" autoComplete="email" placeholder="your@email.com" value={lEmail}
                onChange={(e) => setLEmail(e.target.value.toLowerCase())} onKeyDown={enter(login)} />
            </label>
            <label className="field">
              <span>{t('login.password')}</span>
              <input type="password" dir="ltr" autoComplete="current-password" placeholder="••••••••" value={lPass}
                onChange={(e) => setLPass(e.target.value)} onKeyDown={enter(login)} />
            </label>
            <a href="#" className="forgot" onClick={forgot}>{t('login.forgot')}</a>
            <button className="btn btn-primary wide" onClick={login} disabled={!!loading}>
              {loading === 'login' ? <>{spinner} {t('login.wait')}</> : t('login.signin')}
            </button>
          </div>
        ) : (
          <div className="form">
            <label className="field">
              <span>{t('login.name')}</span>
              <input type="text" autoComplete="name" placeholder={t('login.namePh')} value={rName}
                onChange={(e) => setRName(e.target.value)} onKeyDown={enter(register)} />
            </label>
            <label className="field">
              <span>{t('login.email')}</span>
              <input type="email" dir="ltr" autoComplete="email" placeholder="your@email.com" value={rEmail}
                onChange={(e) => setREmail(e.target.value.toLowerCase())} onKeyDown={enter(register)} />
            </label>
            <label className="field">
              <span>{t('login.passHint')}</span>
              <input type="password" dir="ltr" autoComplete="new-password" placeholder="••••••••" value={rPass}
                onChange={(e) => setRPass(e.target.value)} onKeyDown={enter(register)} />
              {strength && (
                <div className="strength">
                  <div className="strength-bar"><div className={`strength-fill s${strength.n}`} style={{ width: `${strength.pct}%` }} /></div>
                  <small>{t(`login.str.${strength.n}`)}</small>
                </div>
              )}
            </label>
            <label className="field">
              <span>{t('login.confirm')}</span>
              <input type="password" dir="ltr" autoComplete="new-password" placeholder="••••••••" value={rConf}
                onChange={(e) => setRConf(e.target.value)} onKeyDown={enter(register)} />
              {rConf && <small className={rConf === rPass ? 'ok' : 'bad'}>{rConf === rPass ? t('login.match') : t('login.nomatch')}</small>}
            </label>
            <button className="btn btn-primary wide" onClick={register} disabled={!!loading}>
              {loading === 'reg' ? <>{spinner} {t('login.wait')}</> : t('login.create')}
            </button>
          </div>
        )}

        <Link to="/" className="back-link center">{t('login.back')}</Link>
      </div>
    </section>
  );
}
