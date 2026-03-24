import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';

export default function History() {
  useContext(AuthContext); // ensure authenticated
  const [accusations, setAccusations] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  // Load resolved accusations
  useEffect(() => {
    const q = query(
      collection(db, 'accusations'),
      where('status', 'in', ['confirmed', 'rejected'])
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      setAccusations(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load users for name lookups
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = { id: d.id, ...d.data() }; });
      setUsers(map);
    });
    return unsub;
  }, []);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        <Link to="/dashboard" style={s.backLink}>&larr; Back to Dashboard</Link>
        <h1 style={s.title}>History</h1>

        {loading ? (
          <p style={s.emptyText}>Loading...</p>
        ) : accusations.length === 0 ? (
          <p style={s.emptyText}>No resolved accusations yet.</p>
        ) : (
          <div style={s.list}>
            {accusations.map((a) => {
              const accused = users[a.accusedUid];
              const submitter = users[a.submittedBy];
              const tally = a.voteCount || { yes: 0, no: 0 };
              const confirmed = a.status === 'confirmed';

              return (
                <div key={a.id} style={s.card}>
                  {a.photoUrl && (
                    <img src={a.photoUrl} alt="Evidence" style={s.thumb} />
                  )}
                  <div style={s.info}>
                    <div style={s.topRow}>
                      <span style={s.accusedName}>{accused?.name || 'Unknown'}</span>
                      <span style={{
                        ...s.badge,
                        background: confirmed ? '#2d5a2d' : '#5a2d2d',
                      }}>
                        {confirmed ? '✅ Confirmed' : '❌ Rejected'}
                      </span>
                    </div>
                    <p style={s.meta}>
                      by {submitter?.name || 'Unknown'} · {formatDate(a.createdAt)} · {tally.yes}Y / {tally.no}N
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  wrapper: {
    minHeight: '100vh',
    background: '#111',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: '500px',
    marginTop: '1rem',
  },
  backLink: {
    color: '#4f8cff',
    textDecoration: 'none',
    fontSize: '0.9rem',
  },
  title: {
    color: '#fff',
    fontSize: '1.5rem',
    margin: '1rem 0',
  },
  emptyText: { color: '#888', textAlign: 'center' },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  card: {
    background: '#1e1e1e',
    borderRadius: '0.75rem',
    padding: '0.75rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  thumb: {
    width: '56px',
    height: '56px',
    borderRadius: '0.5rem',
    objectFit: 'cover',
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  accusedName: {
    color: '#fff',
    fontWeight: 600,
    fontSize: '1rem',
  },
  badge: {
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.2rem 0.5rem',
    borderRadius: '0.25rem',
    whiteSpace: 'nowrap',
  },
  meta: {
    color: '#888',
    fontSize: '0.8rem',
    margin: '0.25rem 0 0',
  },
};
