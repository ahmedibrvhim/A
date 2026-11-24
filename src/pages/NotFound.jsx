import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext.jsx';

export default function NotFound() {
  const { t } = useLang();
  return (
    <section className="section">
      <div className="container center-col">
        <h1>{t('notfound.title')}</h1>
        <p className="muted">{t('notfound.d')}</p>
        <Link to="/" className="btn btn-primary">{t('nav.home')}</Link>
      </div>
    </section>
  );
}
