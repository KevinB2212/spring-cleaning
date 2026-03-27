import { useContext, useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';
import { SkeletonCard } from '../components/Skeleton';
import ThemeToggle from '../components/ThemeToggle';
import ImageModal from '../components/ImageModal';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { user, firestoreUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [accusations, setAccusations] = useState([]);
  const [showVoteModal, setShowVoteModal] = useState(true);
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [notices, setNotices] = useState([]);
  const [noticeText, setNoticeText] = useState('');
  const [noticePhoto, setNoticePhoto] = useState(null);
  const [noticePreview, setNoticePreview] = useState(null);
  const [submittingNotice, setSubmittingNotice] = useState(false);
  const noticeFileRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.name);
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

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const unseenNotices = notices.filter((n) => !n.seenBy || !n.seenBy[user.uid]);

  const handleDismissNotice = async (noticeId) => {
    try {
      await updateDoc(doc(db, 'notices', noticeId), {
        [`seenBy.${user.uid}`]: true,
      });
    } catch (err) {
      console.error('Failed to dismiss notice:', err);
    }
  };

  function compressImage(file, maxWidth = 1200, quality = 0.75) {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
      };
      img.src = url;
    });
  }

  const handleNoticePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (noticePreview) URL.revokeObjectURL(noticePreview);
    const compressed = await compressImage(file);
    setNoticePhoto(compressed);
    setNoticePreview(URL.createObjectURL(compressed));
  };

  const clearNoticePhoto = () => {
    if (noticePreview) URL.revokeObjectURL(noticePreview);
    setNoticePhoto(null);
    setNoticePreview(null);
    if (noticeFileRef.current) noticeFileRef.current.value = '';
  };

  const handleSubmitNotice = async (e) => {
    e.preventDefault();
    const text = noticeText.trim();
    if (!text && !noticePhoto) return;
    setSubmittingNotice(true);
    try {
      let photoUrl = null;
      if (noticePhoto) {
        const path = `notices/${Date.now()}_${noticePhoto.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, noticePhoto);
        photoUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, 'notices'), {
        text: text || '',
        authorUid: user.uid,
        authorName: firestoreUser?.name || 'Unknown',
        createdAt: serverTimestamp(),
        seenBy: {},
        ...(photoUrl ? { photoUrl } : {}),
      });
      setNoticeText('');
      clearNoticePhoto();
    } catch (err) {
      console.error('Failed to submit notice:', err);
    }
    setSubmittingNotice(false);
  };

  const handlePunishmentDone = async (uid) => {
    try {
      await updateDoc(doc(db, 'users', uid), { punishmentsServed: increment(1) });
    } catch (err) {
      console.error('Failed to mark punishment served:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStatus = (points, punishmentsServed = 0) => {
    const punishmentDue = Math.floor(points / 3) > punishmentsServed;
    if (punishmentDue) return { label: '🚨 PUNISHMENT DUE', color: '#ef4444' };
    const cycle = points % 3; // 0=green, 1=green, 2=orange
    if (cycle === 2) return { label: '⚠️ Getting close!', color: '#f97316' };
    return { label: points === 0 ? '✅ Clean' : '✅ All good', color: '#22c55e' };
  };

  const voteable = accusations.filter((a) => {
    if (a.accusedUid === user.uid) return false;
    if (a.votes && a.votes[user.uid] !== undefined) return false;
    return true;
  });

  const againstMe = accusations.filter((a) => a.accusedUid === user.uid);
  const punished = users.filter((u) => Math.floor((u.points || 0) / 3) > (u.punishmentsServed || 0));

  // Clamp index to valid range when voteable list shrinks
  const safeIndex = voteable.length > 0 ? Math.min(currentVoteIndex, voteable.length - 1) : 0;
  const currentVoteable = voteable[safeIndex];
  const voteModalVisible = showVoteModal && voteable.length > 0 && currentVoteable;

  const modalOverlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    zIndex: 1000, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 20,
  };
  const modalCardStyle = {
    maxWidth: 400, width: '100%', background: '#1a1a2e',
    border: '1px solid rgba(124,58,237,0.3)', borderRadius: 20,
    overflow: 'hidden', boxShadow: '0 0 40px rgba(124,58,237,0.2)',
    position: 'relative',
  };
  const modalHeaderStyle = {
    background: 'linear-gradient(135deg, #dc2626, #ea580c)',
    padding: '16px 20px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', fontWeight: 700, fontSize: 18, color: '#fff',
  };
  const modalBtnStyle = (bg) => ({
    flex: 1, padding: '14px 12px', border: 'none', borderRadius: 12,
    fontSize: 16, fontWeight: 700, cursor: 'pointer', color: '#fff',
    background: bg, minHeight: 44, minWidth: 44,
  });
  const closeStyle = {
    position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.15)',
    border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32,
    fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1,
  };

  return (
    <div className="dashboard">
      <ThemeToggle />
      {voteModalVisible && (() => {
        const accused = users.find((u) => u.id === currentVoteable.accusedUid);
        const submitter = users.find((u) => u.id === currentVoteable.submittedBy);
        return (
          <div style={modalOverlayStyle} onClick={() => setShowVoteModal(false)}>
            <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
              <button style={closeStyle} onClick={() => setShowVoteModal(false)}>✕</button>
              <div style={modalHeaderStyle}>
                <span>⚠️ Vote Required</span>
                <span style={{
                  background: 'rgba(0,0,0,0.3)', borderRadius: 20,
                  padding: '4px 12px', fontSize: 13, fontWeight: 600,
                }}>{safeIndex + 1} of {voteable.length}</span>
              </div>
              {currentVoteable.photoUrl && (
                <ImageModal src={currentVoteable.photoUrl} alt="Evidence">
                  <img
                    src={currentVoteable.photoUrl} alt="Evidence" loading="lazy"
                    style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                  />
                </ImageModal>
              )}
              <div style={{ padding: '20px 20px 24px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                  {accused?.name || 'Unknown'}
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  Reported by {submitter?.name || 'Unknown'}
                </div>
                {currentVoteable.note && (
                  <div style={{
                    fontSize: 14, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic',
                    marginBottom: 16, padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                  }}>"{currentVoteable.note}"</div>
                )}
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    style={modalBtnStyle('linear-gradient(135deg, #7c3aed, #6d28d9)')}
                    onClick={() => { setShowVoteModal(false); navigate(`/vote/${currentVoteable.id}`); }}
                  >Vote Now 🗳️</button>
                  <button
                    style={modalBtnStyle('rgba(255,255,255,0.1)')}
                    onClick={() => {
                      if (safeIndex < voteable.length - 1) {
                        setCurrentVoteIndex(safeIndex + 1);
                      } else {
                        setShowVoteModal(false);
                      }
                    }}
                  >Skip for now</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <nav className="navbar">
        <span className="navbar-brand">
          <span>🧹</span>
          <span className="text-gradient">Spring Cleaning</span>
          {voteable.length > 0 && (
            <span style={{
              background: '#dc2626', color: '#fff', borderRadius: '50%',
              width: 22, height: 22, display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 700, marginLeft: 6,
              animation: 'pulse 2s infinite',
            }}>{voteable.length}</span>
          )}
        </span>
        <div className="navbar-links">
          <Link to="/accuse">Accuse</Link>
          <Link to="/notices">Notices{unseenNotices.length > 0 ? ` (${unseenNotices.length})` : ''}</Link>
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

        {/* Notice input */}
        <form className="notice-input-form" onSubmit={handleSubmitNotice}>
          <input
            ref={noticeFileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleNoticePhoto}
            style={{ display: 'none' }}
          />
          {noticePreview && (
            <div className="notice-preview-wrap">
              <img src={noticePreview} alt="Preview" className="notice-preview-img" />
              <button type="button" className="notice-preview-remove" onClick={clearNoticePhoto}>✕</button>
            </div>
          )}
          <div className="notice-input-row">
            <button type="button" className="notice-photo-btn" onClick={() => noticeFileRef.current?.click()}>
              📷
            </button>
            <input
              type="text"
              className="notice-input"
              placeholder="Post a notice..."
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              maxLength={280}
            />
            <button type="submit" className="notice-send-btn" disabled={submittingNotice || (!noticeText.trim() && !noticePhoto)}>
              Send
            </button>
          </div>
        </form>

        {/* Unseen notices OR leaderboard */}
        {unseenNotices.length > 0 ? (
          <>
            <h2 className="section-title">Notices</h2>
            <div className="notices-list">
              {unseenNotices.map((n) => (
                <div key={n.id} className="notice-card notice-card-with-image">
                  {n.photoUrl && (
                    <ImageModal src={n.photoUrl} alt="Notice image">
                      <img src={n.photoUrl} alt="Notice" loading="lazy" className="notice-thumb" style={{ cursor: 'pointer' }} />
                    </ImageModal>
                  )}
                  <div className="notice-content">
                    {n.text && <div className="notice-text">{n.text}</div>}
                    <div className="notice-meta">{n.authorName}</div>
                  </div>
                  <button className="notice-dismiss" onClick={() => handleDismissNotice(n.id)}>Got it</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="section-title">Leaderboard</h2>
            {users.length === 0 ? (
              <div className="leaderboard">
                {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
            <div className="leaderboard">
              {users.map((u, idx) => {
                const pts = u.points || 0;
                const status = getStatus(pts, u.punishmentsServed || 0);
                const rank = idx + 1;
                const rankColors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
                const rankBg = rankColors[rank] || 'rgba(255,255,255,0.1)';
                const rankText = rank <= 3 ? '#000' : 'rgba(255,255,255,0.6)';
                const cardBg = rank === 1
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))'
                  : undefined;
                return (
                  <div key={u.id} className="leaderboard-card" style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    ...(cardBg ? { background: cardBg } : {}),
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: rankBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 800, color: rankText, flexShrink: 0,
                    }}>#{rank}</div>
                    <div className="avatar" style={{
                      width: 48, height: 48, minWidth: 48, minHeight: 48, borderRadius: '50%',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      {u.avatar?.startsWith('http') ? <img src={u.avatar} alt={u.name} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} /> : (u.name?.[0] || '?')}
                    </div>
                    <div className="card-info" style={{ flex: 1, minWidth: 0 }}>
                      <span className="card-name">{u.name}</span>
                      <span className="card-status">
                        <span style={{
                          background: (status.color || '#22c55e') + '22',
                          color: status.color || '#22c55e',
                          border: `1px solid ${status.color || '#22c55e'}44`,
                          borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600,
                        }}>
                          {status.label}
                        </span>
                      </span>
                    </div>
                    <div style={{
                      fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0,
                    }}>{pts}</div>
                  </div>
                );
              })}
            </div>
            )}
          </>
        )}

        {/* Accusation CTA */}
        <Link to="/accuse" style={{
          display:'block', textAlign:'center', margin:'24px auto',
          background:'linear-gradient(135deg,#7c3aed,#a855f7)',
          color:'white', borderRadius:'16px', padding:'18px',
          fontSize:'18px', fontWeight:'700', maxWidth:'340px',
          textDecoration:'none', boxShadow:'0 4px 24px rgba(124,58,237,0.4)',
        }}>🚨 Make an Accusation</Link>

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
                      <ImageModal src={a.photoUrl} alt="Evidence">
                        <img src={a.photoUrl} alt="Evidence" loading="lazy" className="accusation-thumb" style={{ cursor: 'pointer' }} />
                      </ImageModal>
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
                    <Link to={`/vote/${a.id}`} style={{
                      display:'block', textAlign:'center', marginTop:8,
                      background:'linear-gradient(135deg,#22c55e,#16a34a)',
                      color:'white', borderRadius:10, padding:'10px 16px',
                      textDecoration:'none', fontWeight:700, fontSize:14,
                      flexShrink:0
                    }}>🛡️ {a.appeal ? 'View Appeal' : 'Submit Appeal'}</Link>
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
                    <ImageModal src={a.photoUrl} alt="Evidence">
                      <img src={a.photoUrl} alt="Evidence" loading="lazy" className="accusation-thumb" style={{ cursor: 'pointer' }} />
                    </ImageModal>
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
        <div style={{textAlign:"center",padding:"12px",color:"#444",fontSize:"12px",marginTop:"32px",display:"flex",alignItems:"center",justifyContent:"center",gap:"12px"}}>
          <span>v2.5 · Spring Cleaning</span>
          <Link to="/admin" style={{color:"#333",fontSize:"11px",textDecoration:"none",padding:"3px 8px",border:"1px solid #222",borderRadius:6,letterSpacing:"0.02em"}}>⚙️</Link>
        </div>
      </div>
    </div>
  );
}
