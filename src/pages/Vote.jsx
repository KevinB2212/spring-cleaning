import { useContext, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, getDoc, increment, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';

export default function Vote() {
  const { accusationId } = useParams();
  const { user } = useContext(AuthContext);
  const [accusation, setAccusation] = useState(null);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'accusations', accusationId), (snap) => {
      if (snap.exists()) {
        setAccusation({ id: snap.id, ...snap.data() });
      } else {
        setAccusation(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [accusationId]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = { id: d.id, ...d.data() }; });
      setUsers(map);
    });
    return unsub;
  }, []);

  const handleVote = async (vote) => {
    if (voting) return;
    setVoting(true);
    try {
      const accRef = doc(db, 'accusations', accusationId);
      const accSnap = await getDoc(accRef);
      const data = accSnap.data();
      const votes = { ...(data.votes || {}), [user.uid]: vote };

      let yes = 0;
      let no = 0;
      for (const v of Object.values(votes)) {
        if (v === true) yes++;
        else no++;
      }

      const allVotersVoted = (yes + no) >= 4;
      let newStatus = data.status;
      if (allVotersVoted) {
        newStatus = yes >= 3 ? 'confirmed' : 'rejected';
      }

      const updates = {
        [`votes.${user.uid}`]: vote,
        voteCount: { yes, no },
        status: newStatus,
      };

      await updateDoc(accRef, updates);

      if (newStatus === 'confirmed' && data.status !== 'confirmed') {
        await updateDoc(doc(db, 'users', data.accusedUid), {
          points: increment(1),
        });
      }
    } finally {
      setVoting(false);
    }
  };

  if (loading) return (
    <div style={s.wrapper}>
      <div className="loading" />
    </div>
  );

  if (!accusation) return (
    <div style={s.wrapper}>
      <div style={s.card} className="card fade-in">
        <p style={s.emptyText}>Accusation not found.</p>
        <Link to="/dashboard" className="btn btn-ghost" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );

  const isAccused = accusation.accusedUid === user.uid;
  const hasVoted = accusation.votes && accusation.votes[user.uid] !== undefined;
  const myVote = hasVoted ? accusation.votes[user.uid] : null;
  const tally = accusation.voteCount || { yes: 0, no: 0 };
  const totalVotes = tally.yes + tally.no;
  const yesPercent = totalVotes > 0 ? (tally.yes / totalVotes) * 100 : 50;
  const accusedUser = users[accusation.accusedUid];
  const accusedName = accusedUser?.name || 'Unknown';
  const submitterName = users[accusation.submittedBy]?.name || 'Unknown';
  const isResolved = accusation.status === 'confirmed' || accusation.status === 'rejected';

  return (
    <div style={s.wrapper}>
      <div style={s.container} className="fade-in">
        <Link to="/dashboard" style={s.backLink}>← Back</Link>

        {/* Result banner */}
        {isResolved && (
          <div style={{
            ...s.banner,
            ...(accusation.status === 'confirmed' ? s.bannerConfirmed : s.bannerRejected),
          }}>
            {accusation.status === 'confirmed'
              ? '✅ Confirmed — point added!'
              : '❌ Rejected — not guilty'}
          </div>
        )}

        {/* Evidence photo */}
        {accusation.photoUrl && (
          <img src={accusation.photoUrl} alt="Evidence" style={s.photo} />
        )}

        {/* Accused person */}
        <div style={s.accusedSection}>
          <div className="avatar avatar-lg">
            {accusedUser?.avatar?.startsWith('http') ? <img src={accusedUser.avatar} alt={accusedName} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} /> : accusedName[0]}
          </div>
          <div>
            <h2 style={s.accusedName}>{accusedName}</h2>
            <p style={s.accusedLabel}>is accused</p>
          </div>
        </div>

        <p style={s.meta}>Submitted by {submitterName}</p>
        {accusation.note && <p style={s.note}>"{accusation.note}"</p>}

        {/* Vote section */}
        <div style={s.voteSection}>
          {isAccused ? (
            <div style={s.infoBox} className="card">
              <p style={s.infoText}>You are the accused — you cannot vote</p>
              <TallyBar tally={tally} yesPercent={yesPercent} />
            </div>
          ) : hasVoted || isResolved ? (
            <div style={s.infoBox} className="card">
              {hasVoted && (
                <p style={s.infoText}>
                  You voted: <span style={{ color: myVote ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                    {myVote ? 'Yes' : 'No'}
                  </span>
                </p>
              )}
              <TallyBar tally={tally} yesPercent={yesPercent} />
            </div>
          ) : (
            <div style={s.buttons}>
              <button
                onClick={() => handleVote(true)}
                disabled={voting}
                style={s.btnYes}
              >
                <span style={s.voteEmoji}>✅</span>
                YES
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voting}
                style={s.btnNo}
              >
                <span style={s.voteEmoji}>❌</span>
                NO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TallyBar({ tally, yesPercent }) {
  return (
    <div style={tb.wrapper}>
      <div style={tb.labels}>
        <span style={tb.yes}>Yes {tally.yes}</span>
        <span style={tb.no}>No {tally.no}</span>
      </div>
      <div style={tb.track}>
        <div style={{
          ...tb.fillYes,
          width: `${yesPercent}%`,
        }} />
        <div style={{
          ...tb.fillNo,
          width: `${100 - yesPercent}%`,
        }} />
      </div>
    </div>
  );
}

const tb = {
  wrapper: { marginTop: '12px' },
  labels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  yes: { color: '#22c55e' },
  no: { color: '#ef4444' },
  track: {
    display: 'flex',
    height: '8px',
    borderRadius: '100px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.05)',
    gap: '2px',
  },
  fillYes: {
    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
    borderRadius: '100px 0 0 100px',
    transition: 'width 0.4s ease',
    minWidth: '4px',
  },
  fillNo: {
    background: 'linear-gradient(90deg, #dc2626, #ef4444)',
    borderRadius: '0 100px 100px 0',
    transition: 'width 0.4s ease',
    minWidth: '4px',
  },
};

const s = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: '1rem',
  },
  container: {
    width: '100%',
    maxWidth: '500px',
    marginTop: '1.5rem',
  },
  card: {
    textAlign: 'center',
    padding: '2rem',
  },
  emptyText: {
    color: '#6b6b80',
    fontSize: '0.95rem',
    textAlign: 'center',
  },
  backLink: {
    color: '#6b6b80',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    display: 'inline-block',
    marginBottom: '1.5rem',
    transition: 'color 0.2s ease',
  },
  banner: {
    padding: '14px 20px',
    borderRadius: '12px',
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: '1rem',
    fontSize: '0.95rem',
  },
  bannerConfirmed: {
    background: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    color: '#22c55e',
  },
  bannerRejected: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#ef4444',
  },
  photo: {
    width: '100%',
    borderRadius: '16px',
    maxHeight: '400px',
    objectFit: 'cover',
    display: 'block',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  accusedSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginTop: '1.25rem',
  },
  accusedName: {
    color: '#fff',
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  accusedLabel: {
    color: '#6b6b80',
    margin: 0,
    fontSize: '0.85rem',
  },
  meta: {
    color: '#6b6b80',
    fontSize: '0.85rem',
    margin: '1rem 0 0',
  },
  note: {
    color: '#a0a0b0',
    fontStyle: 'italic',
    margin: '0.5rem 0 0',
    fontSize: '0.9rem',
  },
  voteSection: { marginTop: '1.5rem' },
  infoBox: {
    textAlign: 'center',
    padding: '20px',
  },
  infoText: {
    color: '#a0a0b0',
    margin: 0,
    fontSize: '0.95rem',
  },
  buttons: {
    display: 'flex',
    gap: '12px',
  },
  btnYes: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    background: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    fontSize: '1.1rem',
    fontFamily: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 0 20px rgba(34, 197, 94, 0.1)',
  },
  btnNo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    fontSize: '1.1rem',
    fontFamily: 'inherit',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 0 20px rgba(239, 68, 68, 0.1)',
  },
  voteEmoji: {
    fontSize: '1.5rem',
  },
};
