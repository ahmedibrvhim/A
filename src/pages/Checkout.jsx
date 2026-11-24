import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../components/Toast.jsx';

const VF_NUMBER = '01025421865';
const BN_ID = '868979554';
const USDT_PRICE = 15;

export default function Checkout() {
  const { t, lang } = useLang();
  const { user, ready } = useAuth();
  const { items, total, clear } = useCart();
  const toast = useToast();
  const nav = useNavigate();

  const [method, setMethod] = useState('vodafone');
  const [form, setForm] = useState({ name: '', phone: '', city: '', notes: '' });
  const [banner, setBanner] = useState(null); // order shown in the status panel
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const bannerRef = useRef(null);
  bannerRef.current = banner;

  const isBn = method === 'binance';
  const locked = !!banner; // pending or confirmed order => checkout closed (single-course store)

  // auth guard
  useEffect(() => {
    if (ready && !user) {
      sessionStorage.setItem('redirectAfterLogin', '/checkout');
      nav('/login', { replace: true });
    }
  }, [ready, user, nav]);

  // prefill name
  useEffect(() => {
    if (user?.displayName) setForm((f) => (f.name ? f : { ...f, name: user.displayName }));
  }, [user]);

  // watch the user's active order in real time
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const order = { id: d.id, ...d.data() };
        setBanner(order); // pending OR confirmed keeps the checkout locked
      } else {
        if (bannerRef.current) toast(t('checkout.t.cancelled'));
        setBanner(null);
      }
    }, () => {});
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const copyId = () => {
    navigator.clipboard?.writeText(BN_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const submit = async () => {
    const name = form.name.trim(), phone = form.phone.trim(), city = form.city.trim(), notes = form.notes.trim();
    if (banner) return toast(t('checkout.t.locked'), 'error');
    if (!name || !phone || !city) return toast(t('checkout.t.fill'), 'error');
    if (!items.length) return toast(t('checkout.t.empty'), 'error');
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'orders'), {
        customer: { name, phone, city, notes },
        items,
        total,
        status: 'pending',
        paymentMethod: method,
        usdtAmount: isBn ? USDT_PRICE : null,
        createdAt: serverTimestamp(),
        userId: user?.uid || 'guest',
        userEmail: user?.email || 'guest',
      });
      clear();
      setMethod('vodafone');
      toast(t('checkout.t.placed'), 'success');
      // the order listener locks the form automatically
    } catch (e) {
      toast(t('checkout.t.error', { msg: e.message }), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const num = (n) => n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  const usdtLabel = `${num(USDT_PRICE)} USDT`;
  const steps = isBn
    ? [
        t('checkout.bn.s1'),
        `${t('checkout.bn.s2')}: ${BN_ID}`,
        t('checkout.bn.s3', { amt: usdtLabel }),
        t('checkout.bn.s4'),
        t('checkout.bn.s5', { amt: usdtLabel }),
      ]
    : [
        t('checkout.vf.s1'),
        `${t('checkout.vf.s2')} ${VF_NUMBER}`,
        t('checkout.vf.s3'),
        t('checkout.vf.s4'),
      ];

  if (!ready || !user) return <div className="page-loading"><span className="spinner big" /></div>;

  return (
    <>
      <section className="page-head">
        <div className="container">
          <h1>{t('checkout.title')}</h1>
          <p className="muted">{t('checkout.sub')}</p>
        </div>
      </section>

      <section className="section tight">
        <div className="container checkout-grid">
          <div className="stack">
            <div className="card">
              <h3 className="card-title">{t('checkout.method')}</h3>
              <div className="seg">
                <button className={!isBn ? 'active' : ''} onClick={() => setMethod('vodafone')}>{t('checkout.vf')}</button>
                <button className={isBn ? 'active' : ''} onClick={() => setMethod('binance')}>{t('checkout.bn')}</button>
              </div>

              {isBn ? (
                <div className="pay-box bn">
                  <div className="pay-label">Binance Pay · {t('checkout.bn.sub')}</div>
                  <div className="pay-amount" dir="ltr">{usdtLabel}</div>
                  <div className="muted small">{t('checkout.bn.fixed')}</div>
                  <div className="pay-id">
                    <span className="muted small">{t('checkout.bn.id')}</span>
                    <code dir="ltr">{BN_ID}</code>
                    <button className="btn btn-ghost btn-sm" onClick={copyId}>{copied ? t('checkout.bn.copied') : t('checkout.bn.copy')}</button>
                  </div>
                  <div className="muted small">{t('checkout.bn.send', { amt: usdtLabel, id: BN_ID })}</div>
                </div>
              ) : (
                <div className="pay-box vf">
                  <div className="pay-label">{t('checkout.vf')} · {t('checkout.vf.sub')}</div>
                  <div className="pay-amount" dir="ltr">{VF_NUMBER}</div>
                  <div className="muted small">A</div>
                </div>
              )}

              <ol className="steps-list">
                {steps.map((s, i) => (
                  <li key={i}><span className="n">{num(i + 1)}</span><span>{s}</span></li>
                ))}
              </ol>
            </div>

            <div className="card">
              <h3 className="card-title">{t('checkout.info')}</h3>
              <div className="form">
                <label className="field">
                  <span>{t('checkout.name')}</span>
                  <input value={form.name} onChange={set('name')} placeholder={t('checkout.namePh')} disabled={locked} />
                </label>
                <label className="field">
                  <span>{t('checkout.phone')}</span>
                  <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} placeholder="01X XXXX XXXX" disabled={locked} />
                </label>
                <label className="field">
                  <span>{t('checkout.city')}</span>
                  <input value={form.city} onChange={set('city')} placeholder={t('checkout.cityPh')} disabled={locked} />
                </label>
                <label className="field">
                  <span>{t('checkout.notes')}</span>
                  <input value={form.notes} onChange={set('notes')} placeholder={t('checkout.notesPh')} disabled={locked} />
                </label>

                {!banner && (
                  <button className="btn btn-primary wide" onClick={submit} disabled={submitting}>
                    {submitting ? <span className="spinner" aria-hidden="true" /> : t('checkout.confirm')}
                  </button>
                )}

                {banner && (
                  <div className={`status-panel ${banner.status}`}>
                    <h4>{banner.status === 'confirmed' ? t('checkout.confirmedT') : t('checkout.pendingT')}</h4>
                    <p className="muted small">{banner.status === 'confirmed' ? t('checkout.confirmedD') : t('checkout.pendingD')}</p>
                    <div className="small">
                      <span className="muted">{t('checkout.orderId')}:</span> <code dir="ltr">{banner.id.slice(0, 12).toUpperCase()}</code>
                    </div>
                    <div className="small">
                      <span className="muted">{t('checkout.status')}:</span>{' '}
                      <span className={`pill ${banner.status === 'confirmed' ? 'pill-ok' : 'pill-warn'}`}>{t(`status.${banner.status}`)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="card summary">
            <h3 className="card-title">{t('checkout.summary')}</h3>
            <div className="summary-book">
              <img src="/BookCover.jpg" alt="" />
              <div>
                <div className="muted small">{t('checkout.book')}</div>
                <div className="summary-title">{items[0]?.name || 'How To Rebirth'}</div>
                <span className="pill">{t('checkout.digital')}</span>
              </div>
            </div>
            <div className="hr" />
            {items.length === 0 ? (
              <p className="muted center small">{t('checkout.empty')}</p>
            ) : (
              items.map((i) => (
                <div className="row between summary-row" key={i.name}>
                  <span>{i.name} <small className="muted">×{num(i.qty)}</small></span>
                  <strong className={isBn ? 'gold' : ''}>{isBn ? usdtLabel : `${num(i.price * i.qty)} ${t('courses.egp')}`}</strong>
                </div>
              ))
            )}
            <div className="hr" />
            <div className="row between">
              <span className="muted">{t('checkout.total')}</span>
              <span className={`total ${isBn ? 'gold' : ''}`}>
                {items.length === 0 ? `0 ${t('courses.egp')}` : isBn ? usdtLabel : `${num(total)} ${t('courses.egp')}`}
              </span>
            </div>
            <p className="muted small">{isBn ? t('checkout.via.bn') : t('checkout.via.vf')}</p>
          </aside>
        </div>
      </section>
    </>
  );
}
