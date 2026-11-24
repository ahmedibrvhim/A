import { useLang } from '../i18n/LangContext.jsx';

export default function LangToggle({ className = '' }) {
  const { lang, toggle, t } = useLang();
  return (
    <button
      type="button"
      className={`lang-toggle ${className}`}
      onClick={toggle}
      aria-label={t('nav.language')}
      title={t('nav.language')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
    </button>
  );
}
