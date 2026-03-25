# Project Structure

## Directory Layout

```
spring-cleaning/
├── 📁 src/                    # Application source code
│   ├── 📁 components/         # Reusable React components
│   │   ├── Skeleton.jsx       # Loading skeleton
│   │   └── ...other components
│   ├── 📁 pages/              # Page components (route views)
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── Accuse.jsx
│   │   ├── Vote.jsx
│   │   ├── History.jsx
│   │   └── Admin.jsx
│   ├── 📁 contexts/           # React context (state management)
│   │   └── AuthContext.jsx
│   ├── 📁 styles/             # CSS files
│   │   ├── index.css          # Global styles
│   │   ├── App.css            # App-level styles
│   │   └── Dashboard.css      # Component-specific styles
│   ├── 📁 assets/             # Images, icons, etc.
│   │   ├── hero.png
│   │   └── ...icons
│   ├── firebase.js            # Firebase configuration
│   ├── firebase-messaging.js  # Push notification setup
│   ├── App.jsx                # Main App component
│   └── main.jsx               # React DOM entry point
│
├── 📁 public/                 # Static assets (served as-is)
│   ├── manifest.json          # PWA manifest
│   ├── favicon.svg
│   ├── icon-192.png           # PWA icon
│   ├── icon-512.png
│   └── firebase-messaging-sw.js
│
├── 📁 config/                 # Firebase & app configuration
│   ├── firestore.rules        # Firestore security rules
│   ├── storage.rules          # Cloud Storage rules
│   └── firestore.indexes.json # Firestore indexes
│
├── 📁 docs/                   # Documentation
│   ├── SETUP.md               # Setup guide
│   ├── SPEC.md                # Feature specifications
│   └── PROJECT_STRUCTURE.md   # This file
│
├── 📁 functions/              # Firebase Cloud Functions (optional)
│   ├── index.js
│   └── package.json
│
├── 📄 index.html              # HTML entry point
├── 📄 vite.config.js          # Vite build config
├── 📄 eslint.config.js        # ESLint config
├── 📄 package.json            # Dependencies & scripts
├── 📄 .firebaserc             # Firebase project config
├── 📄 firebase.json           # Firebase hosting config
├── 📄 README.md               # Project overview
├── 📄 CONTRIBUTORS.md         # Contributors list
└── 📄 .gitignore              # Git ignore rules
```

## Key Files

| File | Purpose |
|------|---------|
| `src/firebase.js` | Firebase initialization & config |
| `src/App.jsx` | Main application component & routing |
| `src/contexts/AuthContext.jsx` | Global authentication state |
| `config/firestore.rules` | Firestore security rules |
| `config/storage.rules` | Cloud Storage security rules |
| `public/manifest.json` | PWA app manifest |
| `vite.config.js` | Build & dev server config |

## Development Workflow

1. **Feature components** → Add to `src/components/`
2. **Page/route logic** → Add to `src/pages/`
3. **Styles** → Add to `src/styles/`
4. **State management** → Add to `src/contexts/`
5. **Documentation** → Add to `docs/`

## Build & Deploy

```
src/ + public/ → Vite build → dist/ → Deploy to GitHub Pages
```

Vite handles:
- Module bundling
- Code splitting
- Asset optimization
- Source maps (dev mode)
