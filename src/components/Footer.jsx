import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useLang } from '../i18n/LangContext.jsx';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>{t('footer.tagline')}</p>
        </div>
        <nav className="footer-links">
          <Link to="/">{t('nav.home')}</Link>
          <Link to="/courses">{t('nav.courses')}</Link>
          <Link to="/checkout">{t('nav.checkout')}</Link>
          <Link to="/privacy">{t('footer.privacy')}</Link>
        </nav>
      </div>
      <div className="container footer-copy">© {new Date().getFullYear()} A. {t('footer.rights')}</div>
    </footer>
  );
}
