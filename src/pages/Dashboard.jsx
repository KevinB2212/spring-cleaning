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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.points || 0) - (a.points || 0));
      setUsers(list);
    });
    return unsub;
  }, []);

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
    if (points >= 3) return { label: 'PUNISHMENT', variant: 'danger' };
    if (points === 2) return { label: 'Getting messy', variant: 'warning' };
    return { label: 'Clean', variant: 'success' };
  };

  const voteable = accusations.filter((a) => {
    if (a.accusedUid === user.uid) return false;
    if (a.votes && a.votes[user.uid] !== undefined) return false;
    return true;
  });

  const againstMe = accusations.filter((a) => a.accusedUid === user.uid);
  const punished = users.filter((u) => (u.points || 0) >= 3);

  return (
    <div className="dashboard">
      <nav className="navbar">
        <span className="navbar-brand">
          <span>🧹</span>
          <span className="text-gradient">Spring Cleaning</span>
        </span>
        <div className="navbar-links">
          <Link to="/accuse">Accuse</Link>
          <Link to="/history">History</Link>
          <button onClick={handleLogout} className="btn-link">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content fade-in">
        {/* Punishment banners */}
        {punished.map((u) => (
          <div key={u.id} className="punishment-banner">
            <span>🚨 {u.name} must clean the house!</span>
            <button onClick={() => handlePunishmentDone(u.id)} className="btn-done">
              Punishment Complete
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
              <div key={u.id} className="leaderboard-card">
                <div className="avatar">
                  {u.avatar?.startsWith('http') ? <img src={u.avatar} alt={u.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} /> : (u.name?.[0] || '?')}
                </div>
                <div className="card-info">
                  <span className="card-name">{u.name}</span>
                  <span className="card-status">
                    <span className={`badge badge-${status.variant}`}>
                      {pts} pt{pts !== 1 ? 's' : ''} — {status.label}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Accusations against me */}
        {againstMe.length > 0 && (
          <>
            <h2 className="section-title" style={{ color: 'var(--danger)' }}>
              You've been accused
            </h2>
            <div className="accusations-list">
              {againstMe.map((a) => {
                const submitter = users.find((u) => u.id === a.submittedBy);
                const yesVotes = a.voteCount?.yes || 0;
                const noVotes = a.voteCount?.no || 0;
                return (
                  <div key={a.id} className="accusation-card accused-card">
                    {a.photoUrl && (
                      <img src={a.photoUrl} alt="Evidence" className="accusation-thumb" />
                    )}
                    <div className="accusation-info">
                      <span className="accusation-name">
                        Reported by {submitter?.name || 'Unknown'}
                      </span>
                      {a.note && <span className="accusation-note">"{a.note}"</span>}
                      <span className="accusation-note">
                        Votes: {yesVotes} yes / {noVotes} no
                      </span>
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
                  <Link to={`/vote/${a.id}`} className="btn-vote">Vote</Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
