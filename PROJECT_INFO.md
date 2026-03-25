# Spring Cleaning — Project Information

## Quick Links
- 🚀 **Live App**: https://kevinb2212.github.io/spring-cleaning
- 📖 **About Page**: https://kevinb2212.github.io/spring-cleaning/about.html
- 📚 **Setup Guide**: See `docs/SETUP.md`
- 🏗️ **Project Structure**: See `docs/PROJECT_STRUCTURE.md`
- 📋 **Features & Specs**: See `docs/SPEC.md`

## Key Files at a Glance

### Configuration
- `vite.config.js` — Vite build configuration
- `eslint.config.js` — Code linting rules
- `package.json` — Dependencies & npm scripts
- `.firebaserc` — Firebase project settings
- `firebase.json` — Firebase hosting config

### Deployment & Security
- `config/firestore.rules` — Firestore security rules
- `config/storage.rules` — Cloud Storage rules
- `config/firestore.indexes.json` — Database indexes

### Source Code
- `src/` — All React components, pages, and logic
- `public/` — Static assets (PWA icons, manifest)
- `index.html` — HTML entry point

### Documentation
- `README.md` — Project overview & features
- `CONTRIBUTORS.md` — Creator info
- `docs/` — Additional guides & documentation

## Scripts

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Check code quality
npm run deploy     # Deploy to GitHub Pages
```

## Deployment

**GitHub Pages** (current):
```bash
npm run deploy
```

**Firebase Hosting** (alternative):
```bash
firebase deploy
```

## Support
For setup issues, see `docs/SETUP.md`. For feature questions, see the README or `docs/SPEC.md`.
