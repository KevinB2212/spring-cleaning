import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/Dashboard.css';

export default function Notices() {
  const { user, logout } = useContext(AuthContext);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="dashboard">
      <ThemeToggle />
      <nav className="navbar">
        <span className="navbar-brand">
          <span>🧹</span>
          <span className="text-gradient">Spring Cleaning</span>
        </span>
        <div className="navbar-links">
          <Link to="/dashboard">Home</Link>
          <Link to="/accuse">Accuse</Link>
          <Link to="/history">History</Link>
          <button onClick={logout} className="btn-link">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content fade-in">
        <h2 className="section-title">All Notices</h2>
        {loading ? (
          <p className="empty-text">Loading...</p>
        ) : notices.length === 0 ? (
          <p className="empty-text">No notices yet.</p>
        ) : (
          <div className="notices-list">
            {notices.map((n) => {
              const seen = n.seenBy && n.seenBy[user.uid];
              return (
                <div key={n.id} className={`notice-card${seen ? ' notice-seen' : ''}`}>
                  <div className="notice-text">{n.text}</div>
                  <div className="notice-meta">
                    {n.authorName} · {formatDate(n.createdAt)}
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
