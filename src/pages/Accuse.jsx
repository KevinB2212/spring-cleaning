import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';

export default function Accuse() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [accusedUid, setAccusedUid] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDocs(collection(db, 'users')).then((snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== user.uid);
      setUsers(list);
    });
  }, [user.uid]);

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!photo || !accusedUid) return;

    setSubmitting(true);
    setError(null);

    try {
      const path = `accusations/${Date.now()}_${photo.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, photo);
      const photoUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'accusations'), {
        submittedBy: user.uid,
        accusedUid,
        photoUrl,
        note: note.trim(),
        createdAt: serverTimestamp(),
        status: 'pending',
        votes: {},
        voteCount: { yes: 0, no: 0 },
      });

      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Upload failed. Please try again.');
      setSubmitting(false);
    }
  }

  const canSubmit = photo && accusedUid && !submitting;

  return (
    <div style={styles.wrapper}>
      <div style={styles.container} className="fade-in">
        <button onClick={() => navigate('/dashboard')} style={styles.back}>
          ← Back
        </button>

        <h1 style={styles.title}>
          <span className="text-gradient">New Accusation</span>
        </h1>
        <p style={styles.subtitle}>Submit photo evidence of the mess</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            style={{ display: 'none' }}
          />

          {preview ? (
            <div style={styles.previewWrap}>
              <img src={preview} alt="Preview" style={styles.preview} />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                style={styles.changeBtn}
              >
                Change photo
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              style={styles.uploadArea}
            >
              <span style={styles.uploadIcon}>📸</span>
              <span style={styles.uploadText}>Tap to upload photo</span>
              <span style={styles.uploadHint}>Required evidence</span>
            </button>
          )}

          {/* Person selector - horizontal chips */}
          <div>
            <label style={styles.label}>Who made this mess?</label>
            <div style={styles.chipScroll}>
              {users.map((u) => {
                const selected = accusedUid === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setAccusedUid(u.id)}
                    style={{
                      ...styles.chip,
                      ...(selected ? styles.chipSelected : {}),
                    }}
                  >
                    <span style={{
                      ...styles.chipAvatar,
                      ...(selected ? styles.chipAvatarSelected : {}),
                    }}>
                      {u.avatar?.startsWith('http') ? <img src={u.avatar} alt={u.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} /> : (u.name?.[0] || '?')}
                    </span>
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <div style={styles.labelRow}>
              <label style={styles.label}>Note</label>
              <span style={styles.charCount}>{note.length}/200</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => e.target.value.length <= 200 && setNote(e.target.value)}
              placeholder="Describe the mess..."
              rows={3}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btn-primary"
            style={{
              ...styles.submitBtn,
              opacity: canSubmit ? 1 : 0.4,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Accusation'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: '1rem',
  },
  container: {
    width: '100%',
    maxWidth: '480px',
    marginTop: '1.5rem',
  },
  back: {
    background: 'none',
    border: 'none',
    color: '#6b6b80',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '1rem',
    transition: 'color 0.2s ease',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  subtitle: {
    color: '#6b6b80',
    fontSize: '0.9rem',
    margin: '0.25rem 0 1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '3rem 1rem',
    minHeight: '140px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '2px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    color: '#fff',
  },
  uploadIcon: {
    fontSize: '2rem',
  },
  uploadText: {
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  uploadHint: {
    fontSize: '0.8rem',
    color: '#6b6b80',
  },
  previewWrap: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    maxHeight: '300px',
    objectFit: 'cover',
    display: 'block',
    borderRadius: '16px',
  },
  changeBtn: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '100px',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: '#8b8ba0',
    letterSpacing: '0.02em',
    display: 'block',
    marginBottom: '8px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#6b6b80',
  },
  chipScroll: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
    WebkitOverflowScrolling: 'touch',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    minHeight: '44px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '100px',
    color: '#a0a0b0',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  chipSelected: {
    background: 'rgba(124, 58, 237, 0.15)',
    borderColor: 'rgba(124, 58, 237, 0.4)',
    color: '#c4b5fd',
  },
  chipAvatar: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  chipAvatarSelected: {
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff',
  },
  error: {
    color: '#ef4444',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    fontSize: '1rem',
    borderRadius: '12px',
    marginTop: '0.5rem',
  },
};
