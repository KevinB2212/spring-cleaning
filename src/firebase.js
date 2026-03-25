import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBv3ceO639CdxeA-3Fd0F-mucpRkL7sPdw",
  authDomain: "spring-cleaning-fc2a9.firebaseapp.com",
  projectId: "spring-cleaning-fc2a9",
  storageBucket: "spring-cleaning-fc2a9.firebasestorage.app",
  messagingSenderId: "953473355514",
  appId: "1:953473355514:web:997f02633afcb7b6664343"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
