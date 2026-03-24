# Spring Cleaning

A web app for 5 housemates to track house cleanliness through accusations, voting, and point-based punishments. Built with React + Firebase, hosted on GitHub Pages.

## Setup

### 1. Firebase Project

- Create a project at [Firebase Console](https://console.firebase.google.com)
- Enable **Authentication** (Email/Password provider)
- Enable **Cloud Firestore**
- Enable **Firebase Storage**
- Copy your Firebase config into `src/firebase.js`

### 2. Create User Accounts

Create 5 user accounts in Firebase Auth (Authentication > Users > Add user). Then add a matching doc in the `users` Firestore collection for each:

```json
{
  "uid": "<from auth>",
  "name": "Housemate Name",
  "email": "their@email.com",
  "points": 0,
  "avatar": ""
}
```

### 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 4. Install & Run Locally

```bash
npm install
npm run dev
```

### 5. Deploy to GitHub Pages

```bash
npm run deploy
```

Or push to `main` — the GitHub Actions workflow handles it automatically.
