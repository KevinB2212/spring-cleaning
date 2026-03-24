import { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [firestoreUser, setFirestoreUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setFirestoreUser(null);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;
    setFirestoreUser(null);
    setLoading(true);
    const unsubDoc = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setFirestoreUser(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return unsubDoc;
  }, [user]);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, firestoreUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
