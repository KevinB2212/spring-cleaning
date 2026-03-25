# Spring Cleaning — App Spec

## Overview
A web app for 5 housemates to track house cleanliness. Hosted on GitHub Pages.

## Rules
- 1 point per confirmed mess
- 3+ points = you clean the entire house
- Points reset after cleaning punishment is served

## User Flow
1. Any user logs in (5 accounts, email/password via Firebase Auth)
2. **Submit accusation**: Take/upload photo of mess → select who you think is responsible → submit
3. **Voting**: The other 4 housemates each vote Yes or No on whether the accused person should get a point
4. **Result**: If 3 or more of the 4 voters vote Yes → accused gets +1 point
5. **Punishment**: When a user hits 3 points, a banner shows they must clean the house
6. After cleaning, any user can mark it as done (resets that person's points to 0)

## Tech Stack
- **Frontend**: React (Vite), React Router
- **Backend**: Firebase (Firestore + Auth + Storage)
- **Hosting**: GitHub Pages (via gh-pages)

## Firebase Collections

### users (one doc per user)
```
{
  uid: string,
  name: string,
  email: string,
  points: number,       // current points (resets after punishment)
  avatar: string        // optional emoji or initials
}
```

### accusations (one doc per accusation)
```
{
  id: string,
  submittedBy: uid,
  accusedUid: uid,
  photoUrl: string,     // Firebase Storage URL
  note: string,         // optional description
  createdAt: timestamp,
  status: "pending" | "confirmed" | "rejected",
  votes: {
    [uid]: true | false  // true = yes, false = no
  },
  voteCount: { yes: number, no: number }
}
```

## Pages / Routes
- `/` → redirect to `/dashboard` if logged in, else `/login`
- `/login` → Login page (email + password)
- `/dashboard` → Home: leaderboard of points, recent accusations
- `/accuse` → Submit new accusation: photo + accused person select + note
- `/vote/:accusationId` → Vote on a specific accusation
- `/history` → Past accusations (resolved)

## The 5 Users
Pre-create these accounts in Firebase Auth (or on first run):
- Seed them manually via Firebase console, or add a first-run setup script

## Key UI Notes
- Keep it simple, mobile-first (housemates use phones)
- Big punchy cards showing who has how many points
- ⚠️ Red warning when someone is at 2 points, 🚨 punishment banner at 3+
- Voting: simple Yes/No buttons, show live vote count after voting
- Dark mode preferred (or just clean/minimal)
