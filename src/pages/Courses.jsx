import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useBlocked, useOrderStatus } from '../hooks/useAccess.js';
import Stars from '../components/Stars.jsx';
import BlockedOverlay from '../components/BlockedOverlay.jsx';

const PRICE_EGP = 750;
const PRICE_USD = 15;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

function useRating() {
  const [r, setR] = useState({ avg: 0, count: 0 });
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'ratings'));
        let total = 0, count = 0;
        snap.forEach((d) => {
          if (d.id === '_aggregate') return;
          const s = Number(d.data().stars || 0);
          if (s >= 1 && s <= 5) { total += s; count++; }
        });
        setR({ avg: count ? total / count : 0, count });
      } catch (e) { console.warn('Could not load rating:', e); }
    })();
  }, []);
  return r;
}

export default function Courses() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { add } = useCart();
  const rating = useRating();
  const { status } = useOrderStatus(user);
  const { blocked, reason } = useBlocked(user);

  const confirmed = status === 'confirmed' && !blocked;
  const pending = status === 'pending';

  const addToCart = () =>
    add({ name: 'How To Rebirth', price: PRICE_EGP, type: 'Digital Book', cover: '/BookCover.jpg' });

  const action = (extra = '') => {
    if (blocked) return <button className={`btn btn-blocked wide ${extra}`} disabled>{t('courses.blocked')}</button>;
    if (confirmed) return <a className={`btn btn-success wide ${extra}`} href="/course-viewer.html">{t('courses.open')}</a>;
    if (pending) return <button className={`btn btn-muted wide ${extra}`} disabled>{t('courses.pending')}</button>;
    return <button className={`btn btn-primary wide ${extra}`} onClick={addToCart}>{t('courses.add')}</button>;
  };

  const num = (n) => n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  const ratingLabel = rating.count === 0
    ? t('courses.noRatings')
    : rating.count === 1 ? t('courses.rating1') : t('courses.ratings', { n: num(rating.count) });

  return (
    <>
      <section className="page-head">
        <div className="container">
          <h1>{t('courses.title')}</h1>
          <p className="muted">{t('courses.sub')}</p>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <article className="course">
            <div className="course-cover"><img src="/BookCover.jpg" alt={t('courses.name')} /></div>
            <div className="course-body">
              <div className="tags">
                <span className="tag">{t('courses.tag.book')}</span>
                <span className="tag">{t('courses.tag.pdfvideo')}</span>
                <span className="tag">{t('courses.tag.ar')}</span>
                <span className="tag">{t('courses.tag.en')}</span>
              </div>
              <h2>{t('courses.name')}</h2>
              <div className="rating-row">
                <Stars value={rating.avg} />
                <strong>{rating.count ? rating.avg.toFixed(1) : '—'}</strong>
                <span className="muted small">{ratingLabel}</span>
              </div>
              <p className="muted">{t('courses.desc')}</p>
              <div className="price-row">
                <span className="price">{num(PRICE_EGP)} <small>{t('courses.egp')}</small></span>
                <span className="price-sep" />
                <span className="price-usd">${num(PRICE_USD)} <small>{t('courses.usd')}</small></span>
              </div>
              {action('course-btn')}
            </div>
          </article>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head center">
            <h2>{t('courses.inside')}</h2>
            <p className="muted">{t('courses.insideSub')}</p>
          </div>

          <div className="grid-3 chapters">
            {ROMAN.map((r, i) => (
              <div className={`card chapter ${confirmed ? 'open' : 'locked'}`} key={r}>
                <div className="chapter-top">
                  <span className="chapter-num">{r}</span>
                  <span className={`pill ${confirmed ? 'pill-ok' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {confirmed
                        ? <path d="M5 12.5l4.5 4.5L19 7.5" />
                        : <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>}
                    </svg>
                    {confirmed ? t('courses.unlocked') : t('courses.locked')}
                  </span>
                </div>
                <h3>{t(`ch.${i + 1}.n`)}</h3>
                <p className="muted small">{t(`ch.${i + 1}.d`)}</p>
              </div>
            ))}
          </div>

          <div className="cta-band">
            <div>
              <span className="muted">{t('courses.unlockAll')}</span>{' '}
              <strong>{num(PRICE_EGP)} {t('courses.egp')}</strong>{' '}
              <span className="muted">/ ${num(PRICE_USD)} {t('courses.usd')}</span>
            </div>
            <div className="cta-action">{action()}</div>
          </div>
        </div>
      </section>

      {blocked && <BlockedOverlay reason={reason} />}
    </>
  );
}
