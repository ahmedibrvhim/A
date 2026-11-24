import { useLang } from '../i18n/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function BlockedOverlay({ reason }) {
  const { t } = useLang();
  const { signOut } = useAuth();
  return (
    <div className="blocked-overlay" role="alertdialog" aria-modal="true">
      <div className="blocked-card">
        <div className="blocked-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
          </svg>
        </div>
        <div className="eyebrow">{t('blocked.eyebrow')}</div>
        <h2>{t('blocked.title')}</h2>
        <p className="muted">{t('blocked.sub')}</p>
        {reason && <div className="blocked-reason"><strong>{t('blocked.reason')}:</strong> {reason}</div>}
        <p className="muted small">{t('blocked.msg')}</p>
        <a className="btn btn-discord wide" href="https://discord.gg/W3Vm3sgyRG" target="_blank" rel="noopener noreferrer">{t('blocked.discord')}</a>
        <button className="btn btn-ghost wide" onClick={() => signOut().then(() => location.reload())}>{t('nav.signout')}</button>
      </div>
    </div>
  );
}
