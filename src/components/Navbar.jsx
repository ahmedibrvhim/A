import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import LangToggle from './LangToggle.jsx';
import { useLang } from '../i18n/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { ADMIN_EMAILS } from '../firebase.js';

function Avatar({ user }) {
  const [broken, setBroken] = useState(false);
  const src = user.photoURL && user.photoURL.startsWith('http') && !broken ? user.photoURL : '/Skull.png';
  return <img className="avatar" src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
}

export default function Navbar() {
  const { t } = useLang();
  const { user, signOut } = useAuth();
  const { count, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menu]);

  const name = user ? (user.displayName || user.email.split('@')[0]) : '';
  const isAdmin = user && ADMIN_EMAILS.includes((user.email || '').toLowerCase());
  const logout = async () => { await signOut(); nav('/login'); };

  const links = (
    <>
      <NavLink to="/" end>{t('nav.home')}</NavLink>
      <NavLink to="/courses">{t('nav.courses')}</NavLink>
      <NavLink to="/checkout">{t('nav.checkout')}</NavLink>
      {isAdmin && <NavLink to="/admin">{t('nav.admin')}</NavLink>}
    </>
  );

  const cartBtn = (
    <button className="btn btn-ghost cart-btn" onClick={() => { setOpen(true); setMenu(false); }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 7h12l-1.2 11H7.2L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      <span>{t('nav.cart')}</span>
      {count > 0 && <span className="badge">{count}</span>}
    </button>
  );

  return (
    <>
    <header className="nav">
      <div className="container nav-inner">
        <Logo />
        <nav className="nav-links" aria-label="Primary">{links}</nav>

        <div className="nav-actions">
          <LangToggle />
          {cartBtn}
          {user ? (
            <div className="user-pill">
              <Avatar user={user} />
              <span className="user-name">{name}</span>
              <button className="link-btn" onClick={logout}>{t('nav.signout')}</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">{t('nav.login')}</Link>
          )}
        </div>

        <button
          className={`burger ${menu ? 'open' : ''}`}
          onClick={() => setMenu((m) => !m)}
          aria-label={t('nav.menu')}
          aria-expanded={menu}
        >
          <span /><span /><span />
        </button>
      </div>
    </header>

      <div className={`mobile-menu ${menu ? 'open' : ''}`}>
        <nav className="mobile-links">{links}</nav>
        <div className="mobile-sep" />
        <div className="mobile-row">
          <LangToggle className="wide" />
        </div>
        <div className="mobile-row">{cartBtn}</div>
        <div className="mobile-row">
          {user ? (
            <div className="user-pill wide">
              <Avatar user={user} />
              <span className="user-name">{name}</span>
              <button className="link-btn" onClick={logout}>{t('nav.signout')}</button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary wide">{t('nav.login')}</Link>
          )}
        </div>
      </div>
    </>
  );
}
