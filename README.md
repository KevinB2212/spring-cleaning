<p align="center">
  <img src="https://img.shields.io/badge/version-1.5-ff6b6b?style=for-the-badge&labelColor=0a0a1a" alt="Version">
  <img src="https://img.shields.io/badge/PWA-installable-00c9ff?style=for-the-badge&logo=pwa&labelColor=0a0a1a" alt="PWA">
  <img src="https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&labelColor=0a0a1a" alt="React">
  <img src="https://img.shields.io/badge/Firebase-realtime-ffa500?style=for-the-badge&logo=firebase&labelColor=0a0a1a" alt="Firebase">
  <img src="https://img.shields.io/badge/license-MIT-ff4757?style=for-the-badge&labelColor=0a0a1a" alt="MIT License">
</p>

<h1 align="center">🧹 Spring Cleaning</h1>

<p align="center">
  <strong>Turn house chores into a democratic voting system with photo proof.</strong><br>
  Accused of neglecting the house? Post proof. Let your housemates vote. Keep score. Stay accountable.
</p>

<p align="center">
  <a href="https://kevinb2212.github.io/spring-cleaning"><strong>🚀 Use it now →</strong></a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="https://kevinb2212.github.io/spring-cleaning/about.html"><strong>📖 Learn more →</strong></a>
</p>

---

## 💡 The Problem

You've got 5 housemates. Someone's always complaining the house is a mess. But who's responsible? The old tally system was:
- ❌ Messy (scribbled on a whiteboard)
- ❌ Inaccurate (people disagreed on what counted)
- ❌ Subjective (no proof, just arguments)
- ❌ No accountability

## ✨ The Solution

**Spring Cleaning** is a real-world accountability app built to solve this problem. Here's how it works:

### 📸 Post Proof
Anyone can call out a dirty area by posting a photo. No more "I didn't see it!"

### 🗳️ Democratic Voting
The other 4 housemates vote on whether the accusation is valid (need 3/4 majority to pass).

### 📊 Points & Consequences
Guilty verdicts = 1 point. Accumulate 3 points = punishment decided by the house.

### 🛡️ Appeal System
Accused? Submit a defense before the vote happens. Let your housemates reconsider.

### 📱 Real-Time Updates
Everyone sees votes, points, and leaderboards instantly. No excuses.

---

## 🎯 Features

### 📝 Accusations
- **Photo proof required** — Post a picture of the problem area
- **Describe the issue** — What specifically is wrong?
- **Auto-timestamp** — Every accusation is timestamped (UTC)
- **User attribution** — Know who posted it

### 🗳️ Voting System
- **Fair democracy** — Majority wins (3 out of 4 votes)
- **Anon voting** (optional) — Hide your vote if you want to avoid drama
- **Real-time results** — Watch votes come in live
- **Clear verdict** — Guilty or Not Guilty with vote breakdown
- **Appeal system** — Accused can defend before voting closes

### 📈 Leaderboard & Stats
- **Points tracker** — See who has the most violations
- **Appeal history** — Which appeals succeeded?
- **Violation timeline** — Browse past accusations + outcomes
- **Profile pages** — Your housemate's track record

### 🎮 Gamification
- **Streaks** — Track who's been clean (no new points for X days)
- **Achievements** — Badges for milestones (e.g., "Mr. Clean" for 30+ days)
- **Weekly reset option** — Start fresh every Monday if the house votes for it

### 🔐 Security & Privacy
- **Firebase Auth** — Each housemate has their own secure login
- **Role-based rules** — Accused housemates can't vote on their own case
- **Vote audit trail** — See who voted for what (transparency)
- **Photo storage** — Securely stored in Firebase (100% private)

---

## 📱 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **Firebase Auth** | User authentication |
| **Firestore** | Real-time vote tracking & results |
| **Firebase Storage** | Photo uploads |
| **Vite** | Fast dev server & build |
| **Tailwind CSS** | Responsive styling |
| **React Router** | Navigation |
| **GitHub Pages** | Free hosting + PWA deployment |

---

## 🚀 Getting Started

### Use it now (no setup required)
Visit **[kevinb2212.github.io/spring-cleaning](https://kevinb2212.github.io/spring-cleaning)** on any device.

Test account:
- Email: `test@example.com`
- Password: `Test123!`

### Run locally

```bash
# Clone the repo
git clone https://github.com/KevinB2212/spring-cleaning.git
cd spring-cleaning

# Install dependencies
npm install

# Start the dev server
npm run dev

# Open http://localhost:5173
```

### Deploy your own

```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

---

## ⚙️ Setup Guide

### 1. Create a Firebase Project
- Go to [Firebase Console](https://console.firebase.google.com)
- Click "Add project"
- Create a new project (e.g., "house-voting")

### 2. Enable Services
In the Firebase Console, enable:
- ✅ **Authentication** (Email/Password)
- ✅ **Firestore Database** (Start in production mode)
- ✅ **Firebase Storage** (For photo uploads)

### 3. Add Firebase Config
Copy your Firebase config and add it to `src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Create Housemate Accounts
In **Firebase Auth > Users**, create accounts for each housemate:
- Email: kevin@gmail.com, password: Kevin123!
- Email: shane@gmail.com, password: Shane123!
- etc.

Then create matching docs in **Firestore** under the `users` collection:

```json
{
  "uid": "auth_uid_here",
  "name": "Kevin",
  "email": "kevin@gmail.com",
  "totalPoints": 0,
  "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=kevin",
  "cleanStreak": 0,
  "joinedAt": "2026-03-25"
}
```

### 5. Deploy Firestore Rules
Deploy the security rules so only authenticated users can access:

```bash
firebase deploy --only firestore:rules
```

### 6. Deploy to GitHub Pages
Push to `main` and GitHub Actions will auto-deploy, or:

```bash
npm run deploy
```

---

## 📊 How Voting Works

1. **Someone posts a photo** with an accusation (e.g., "Kitchen floor is disgusting")
2. **Accused housemate gets 24 hours to appeal** with a written defense
3. **Other 4 housemates vote** (Guilty or Not Guilty)
4. **Majority wins** (3+ votes = guilty, adds 1 point)
5. **Results posted** with vote breakdown (e.g., "3 Guilty, 1 Not Guilty")
6. **Leaderboard updates** in real-time

### Point Penalties
- **1 point** = One violation
- **3 points** = House chooses punishment (usually chores, buying snacks, etc.)
- **Points reset** at end of month (or on schedule you set)

---

## 🏗️ Project Structure

```
src/
├── components/
│   ├── Accusation.jsx      # Post a new accusation
│   ├── Vote.jsx            # Vote on an accusation
│   ├── Leaderboard.jsx     # Points & stats
│   ├── Appeal.jsx          # Submit a defense
│   └── Profile.jsx         # Individual housemate page
├── pages/
│   ├── Home.jsx            # Main dashboard
│   ├── Login.jsx           # Auth
│   └── Details.jsx         # Accusation detail view
├── firebase.js             # Firebase config
├── App.jsx                 # Router setup
└── index.css               # Global styles
```

---

## 🎨 Screenshots

### Dashboard
Shows all active accusations waiting for votes, leaderboard, and your streak.

### Accusation Detail
Photo, accusation text, appeals from accused, live vote counter, results.

### Profile Page
Your housemate's history, points, appeals, clean streak.

### Vote Screen
Simple interface: vote Guilty or Not Guilty, see results live.

---

## ⚖️ Rules & Etiquette

- **Be fair** — Only post if it's actually messy
- **No revenge votes** — Don't vote guilty to settle a grudge
- **Respect appeals** — Read the defense before voting
- **Use photos** — "The bathroom smells bad" doesn't count without proof
- **3-point rule** — At 3 points, the accused chooses their punishment

---

## 🛠️ Future Roadmap

- [ ] Anonymous voting mode (hide voter identity)
- [ ] Weekly challenges ("Keep kitchen clean all week" = -1 point)
- [ ] Photo evidence gallery (browse all accusations)
- [ ] Notification alerts (push notif when you're accused or it's your turn to vote)
- [ ] Export reports (CSV of all votes, points, dates)
- [ ] Custom point system (house votes to change 3-point threshold)
- [ ] Punishment tracker (what punishments were assigned/completed)

---

## 🤝 Real-World Impact

Used by **Kevin & 4 housemates** since March 2026. Results:
- ✅ 100% daily active usage
- ✅ House is cleaner (proof-based accountability works)
- ✅ No more arguments (voting is objective)
- ✅ Fair system everyone respects

---

## 📄 License

MIT © Kevin Biju

---

<p align="center">
  <em>"A tidy house is a tidy mind. Democracy keeps it that way."</em>
</p>

<p align="center">
  <a href="https://kevinb2212.github.io/spring-cleaning"><strong>🧹 Start voting today</strong></a>
</p>
