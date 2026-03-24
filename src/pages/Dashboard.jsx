import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { user, firestoreUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [accusations, setAccusations] = useState([]);

  // Real-time leaderboard
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.points || 0) - (a.points || 0));
      setUsers(list);
    });
    return unsub;
  }, []);

  // Real-time pending accusations
  useEffect(() => {
    const q = query(collection(db, 'accusations'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      setAccusations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const handlePunishmentDone = async (uid) => {
    await updateDoc(doc(db, 'users', uid), { points: 0 });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStatus = (points) => {
    if (points >= 3) return { emoji: '🚨', color: '#ff4444', label: 'PUNISHMENT' };
    if (points === 2) return { emoji: '⚠️', color: '#ff9900', label: 'Getting messy...' };
    return { emoji: '✅', color: '#44cc44', label: 'Clean' };
  };

  // Accusations the current user can vote on
  const voteable = accusations.filter((a) => {
    if (a.accusedUid === user.uid) return false;
    if (a.votes && a.votes[user.uid] !== undefined) return false;
    return true;
  });

  // Accusations where the current user is the accused
  const againstMe = accusations.filter((a) => a.accusedUid === user.uid);

  const punished = users.filter((u) => (u.points || 0) >= 3);

  return (
    <div className="dashboard">
      {/* Navbar */}
      <nav className="navbar">
        <span className="navbar-brand">🧹 Spring Cleaning</span>
        <div className="navbar-links">
          <Link to="/accuse">New Accusation</Link>
          <Link to="/history">History</Link>
          <button onClick={handleLogout} className="btn-link">Logout</button>
        </div>
      </nav>

      {/* Punishment banners */}
      {punished.map((u) => (
        <div key={u.id} className="punishment-banner">
          <span>🚨 {u.name} must clean the house! 🚨</span>
          <button onClick={() => handlePunishmentDone(u.id)} className="btn-done">
            Punishment Complete ✓
          </button>
        </div>
      ))}

      {/* Leaderboard */}
      <h2 className="section-title">Leaderboard</h2>
      <div className="leaderboard">
        {users.map((u) => {
          const pts = u.points || 0;
          const status = getStatus(pts);
          return (
            <div
              key={u.id}
              className="leaderboard-card"
              style={{ borderLeft: `4px solid ${status.color}` }}
            >
              <div className="card-avatar">{u.avatar || u.name?.[0] || '?'}</div>
              <div className="card-info">
                <span className="card-name">{u.name}</span>
                <span className="card-status" style={{ color: status.color }}>
                  {status.emoji} {pts} pt{pts !== 1 ? 's' : ''} — {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accusations against me */}
      {againstMe.length > 0 && (
        <>
          <h2 className="section-title" style={{ color: '#ff4444' }}>⚠️ You've Been Accused!</h2>
          <div className="accusations-list">
            {againstMe.map((a) => {
              const submitter = users.find((u) => u.id === a.submittedBy);
              const yesVotes = a.voteCount?.yes || 0;
              const noVotes = a.voteCount?.no || 0;
              return (
                <div key={a.id} className="accusation-card" style={{ borderLeft: '4px solid #ff4444' }}>
                  {a.photoUrl && (
                    <img src={a.photoUrl} alt="Evidence" className="accusation-thumb" />
                  )}
                  <div className="accusation-info">
                    <span className="accusation-name">Reported by {submitter?.name || 'Unknown'}</span>
                    {a.note && <span className="accusation-note">"{a.note}"</span>}
                    <span className="accusation-note">Votes: {yesVotes} yes / {noVotes} no</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pending accusations */}
      <h2 className="section-title">Pending Accusations</h2>
      {voteable.length === 0 ? (
        <p className="empty-text">No accusations to vote on right now.</p>
      ) : (
        <div className="accusations-list">
          {voteable.map((a) => {
            const accused = users.find((u) => u.id === a.accusedUid);
            return (
              <div key={a.id} className="accusation-card">
                {a.photoUrl && (
                  <img src={a.photoUrl} alt="Evidence" className="accusation-thumb" />
                )}
                <div className="accusation-info">
                  <span className="accusation-name">
                    {accused?.name || 'Unknown'} accused
                  </span>
                  {a.note && <span className="accusation-note">{a.note}</span>}
                </div>
                <Link to={`/vote/${a.id}`} className="btn-vote">Vote Now</Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
