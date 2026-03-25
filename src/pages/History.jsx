import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';
import ImageModal from '../components/ImageModal';

export default function History() {
  useContext(AuthContext);
  const [accusations, setAccusations] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

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
      <div style={s.container} className="fade-in">
        <Link to="/dashboard" style={s.backLink}>← Back</Link>
        <h1 style={s.title}>
          <span className="text-gradient">History</span>
        </h1>
        <p style={s.subtitle}>Past accusations and their verdicts</p>

        {loading ? (
          <div className="loading" />
        ) : accusations.length === 0 ? (
          <p style={s.emptyText}>No resolved accusations yet.</p>
        ) : (
          <div style={s.list}>
            {accusations.map((a, i) => {
              const accused = users[a.accusedUid];
              const submitter = users[a.submittedBy];
              const tally = a.voteCount || { yes: 0, no: 0 };
              const confirmed = a.status === 'confirmed';

              return (
                <div key={a.id}>
                  <div style={s.card}>
                    {a.photoUrl && (
                      <ImageModal src={a.photoUrl} alt="Evidence">
                        <img src={a.photoUrl} alt="Evidence" loading="lazy" style={s.thumb} />
                      </ImageModal>
                    )}
                    <div style={s.info}>
                      <div style={s.topRow}>
                        <span style={s.accusedName}>{accused?.name || 'Unknown'}</span>
                        <span
                          className={`badge ${confirmed ? 'badge-success' : 'badge-danger'}`}
                        >
                          {confirmed ? 'Confirmed' : 'Rejected'}
                        </span>
                      </div>
                      <p style={s.meta}>
                        by {submitter?.name || 'Unknown'} · {formatDate(a.createdAt)}
                      </p>
                      <p style={s.votes}>{tally.yes}Y / {tally.no}N</p>
                    </div>
                  </div>
                  {i < accusations.length - 1 && <div style={s.divider} />}
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
    display: 'flex',
    justifyContent: 'center',
    padding: '1rem',
  },
  container: {
    width: '100%',
    maxWidth: '520px',
    marginTop: '1.5rem',
  },
  backLink: {
    color: '#6b6b80',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'color 0.2s ease',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: '1rem 0 0',
  },
  subtitle: {
    color: '#6b6b80',
    fontSize: '0.9rem',
    margin: '0.25rem 0 1.5rem',
  },
  emptyText: {
    color: '#6b6b80',
    textAlign: 'center',
    padding: '2rem 0',
    fontSize: '0.9rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  card: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
    padding: '14px 0',
  },
  thumb: {
    width: '52px',
    height: '52px',
    borderRadius: '10px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  accusedName: {
    fontWeight: 600,
    fontSize: '0.95rem',
    letterSpacing: '-0.01em',
  },
  meta: {
    color: '#6b6b80',
    fontSize: '0.8rem',
    margin: '3px 0 0',
  },
  votes: {
    color: '#505068',
    fontSize: '0.75rem',
    margin: '2px 0 0',
    fontWeight: 500,
  },
  divider: {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.05)',
  },
};
