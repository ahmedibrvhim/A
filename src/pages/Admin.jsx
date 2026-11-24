import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';
import { auth, db, ADMIN_EMAILS } from '../firebase.js';
import { useLang } from '../i18n/LangContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Stars from '../components/Stars.jsx';

const STATUSES = ['pending', 'confirmed', 'cancelled'];
const isBinance = (o) => /binance|usdt/i.test(o.paymentMethod || '');
const fmtDate = (ts, opts, locale = 'en-GB') => (ts?.toDate ? ts.toDate().toLocaleString(locale, opts) : null);

export default function Admin() {
  const { t, lang } = useLang();
  const { user, ready } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';

  const [orders, setOrders] = useState([]);
  const [ordersErr, setOrdersErr] = useState('');
  const [blocked, setBlocked] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [statusDraft, setStatusDraft] = useState({});

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (ready && !user) nav('/login', { replace: true });
  }, [ready, user, nav]);

  useEffect(() => {
    if (!isAdmin) return;
    const u1 = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => setOrdersErr(e.message));
    const u2 = onSnapshot(query(collection(db, 'blockedUsers'), orderBy('blockedAt', 'desc')),
      (s) => setBlocked(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    const u3 = onSnapshot(collection(db, 'ratings'),
      (s) => setRatings(s.docs.filter((d) => d.id !== '_aggregate').map((d) => ({ id: d.id, ...d.data() }))), () => {});
    return () => { u1(); u2(); u3(); };
  }, [isAdmin]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }), [orders]);

  const visible = useMemo(() => {
    const s = search.toLowerCase();
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!s) return true;
      return [o.customer?.name, o.customer?.phone, o.customer?.city, o.userEmail, o.id].join(' ').toLowerCase().includes(s);
    });
  }, [orders, filter, search]);

  const detail = orders.find((o) => o.id === detailId);

  /* ── order actions ── */
  const deleteOrder = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return false;
    try { await deleteDoc(doc(db, 'orders', id)); toast(t('admin.t.deleted')); return true; }
    catch (e) { toast(t('admin.error', { msg: e.message }), 'error'); return false; }
  };
  const applyStatus = async (o) => {
    const s = statusDraft[o.id] ?? o.status ?? 'pending';
    if (s === 'cancelled') { if (await deleteOrder(o.id)) setDetailId(null); return; }
    try {
      await updateDoc(doc(db, 'orders', o.id), { status: s, updatedAt: serverTimestamp() });
      toast(t('admin.t.updated', { s: t(`status.${s}`).toUpperCase() }), 'success');
    } catch (e) { toast(t('admin.error', { msg: e.message }), 'error'); }
  };

  if (!ready) return <div className="page-loading"><span className="spinner big" /></div>;
  if (!user) return <div className="page-loading"><span className="spinner big" /></div>;
  if (!isAdmin) {
    return (
      <section className="section">
        <div className="container center-col">
          <h1>{t('admin.denied')}</h1>
          <p className="muted">{t('admin.deniedD')}</p>
          <Link to="/" className="btn btn-primary">{t('admin.store')}</Link>
        </div>
      </section>
    );
  }

  const StatusSelect = ({ o }) => (
    <select className="select" value={statusDraft[o.id] ?? o.status ?? 'pending'}
      onChange={(e) => setStatusDraft((d) => ({ ...d, [o.id]: e.target.value }))}>
      {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
    </select>
  );
  const PayBadge = ({ o }) => <span className={`pill ${isBinance(o) ? 'pill-gold' : 'pill-red'}`}>{isBinance(o) ? t('checkout.bn') : t('checkout.vf')}</span>;
  const StatusBadge = ({ s = 'pending' }) => <span className={`pill pill-${s}`}>{t(`status.${s}`)}</span>;
  const totalOf = (o) => (isBinance(o) ? `${o.usdtAmount || 15} USDT` : `${o.total || 0} ${t('courses.egp')}`);

  return (
    <>
      <section className="page-head">
        <div className="container">
          <h1>{t('admin.title')}</h1>
          <p className="muted">{t('admin.sub')}</p>
        </div>
      </section>

      <section className="section tight">
        <div className="container stack-lg">
          <div className="stats">
            <div className="stat"><span>{t('admin.total')}</span><strong>{stats.total}</strong></div>
            <div className="stat warn"><span>{t('admin.pending')}</span><strong>{stats.pending}</strong></div>
            <div className="stat ok"><span>{t('admin.confirmed')}</span><strong>{stats.confirmed}</strong></div>
            <div className="stat bad"><span>{t('admin.cancelled')}</span><strong>{stats.cancelled}</strong></div>
            <div className="stat violet"><span>{t('admin.blockedUsers')}</span><strong>{blocked.length}</strong></div>
          </div>

          <div className="card flush">
            <div className="toolbar">
              <div className="chips">
                {['all', ...STATUSES].map((f) => (
                  <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                    {f === 'all' ? t('admin.all') : t(`status.${f}`)}
                  </button>
                ))}
              </div>
              <input className="search" placeholder={t('admin.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {ordersErr ? <div className="empty-row bad">{t('admin.error', { msg: ordersErr })}</div>
              : visible.length === 0 ? <div className="empty-row">{t('admin.noOrders')}</div>
              : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t('admin.col.id')}</th><th>{t('admin.col.customer')}</th><th>{t('admin.col.items')}</th>
                        <th>{t('admin.col.total')}</th><th>{t('admin.col.payment')}</th><th>{t('admin.col.date')}</th>
                        <th>{t('admin.col.status')}</th><th>{t('admin.col.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((o) => (
                        <tr key={o.id}>
                          <td data-label={t('admin.col.id')}>
                            <code>{o.id.slice(0, 10).toUpperCase()}…</code>
                            <button className="link-btn block" onClick={() => setDetailId(o.id)}>{t('admin.details')}</button>
                          </td>
                          <td data-label={t('admin.col.customer')}>
                            <div className="strong">{o.customer?.name || '—'}</div>
                            <div className="muted small" dir="ltr">{o.customer?.phone || '—'}</div>
                            <div className="muted small">{o.userEmail}</div>
                            {o.customer?.city && <div className="muted small">{o.customer.city}</div>}
                          </td>
                          <td data-label={t('admin.col.items')}>{(o.items || []).map((i) => <div key={i.name}>{i.name} <small className="muted">×{i.qty}</small></div>)}</td>
                          <td data-label={t('admin.col.total')}><strong className={isBinance(o) ? 'gold' : ''}>{totalOf(o)}</strong></td>
                          <td data-label={t('admin.col.payment')}>{PayBadge({ o })}</td>
                          <td className="muted small" data-label={t('admin.col.date')}>{fmtDate(o.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }, locale) || t('common.na')}</td>
                          <td data-label={t('admin.col.status')}>{StatusBadge({ s: o.status })}</td>
                          <td className="actions" data-label={t('admin.col.actions')}>
                            {o.status === 'cancelled' ? <span className="muted small">{t('admin.cancelledNote')}</span> : (
                              <>
                                {StatusSelect({ o })}
                                <button className="btn btn-primary btn-sm" onClick={() => applyStatus(o)}>{t('admin.update')}</button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteOrder(o.id)}>{t('admin.cancelOrder')}</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>

          <BlockPanel orders={orders} blocked={blocked} t={t} toast={toast} locale={locale} />
          <RatingsPanel ratings={ratings} orders={orders} blocked={blocked} t={t} toast={toast} locale={locale} />
        </div>
      </section>

      {detail && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setDetailId(null); }}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-head">
              <h3>{t('admin.detail')}</h3>
              <button className="icon-btn" onClick={() => setDetailId(null)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                [t('admin.col.id'), <code>{detail.id}</code>],
                [t('admin.d.date'), fmtDate(detail.createdAt, undefined, locale) || t('common.na')],
                [t('admin.col.status'), StatusBadge({ s: detail.status })],
                [t('admin.col.payment'), PayBadge({ o: detail })],
                [t('admin.d.name'), detail.customer?.name || '—'],
                [t('admin.d.phone'), <span dir="ltr">{detail.customer?.phone || '—'}</span>],
                [t('admin.d.city'), detail.customer?.city || '—'],
                [t('admin.d.email'), detail.userEmail || '—'],
                [t('admin.d.notes'), detail.customer?.notes || '—'],
              ].map(([k, v], i) => (
                <div className="detail-row" key={i}><span className="muted">{k}</span><span>{v}</span></div>
              ))}
              <h4 className="detail-sub">{t('admin.d.items')}</h4>
              {(detail.items || []).map((i) => (
                <div className="detail-item" key={i.name}>
                  <div className="strong">{i.name}</div>
                  <div className="muted small">
                    {t('admin.d.qty')}: {i.qty} · {i.price} {t('courses.egp')} {t('admin.d.each')} · {t('admin.d.subtotal')}: {i.price * i.qty} {t('courses.egp')}
                  </div>
                </div>
              ))}
              <div className="detail-row total-row">
                <span className="strong">{t('checkout.total')}</span>
                <span className={`total ${isBinance(detail) ? 'gold' : ''}`}>{totalOf(detail)}</span>
              </div>
              {detail.status !== 'cancelled' && (
                <div className="detail-actions">
                  <div className="muted small">{t('admin.d.updateStatus')}</div>
                  <div className="row gap">
                    {StatusSelect({ o: detail })}
                    <button className="btn btn-primary btn-sm" onClick={() => applyStatus(detail)}>{t('admin.update')}</button>
                    <button className="btn btn-danger btn-sm" onClick={async () => { if (await deleteOrder(detail.id)) setDetailId(null); }}>{t('admin.cancelOrder')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────── Block panel ───────────── */
function BlockPanel({ orders, blocked, t, toast, locale }) {
  const [q, setQ] = useState('');
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef();

  useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const customers = useMemo(() => {
    const seen = new Map();
    orders.forEach((o) => {
      const key = (o.userEmail || o.customer?.phone || '').toLowerCase();
      if (key && !seen.has(key)) {
        seen.set(key, { name: o.customer?.name || '—', email: o.userEmail || '', phone: o.customer?.phone || '', uid: o.userId || '' });
      }
    });
    return [...seen.values()];
  }, [orders]);

  const s = q.trim().toLowerCase();
  const results = s.length < 2 ? [] : customers.filter((c) =>
    c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || c.phone.toLowerCase().includes(s)).slice(0, 8);

  const pick = (c) => { setTarget(c); setQ(c.name); setOpen(false); };
  const manual = () => {
    const v = q.trim();
    const em = v.includes('@');
    setTarget({ name: v, email: em ? v : '', phone: em ? '' : v });
    setOpen(false);
  };

  const block = async () => {
    if (!target) return toast(t('admin.block.pick'), 'error');
    const { name, email, phone } = target;
    if (!email && !phone) return toast(t('admin.block.noid'), 'error');
    if ((email && blocked.find((u) => u.email === email)) || (phone && blocked.find((u) => u.phone === phone))) {
      return toast(t('admin.block.already'), 'error');
    }
    try {
      const id = (email || phone).replace(/[.#$[\]/@\s]/g, '_') + '_' + Date.now();
      await setDoc(doc(db, 'blockedUsers', id), {
        name: name || '', email: email || '', phone: phone || '', uid: target.uid || '',
        reason: reason.trim(), blockedAt: serverTimestamp(), blockedBy: auth.currentUser?.email || 'admin',
      });
      setQ(''); setReason(''); setTarget(null);
      toast(t('admin.block.done', { who: name || email || phone }), 'success');
    } catch (e) { toast(t('admin.error', { msg: e.message }), 'error'); }
  };

  const unblock = async (u) => {
    const who = u.name || u.email || u.phone;
    if (!window.confirm(t('admin.block.confirmUn', { who }))) return;
    try { await deleteDoc(doc(db, 'blockedUsers', u.id)); toast(t('admin.block.undone', { who }), 'success'); }
    catch (e) { toast(t('admin.error', { msg: e.message }), 'error'); }
  };

  return (
    <div className="card flush">
      <div className="panel-head">
        <div>
          <h3>{t('admin.block.title')}</h3>
          <p className="muted small">{t('admin.block.sub')}</p>
        </div>
      </div>
      <div className="block-form" ref={boxRef}>
        <div className="combo">
          <input className="search" placeholder={t('admin.block.search')} value={q} autoComplete="off"
            onChange={(e) => { setQ(e.target.value); setTarget(null); setOpen(true); }} />
          {open && s.length >= 2 && (
            <div className="dropdown">
              {results.length === 0 ? (
                <button className="opt" onClick={manual}><strong>{t('admin.block.manual')}</strong><small className="muted">{t('admin.block.manualD')}</small></button>
              ) : results.map((c, i) => (
                <button className="opt" key={i} onClick={() => pick(c)}>
                  <strong>{c.name}</strong><small className="muted">{[c.email, c.phone].filter(Boolean).join(' · ')}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <input className="search narrow" placeholder={t('admin.block.reason')} value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="btn btn-danger" onClick={block}>{t('admin.block.btn')}</button>
      </div>
      {target && (
        <div className="preview">
          {t('admin.block.will')}: <strong>{target.name}</strong>
          {target.email && <> · {target.email}</>}{target.phone && <> · {target.phone}</>}
          {target.uid !== undefined && (target.uid ? <> · UID: <code>{target.uid}</code></> : <> · <span className="gold">{t('admin.block.nouid')}</span></>)}
        </div>
      )}
      <div className="list">
        {blocked.length === 0 ? <div className="empty-row">{t('admin.block.none')}</div> : blocked.map((u) => (
          <div className="list-row" key={u.id}>
            <div>
              <div className="strong">{u.name || u.email || u.phone}</div>
              <div className="muted small">{[u.email, u.phone, u.uid].filter(Boolean).join(' · ')}</div>
              <div className="muted small">
                {t('admin.block.blocked')}: {fmtDate(u.blockedAt, undefined, locale) || t('common.na')}
                {u.reason && <> · {t('blocked.reason')}: {u.reason}</>}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => unblock(u)}>{t('admin.block.unblock')}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Ratings panel ───────────── */
function RatingsPanel({ ratings, orders, blocked, t, toast, locale }) {
  const valid = ratings.filter((r) => Number(r.stars) >= 1 && Number(r.stars) <= 5);
  const avg = valid.length ? (valid.reduce((a, r) => a + Number(r.stars), 0) / valid.length).toFixed(2) : '0.00';
  const ts = (r) => (r.updatedAt || r.createdAt || r.timestamp);

  const identity = (r) => {
    let email = r.email || r.userEmail || '';
    let name = r.name || r.userName || r.displayName || '';
    if (!email) {
      const o = orders.find((o) => o.userId === r.id && o.userEmail);
      if (o) { email = o.userEmail; name = name || o.customer?.name || ''; }
    }
    if (!email) { const b = blocked.find((b) => b.uid === r.id && b.email); if (b) email = b.email; }
    return { email, name };
  };

  const remove = async (r) => {
    const { email } = identity(r);
    if (!window.confirm(t('admin.rate.confirm', { who: email || r.id }))) return;
    try {
      await deleteDoc(doc(db, 'ratings', r.id));
      const rest = ratings.filter((x) => x.id !== r.id && Number(x.stars) >= 1 && Number(x.stars) <= 5);
      await setDoc(doc(db, 'ratings', '_aggregate'), { total: rest.reduce((a, x) => a + Number(x.stars), 0), count: rest.length });
      toast(t('admin.rate.deleted'), 'success');
    } catch (e) { toast(t('admin.error', { msg: e.message }), 'error'); }
  };

  const sorted = [...ratings].sort((a, b) => (ts(b)?.toMillis?.() || 0) - (ts(a)?.toMillis?.() || 0));

  return (
    <div className="card flush">
      <div className="panel-head">
        <div>
          <h3>{t('admin.rate.title')}</h3>
          <p className="muted small">{t('admin.rate.summary', { n: valid.length, avg })}</p>
        </div>
      </div>
      <div className="list">
        {sorted.length === 0 ? <div className="empty-row">{t('admin.rate.none')}</div> : sorted.map((r) => {
          const { email, name } = identity(r);
          const comment = r.comment || r.review || r.text || '';
          return (
            <div className="list-row" key={r.id}>
              <div>
                <div className="row gap"><Stars value={Number(r.stars) || 0} size={15} /><span className="strong">{email || name || t('admin.rate.unknown')}</span></div>
                <div className="muted small">
                  {name && email ? `${name} · ` : ''}<code>{r.id}</code>
                  {fmtDate(ts(r), undefined, locale) && ` · ${fmtDate(ts(r), undefined, locale)}`}
                </div>
                {comment && <div className="small">“{comment}”</div>}
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>{t('admin.rate.delete')}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
