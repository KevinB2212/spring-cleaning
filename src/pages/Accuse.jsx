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

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/dashboard')} style={styles.back}>
        ← Back
      </button>

      <h1 style={styles.title}>Submit Accusation</h1>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Photo upload */}
        <label style={styles.label}>Photo of the mess *</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          style={styles.uploadBtn}
        >
          {photo ? 'Change Photo' : 'Upload Photo'}
        </button>
        {preview && (
          <img src={preview} alt="Preview" style={styles.preview} />
        )}

        {/* Accused dropdown */}
        <label style={styles.label}>Who made this mess? *</label>
        <select
          value={accusedUid}
          onChange={(e) => setAccusedUid(e.target.value)}
          style={styles.select}
        >
          <option value="">Select a housemate</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.avatar ? `${u.avatar} ` : ''}{u.name}
            </option>
          ))}
        </select>

        {/* Note */}
        <label style={styles.label}>Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => e.target.value.length <= 200 && setNote(e.target.value)}
          placeholder="Describe the mess..."
          rows={3}
          style={styles.textarea}
        />
        <div style={styles.charCount}>{note.length}/200</div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          type="submit"
          disabled={submitting || !photo || !accusedUid}
          style={{
            ...styles.submit,
            opacity: submitting || !photo || !accusedUid ? 0.5 : 1,
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Accusation'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#111',
    color: '#eee',
    padding: '1rem',
    maxWidth: 480,
    margin: '0 auto',
    fontFamily: 'system-ui, sans-serif',
  },
  back: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  label: {
    fontSize: '0.875rem',
    color: '#aaa',
    marginBottom: '-0.5rem',
  },
  uploadBtn: {
    padding: '0.75rem',
    background: '#222',
    border: '2px dashed #444',
    borderRadius: 8,
    color: '#ccc',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  preview: {
    width: '100%',
    maxHeight: 300,
    objectFit: 'cover',
    borderRadius: 8,
  },
  select: {
    padding: '0.75rem',
    background: '#222',
    border: '1px solid #333',
    borderRadius: 8,
    color: '#eee',
    fontSize: '1rem',
    appearance: 'auto',
  },
  textarea: {
    padding: '0.75rem',
    background: '#222',
    border: '1px solid #333',
    borderRadius: 8,
    color: '#eee',
    fontSize: '1rem',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#666',
    textAlign: 'right',
    marginTop: '-0.5rem',
  },
  error: {
    color: '#f44',
    background: '#2a1111',
    padding: '0.75rem',
    borderRadius: 8,
    fontSize: '0.875rem',
  },
  submit: {
    padding: '1rem',
    background: '#e53935',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
};
