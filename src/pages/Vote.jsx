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

  // Real-time accusation listener
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

  // Load all users for name lookups
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

      // Recalculate tally
      let yes = 0;
      let no = 0;
      for (const v of Object.values(votes)) {
        if (v === true) yes++;
        else no++;
      }

      // All users except accused = 4 eligible voters
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

      // If confirmed, increment accused user's points
      if (newStatus === 'confirmed' && data.status !== 'confirmed') {
        await updateDoc(doc(db, 'users', data.accusedUid), {
          points: increment(1),
        });
      }
    } finally {
      setVoting(false);
    }
  };

  if (loading) return <div style={s.wrapper}><p style={s.loadingText}>Loading...</p></div>;
  if (!accusation) return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <p style={s.loadingText}>Accusation not found.</p>
        <Link to="/dashboard" style={s.backLink}>Back to Dashboard</Link>
      </div>
    </div>
  );

  const isAccused = accusation.accusedUid === user.uid;
  const hasVoted = accusation.votes && accusation.votes[user.uid] !== undefined;
  const myVote = hasVoted ? accusation.votes[user.uid] : null;
  const tally = accusation.voteCount || { yes: 0, no: 0 };
  const accusedName = users[accusation.accusedUid]?.name || 'Unknown';
  const submitterName = users[accusation.submittedBy]?.name || 'Unknown';
  const isResolved = accusation.status === 'confirmed' || accusation.status === 'rejected';

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <Link to="/dashboard" style={s.backLink}>&larr; Back to Dashboard</Link>

        {/* Result banner */}
        {isResolved && (
          <div style={{
            ...s.banner,
            background: accusation.status === 'confirmed' ? '#2d5a2d' : '#5a2d2d',
          }}>
            {accusation.status === 'confirmed'
              ? '✅ Confirmed — point added!'
              : '❌ Rejected — no point given'}
          </div>
        )}

        {/* Evidence photo */}
        {accusation.photoUrl && (
          <img src={accusation.photoUrl} alt="Evidence" style={s.photo} />
        )}

        {/* Details */}
        <div style={s.details}>
          <h2 style={s.accusedName}>{accusedName} accused</h2>
          <p style={s.meta}>Submitted by {submitterName}</p>
          {accusation.note && <p style={s.note}>"{accusation.note}"</p>}
        </div>

        {/* Voting section */}
        <div style={s.voteSection}>
          {isAccused ? (
            <div style={s.infoBox}>
              <p style={s.infoText}>You are accused — you cannot vote</p>
              <Tally tally={tally} />
            </div>
          ) : hasVoted || isResolved ? (
            <div style={s.infoBox}>
              {hasVoted && (
                <p style={s.infoText}>
                  You voted: {myVote ? '✅ Yes' : '❌ No'}
                </p>
              )}
              <Tally tally={tally} />
            </div>
          ) : (
            <div style={s.buttons}>
              <button
                onClick={() => handleVote(true)}
                disabled={voting}
                style={{ ...s.btn, ...s.btnYes }}
              >
                ✅ YES
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voting}
                style={{ ...s.btn, ...s.btnNo }}
              >
                ❌ NO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tally({ tally }) {
  return (
    <div style={s.tally}>
      <span style={s.tallyYes}>Yes: {tally.yes}</span>
      <span style={s.tallyNo}>No: {tally.no}</span>
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
  card: {
    background: '#1e1e1e',
    borderRadius: '1rem',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '500px',
    alignSelf: 'flex-start',
    marginTop: '2rem',
  },
  loadingText: { color: '#888', textAlign: 'center' },
  backLink: {
    color: '#4f8cff',
    textDecoration: 'none',
    fontSize: '0.9rem',
    display: 'inline-block',
    marginBottom: '1rem',
  },
  banner: {
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    color: '#fff',
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: '1rem',
    fontSize: '1.1rem',
  },
  photo: {
    width: '100%',
    borderRadius: '0.75rem',
    maxHeight: '400px',
    objectFit: 'cover',
  },
  details: { marginTop: '1rem' },
  accusedName: {
    color: '#fff',
    margin: '0 0 0.25rem',
    fontSize: '1.4rem',
  },
  meta: { color: '#888', fontSize: '0.85rem', margin: 0 },
  note: {
    color: '#bbb',
    fontStyle: 'italic',
    margin: '0.75rem 0 0',
    fontSize: '0.95rem',
  },
  voteSection: { marginTop: '1.5rem' },
  infoBox: {
    background: '#2a2a2a',
    borderRadius: '0.5rem',
    padding: '1rem',
    textAlign: 'center',
  },
  infoText: { color: '#ccc', margin: '0 0 0.75rem', fontSize: '1rem' },
  buttons: {
    display: 'flex',
    gap: '1rem',
  },
  btn: {
    flex: 1,
    padding: '1.25rem',
    borderRadius: '0.75rem',
    border: 'none',
    color: '#fff',
    fontSize: '1.3rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnYes: { background: '#22a822' },
  btnNo: { background: '#dd3333' },
  tally: {
    display: 'flex',
    justifyContent: 'center',
    gap: '2rem',
    marginTop: '0.5rem',
  },
  tallyYes: { color: '#44cc44', fontWeight: 600, fontSize: '1.1rem' },
  tallyNo: { color: '#ff6666', fontWeight: 600, fontSize: '1.1rem' },
};
