# Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn
- A Firebase project

## Local Development

### 1. Clone & Install

```bash
git clone https://github.com/KevinB2212/spring-cleaning.git
cd spring-cleaning
npm install
```

### 2. Configure Firebase

Copy your Firebase config to `src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export default firebaseConfig;
```

### 3. Start Dev Server

```bash
npm run dev
```

Opens at `http://localhost:5173`

### 4. Deploy Firebase Rules

```bash
firebase deploy --only firestore:rules,storage
```

## Production Build

```bash
npm run build
npm run preview  # Test the build locally
```

## Deployment

### GitHub Pages
```bash
npm run deploy
```

### Firebase Hosting
```bash
firebase deploy
```

## Environment Setup (Optional)

Create `.env.local`:
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
```

Then reference in `src/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  ...
};
```
