import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext.jsx';

export default function Privacy() {
  const { t } = useLang();
  return (
    <section className="section">
      <div className="container prose">
        <Link to="/" className="back-link">{t('privacy.back')}</Link>
        <h1>{t('privacy.title')}</h1>
        <p className="muted small">{t('privacy.updated')}</p>
        <div className="callout">{t('privacy.short')}</div>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <div key={n}>
            <h2>{t(`privacy.h${n}`)}</h2>
            <p>{t(`privacy.p${n}`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
