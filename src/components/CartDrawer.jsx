import { useNavigate } from 'react-router-dom';
import { useCart, EGP_PER_USD } from '../context/CartContext.jsx';
import { useLang } from '../i18n/LangContext.jsx';

export default function CartDrawer() {
  const { items, remove, total, open, setOpen } = useCart();
  const { t, lang } = useLang();
  const nav = useNavigate();
  const usd = Math.round(total / EGP_PER_USD);

  const go = () => { setOpen(false); nav('/checkout'); };

  return (
    <>
      <div className={`overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label={t('cart.title')}>
        <div className="drawer-head">
          <h3>{t('cart.title')}</h3>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label={t('cart.close')}>✕</button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 7h12l-1.2 11H7.2L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              <p>{t('cart.empty')}</p>
            </div>
          ) : (
            items.map((i) => (
              <div className="cart-row" key={i.name}>
                <img src={i.cover || '/BookCover.jpg'} alt="" />
                <div className="cart-info">
                  <div className="cart-name">{i.name}</div>
                  <div className="cart-meta">{lang === 'ar' ? t('courses.tag.book') : i.type}</div>
                </div>
                <div className="cart-price">
                  <strong>{i.price * i.qty} {t('courses.egp')}</strong>
                  <span>${Math.round((i.price * i.qty) / EGP_PER_USD)}</span>
                </div>
                <button className="icon-btn" onClick={() => remove(i.name)} aria-label={t('cart.remove')}>✕</button>
              </div>
            ))
          )}
        </div>

        <div className="drawer-foot">
          <div className="row between">
            <span className="muted">{t('cart.total')}</span>
            <span className="total">{total} {t('courses.egp')} <small>· ${usd}</small></span>
          </div>
          <p className="muted small">{t('cart.secure')}</p>
          <button className="btn btn-primary wide" disabled={!items.length} onClick={go}>{t('cart.checkout')}</button>
        </div>
      </aside>
    </>
  );
}
