import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc, increment,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { auth, db, storage } from '../firebase';

const ADMIN_EMAIL = 'adminkevin@gateway.ie';

export default function Admin() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [accusations, setAccusations] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Listen for admin auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u && u.email === ADMIN_EMAIL) setAdminUser(u);
      else setAdminUser(null);
    });
    return unsub;
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      if (cred.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setLoginError('Not authorised.');
      }
    } catch (err) {
      setLoginError('Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.points || 0) - (a.points || 0));
      setUsers(list);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'accusations'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAccusations(list);
    });
    return unsub;
  }, []);

  const showToast = (msg, color = '#22c55e') => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const adjustPoints = async (uid, name, delta) => {
    const current = users.find((u) => u.id === uid)?.points || 0;
    const newVal = Math.max(0, current + delta);
    await updateDoc(doc(db, 'users', uid), { points: newVal });
    showToast(`${name}: ${current} → ${newVal} pts`);
  };

  const resetPunishment = async (uid, name) => {
    await updateDoc(doc(db, 'users', uid), { punishmentsServed: increment(1) });
    showToast(`${name} punishment cleared`);
  };

  const deleteAccusation = async (accusation) => {
    // Delete Firestore doc
    await deleteDoc(doc(db, 'accusations', accusation.id));
    // Delete storage image if exists
    if (accusation.photoUrl) {
      try {
        const url = new URL(accusation.photoUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
        if (pathMatch) {
          const storagePath = decodeURIComponent(pathMatch[1]);
          await deleteObject(ref(storage, storagePath));
        }
      } catch (e) {
        console.warn('Could not delete image:', e);
      }
    }
    showToast('Accusation deleted');
    setConfirmDelete(null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/dashboard');
  };

  const getUserName = (uid) => users.find((u) => u.id === uid)?.name || 'Unknown';
  const statusLabel = (pts, served = 0) => {
    const due = Math.floor(pts / 3) > served;
    if (due) return { label: '🚨 Punishment Due', color: '#ef4444' };
    if (pts % 3 === 2) return { label: '⚠️ Getting close', color: '#f97316' };
    return { label: pts === 0 ? '✅ Clean' : '✅ All good', color: '#22c55e' };
  };

  // Show admin login form if not authenticated as admin
  if (!adminUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0d0d1a', position: 'relative', overflow: 'hidden' }}>
        <div style={s.glow1} />
        <div style={s.glow2} />
        <div style={{ ...s.modal, position: 'relative', zIndex: 1, padding: '2.5rem 2rem', maxWidth: 380, width: '100%' }} className="fade-in">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span style={{ fontSize: 40 }}>🛡️</span>
            <h2 style={{ margin: '12px 0 4px', fontSize: 22, fontWeight: 800, color: '#fff' }}>
              <span className="text-gradient">Admin Login</span>
            </h2>
            <p style={{ color: '#555', fontSize: 13 }}>Restricted access only</p>
          </div>
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Email</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="admin@gateway.ie" required autoComplete="email" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Password</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••" required autoComplete="current-password" />
            </div>
            {loginError && (
              <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500 }}>
                {loginError}
              </div>
            )}
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', padding: 14, borderRadius: 12, marginTop: 4 }}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#444', fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
              ← Back to app
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Ambient glows */}
      <div style={s.glow1} />
      <div style={s.glow2} />

      {/* Toast */}
      {toast && (
        <div style={{ ...s.toast, background: toast.color }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (() => {
        const acc = accusations.find((a) => a.id === confirmDelete);
        return (
          <div style={s.overlay} onClick={() => setConfirmDelete(null)}>
            <div style={s.modal} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                Delete accusation?
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                Against <b style={{ color: '#fff' }}>{getUserName(acc?.accusedUid)}</b>
                {acc?.note ? ` — "${acc.note}"` : ''}. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={s.btnDanger} onClick={() => deleteAccusation(acc)}>
                  Delete
                </button>
                <button style={s.btnGhost} onClick={() => setConfirmDelete(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Navbar */}
      <nav style={s.nav}>
        <span style={s.brand}>🛡️ <span className="text-gradient">Admin Panel</span></span>
        <button onClick={handleLogout} style={s.logoutBtn}>Logout</button>
      </nav>

      <div style={s.content} className="fade-in">

        {/* ── Users ── */}
        <h2 style={s.sectionTitle}>👤 Users & Points</h2>
        <div style={s.grid}>
          {users.map((u) => {
            const pts = u.points || 0;
            const served = u.punishmentsServed || 0;
            const status = statusLabel(pts, served);
            const punishDue = Math.floor(pts / 3) > served;
            return (
              <div key={u.id} style={s.userCard}>
                <div style={s.userTop}>
                  <div style={s.avatarWrap}>
                    {u.avatar?.startsWith('http')
                      ? <img src={u.avatar} alt={u.name} style={s.avatar} />
                      : <span style={s.avatarFallback}>{u.name?.[0] || '?'}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.userName}>{u.name}</div>
                    <div style={{ ...s.statusBadge, background: status.color + '22', color: status.color, border: `1px solid ${status.color}44` }}>
                      {status.label}
                    </div>
                  </div>
                  <div style={s.pointsBig}>{pts}</div>
                </div>
                <div style={s.userActions}>
                  <button style={s.btnPt} onClick={() => adjustPoints(u.id, u.name, -1)} disabled={pts === 0}>
                    − Point
                  </button>
                  <button style={{ ...s.btnPt, background: 'rgba(124,58,237,0.3)', borderColor: 'rgba(124,58,237,0.5)' }} onClick={() => adjustPoints(u.id, u.name, 1)}>
                    + Point
                  </button>
                  {punishDue && (
                    <button style={{ ...s.btnPt, background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }} onClick={() => resetPunishment(u.id, u.name)}>
                      ✅ Clear Punishment
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Accusations ── */}
        <h2 style={{ ...s.sectionTitle, marginTop: 40 }}>📸 All Accusations</h2>
        {accusations.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>No accusations yet.</p>
        )}
        <div style={s.accusationList}>
          {accusations.map((a) => {
            const accused = users.find((u) => u.id === a.accusedUid);
            const submitter = users.find((u) => u.id === a.submittedBy);
            const statusColors = { confirmed: '#22c55e', rejected: '#ef4444', pending: '#f97316' };
            const sc = statusColors[a.status] || '#888';
            return (
              <div key={a.id} style={s.accCard}>
                {a.photoUrl && (
                  <img src={a.photoUrl} alt="Evidence" style={s.accPhoto} loading="lazy" />
                )}
                <div style={s.accInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={s.accName}>{accused?.name || 'Unknown'}</span>
                    <span style={{ ...s.accBadge, background: sc + '22', color: sc, border: `1px solid ${sc}44` }}>
                      {a.status}
                    </span>
                  </div>
                  <span style={s.accMeta}>By {submitter?.name || 'Unknown'}</span>
                  {a.note && <span style={s.accNote}>"{a.note}"</span>}
                  {a.appeal && <span style={{ ...s.accNote, color: '#a855f7' }}>🛡️ Appeal: "{a.appeal}"</span>}
                  <span style={s.accMeta}>
                    👍 {a.voteCount?.yes || 0} yes · 👎 {a.voteCount?.no || 0} no
                  </span>
                  <span style={s.accMeta}>
                    {a.createdAt ? new Date(a.createdAt).toLocaleString('en-IE') : ''}
                  </span>
                </div>
                <button style={s.deleteBtn} onClick={() => setConfirmDelete(a.id)}>
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#0d0d1a',
    position: 'relative',
    overflow: 'hidden',
    paddingBottom: 60,
  },
  glow1: {
    position: 'fixed', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
    top: -100, right: -100, pointerEvents: 'none', zIndex: 0,
  },
  glow2: {
    position: 'fixed', width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)',
    bottom: -50, left: -50, pointerEvents: 'none', zIndex: 0,
  },
  toast: {
    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    color: '#fff', padding: '12px 24px', borderRadius: 12, fontWeight: 700,
    fontSize: 14, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    whiteSpace: 'nowrap',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: {
    maxWidth: 360, width: '100%', background: '#1a1a2e',
    border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20, padding: '32px 28px',
    textAlign: 'center', boxShadow: '0 0 40px rgba(124,58,237,0.2)',
  },
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100,
  },
  brand: { fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' },
  logoutBtn: {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: 10,
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  content: {
    maxWidth: 700, margin: '0 auto', padding: '24px 16px', position: 'relative', zIndex: 1,
  },
  sectionTitle: {
    fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 16,
    letterSpacing: '-0.02em',
  },
  grid: { display: 'flex', flexDirection: 'column', gap: 12 },
  userCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '16px',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  },
  userTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatarWrap: {
    width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
    background: 'rgba(124,58,237,0.3)', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarFallback: { fontSize: 20, fontWeight: 700, color: '#fff' },
  userName: { fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4 },
  statusBadge: { display: 'inline-block', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600 },
  pointsBig: { fontSize: 32, fontWeight: 800, color: '#fff', flexShrink: 0, minWidth: 40, textAlign: 'right' },
  userActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btnPt: {
    flex: 1, minWidth: 80, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10, background: 'rgba(255,255,255,0.07)', color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  btnDanger: {
    flex: 1, padding: '12px', border: 'none', borderRadius: 12,
    background: '#ef4444', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  btnGhost: {
    flex: 1, padding: '12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
    background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  accusationList: { display: 'flex', flexDirection: 'column', gap: 12 },
  accCard: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 14, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  },
  accPhoto: {
    width: 80, height: 80, objectFit: 'cover', borderRadius: 10, flexShrink: 0,
  },
  accInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  accName: { fontSize: 16, fontWeight: 700, color: '#fff' },
  accBadge: { display: 'inline-block', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  accMeta: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  accNote: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },
  deleteBtn: {
    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444', borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
    fontSize: 16, flexShrink: 0, alignSelf: 'center',
  },
};
