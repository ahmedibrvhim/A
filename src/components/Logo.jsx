import { Link } from 'react-router-dom';
import { useLang } from '../i18n/LangContext.jsx';

export default function Logo({ onClick }) {
  const { t } = useLang();
  return (
    <Link to="/" className="logo" onClick={onClick} aria-label="A">
      <img src="/Skull.png" alt="" className="logo-img" />
      <span className="logo-text">
        <span className="logo-mark">A</span>
        <span className="logo-tag">{t('brand.tag')}</span>
      </span>
    </Link>
  );
}
