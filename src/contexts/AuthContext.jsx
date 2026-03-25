import { createContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { auth, db } from '../firebase';
import { messaging } from '../firebase-messaging';

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

  // Request notification permission and save FCM token after login
  useEffect(() => {
    if (!user) return;

    async function setupFCM() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // NOTE: Replace BDQkv5bhzgkqyd_fTualsYHqNx9-szVTLOsEPmTqPeZmhjAPkYBVRjFYCGjMjccyB6BSjZc3ehKUNs4HyFpORzw with the key from
        // Firebase Console → Cloud Messaging → Web configuration → Generate key pair
        const token = await getToken(messaging, {
          vapidKey: 'BDQkv5bhzgkqyd_fTualsYHqNx9-szVTLOsEPmTqPeZmhjAPkYBVRjFYCGjMjccyB6BSjZc3ehKUNs4HyFpORzw',
          serviceWorkerRegistration: await navigator.serviceWorker.register(
            '/spring-cleaning/firebase-messaging-sw.js'
          ),
        });

        if (token) {
          await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true });
        }
      } catch (err) {
        console.error('FCM setup failed:', err);
      }
    }

    setupFCM();

    // Handle foreground notifications
    const unsubMessage = onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        // Show a native notification even when app is in foreground
        new Notification(title, { body, icon: '/spring-cleaning/icon-192.png' });
      }
    });

    return unsubMessage;
  }, [user]);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, firestoreUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
