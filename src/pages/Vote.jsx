import { useContext, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, increment, collection, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';

export default function Vote() {
  const { accusationId } = useParams();
  const { user } = useContext(AuthContext);
  const [accusation, setAccusation] = useState(null);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);
  const [appealText, setAppealText] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

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
    setVoteError(null);
    try {
      const accRef = doc(db, 'accusations', accusationId);

      await runTransaction(db, async (transaction) => {
        const accSnap = await transaction.get(accRef);
        if (!accSnap.exists()) throw new Error('Accusation not found');
        const data = accSnap.data();

        // Guard: accused cannot vote
        if (data.accusedUid === user.uid) throw new Error('Accused cannot vote');
        // Guard: already voted
        if (data.votes?.[user.uid] !== undefined) throw new Error('Already voted');
        // Guard: already resolved
        if (data.status !== 'pending') throw new Error('Accusation already resolved');

        const votes = { ...(data.votes || {}), [user.uid]: vote };

        let yes = 0;
        let no = 0;
        for (const v of Object.values(votes)) {
          if (v === true) yes++;
          else no++;
        }

        // Early resolution: 3 yes = confirmed, 2 no = impossible to reach 3 yes
        let newStatus = data.status;
        if (yes >= 3) {
          newStatus = 'confirmed';
        } else if (no >= 2) {
          newStatus = 'rejected';
        }

        transaction.update(accRef, {
          [`votes.${user.uid}`]: vote,
          voteCount: { yes, no },
          status: newStatus,
        });

        if (newStatus === 'confirmed' && data.status !== 'confirmed') {
          const userRef = doc(db, 'users', data.accusedUid);
          transaction.update(userRef, {
            points: increment(1),
          });
        }
      });
    } catch (err) {
      console.error('Vote failed:', err);
      setVoteError(err.message || 'Vote failed. Please try again.');
    } finally {
      setVoting(false);
    }
  };

  const handleAppeal = async () => {
    if (submittingAppeal || !appealText.trim()) return;
    setSubmittingAppeal(true);
    try {
      await updateDoc(doc(db, 'accusations', accusationId), { appeal: appealText.trim() });
    } catch (err) {
      console.error('Appeal failed:', err);
      setVoteError(err.message || 'Failed to submit defense.');
    } finally {
      setSubmittingAppeal(false);
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
          <img src={accusation.photoUrl} alt="Evidence" loading="eager" style={s.photo} />
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
        {voteError && (
          <div style={s.errorBox}>{voteError}</div>
        )}
        <div style={s.voteSection}>
          {isAccused ? (
            <div style={s.infoBox} className="card">
              <p style={s.infoText}>You are the accused — you cannot vote</p>
              <TallyBar tally={tally} yesPercent={yesPercent} />
              {accusation.status === 'pending' && (
                accusation.appeal ? (
                  <div style={s.appealCardGreen}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#22c55e' }}>🛡️ Your defense has been submitted</p>
                    <p style={{ margin: '8px 0 0', color: '#a0a0b0', fontStyle: 'italic' }}>"{accusation.appeal}"</p>
                  </div>
                ) : (
                  <div style={{ marginTop: '16px' }}>
                    <textarea
                      value={appealText}
                      onChange={(e) => setAppealText(e.target.value.slice(0, 300))}
                      placeholder="Tell your side of the story..."
                      maxLength={300}
                      style={s.appealTextarea}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ color: '#6b6b80', fontSize: '0.8rem' }}>{appealText.length}/300</span>
                      <button
                        onClick={handleAppeal}
                        disabled={submittingAppeal || !appealText.trim()}
                        style={{
                          ...s.btnAppeal,
                          opacity: submittingAppeal || !appealText.trim() ? 0.5 : 1,
                        }}
                      >
                        Submit My Defense 🛡️
                      </button>
                    </div>
                  </div>
                )
              )}
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
              {accusation.appeal && (
                <div style={s.appealCardGreen}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#22c55e' }}>🛡️ Defense from {accusedName}:</p>
                  <p style={{ margin: '8px 0 0', color: '#a0a0b0', fontStyle: 'italic' }}>"{accusation.appeal}"</p>
                </div>
              )}
            </div>
          ) : (
            <>
            {accusation.appeal && (
              <div style={s.appealCardGreen}>
                <p style={{ margin: 0, fontWeight: 600, color: '#22c55e' }}>🛡️ Defense from {accusedName}:</p>
                <p style={{ margin: '8px 0 0', color: '#a0a0b0', fontStyle: 'italic' }}>"{accusation.appeal}"</p>
              </div>
            )}
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
            </>
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
  errorBox: {
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginTop: '1rem',
    textAlign: 'center',
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
  appealTextarea: {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnAppeal: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(34,197,94,0.25)',
    background: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  appealCardGreen: {
    marginTop: '16px',
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.25)',
    textAlign: 'left',
  },
};
