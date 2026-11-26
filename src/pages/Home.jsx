import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useLang } from '../i18n/LangContext.jsx';
import SkullSpeaker from '../components/SkullSpeaker.jsx';

const Icon = {
  book: <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16zM4 19.5A2.5 2.5 0 0 1 6.5 17H20" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
};
const Svg = ({ children }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

function useVisitors() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ref = doc(db, 'siteStats', 'visitors');
        if (!sessionStorage.getItem('brandA_visited')) {
          sessionStorage.setItem('brandA_visited', '1');
          await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists()) tx.set(ref, { count: 1 });
            else tx.update(ref, { count: (snap.data().count || 0) + 1 });
          });
        }
        const snap = await getDoc(ref);
        if (alive) setCount(snap.exists() ? snap.data().count || 0 : 0);
      } catch (e) {
        console.error('Visitor counter error:', e);
      }
    })();
    return () => { alive = false; };
  }, []);
  return count;
}

export default function Home() {
  const { t, lang } = useLang();
  const visitors = useVisitors();

  const features = [
    ['book', t('home.f1.t'), t('home.f1.d')],
    ['globe', t('home.f2.t'), t('home.f2.d')],
    ['card', t('home.f3.t'), t('home.f3.d')],
  ];
  const steps = [
    [t('home.s1.t'), t('home.s1.d')],
    [t('home.s2.t'), t('home.s2.d')],
    [t('home.s3.t'), t('home.s3.d')],
  ];

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <SkullSpeaker />
            <span className="eyebrow">{t('home.eyebrow')}</span>
            <h1 className="display">{t('home.title')}</h1>
            <p className="lead">{t('home.subtitle')}</p>
            <div className="hero-actions">
              <Link to="/courses" className="btn btn-primary btn-lg">{t('home.cta')}</Link>
              <a href="#how" className="btn btn-ghost btn-lg">{t('home.cta2')}</a>
            </div>
            {visitors !== null && <div className="hero-stat">
              <span className="hero-stat-num">{visitors.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
              <span className="hero-stat-label">{t('home.learners')}</span>
            </div>}
          </div>
          <div className="hero-visual">
            <div className="cover-frame">
              <img src="/BookCover.jpg" alt={t('home.title')} />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-3">
          {features.map(([icon, title, desc]) => (
            <div className="card feature" key={title}>
              <div className="feature-icon"><Svg>{Icon[icon]}</Svg></div>
              <h3>{title}</h3>
              <p className="muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section-alt" id="how">
        <div className="container">
          <div className="section-head center">
            <h2>{t('home.how.title')}</h2>
            <p className="muted">{t('home.how.sub')}</p>
          </div>
          <div className="grid-3 steps">
            {steps.map(([title, desc], i) => (
              <div className="step" key={title}>
                <div className="step-num">{(i + 1).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</div>
                <h3>{title}</h3>
                <p className="muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>{t('home.final.t')}</h2>
              <p className="muted">{t('home.final.d')}</p>
            </div>
            <Link to="/courses" className="btn btn-primary btn-lg">{t('home.cta')}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
