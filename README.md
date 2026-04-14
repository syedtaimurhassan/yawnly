# Yawnly

Yawnly is a Firebase-ready study tracking app for logging yawns, noticing fatigue early, and reflecting on which study contexts feel draining over time.

## What Is Implemented

- A clean rebuild from scratch in React + TypeScript
- A single-screen mobile-first web app that works on GitHub Pages
- Participant-name workspaces that can be reopened later by typing the same name
- Firebase-backed storage with a local storage fallback
- A repository boundary so the app can switch storage modes without rewriting the UI
- Session setup, active tracking, summary, and analytics
- GitHub Pages deployment workflow
- Firebase config, anonymous auth, Firestore repository, and participant-based rules

## Run Locally

1. Install dependencies with `npm install`
2. Start the dev server with `npm run dev`
3. Open the local Vite URL

## GitHub Pages Deployment

This project uses GitHub Actions to deploy to GitHub Pages.

- For a project site like `https://<user>.github.io/<repo>/`, the workflow computes `BASE_PATH=/<repo>/`
- For a user site like `https://<user>.github.io/`, the workflow computes `BASE_PATH=/`
- The generated site includes `.nojekyll`, so static assets are served as plain files

Push to `main`, then enable Pages with `Build and deployment -> Source -> GitHub Actions`.

## Important

Do not open `index.html` directly from the filesystem.

- Development should run through `npm run dev`
- GitHub Pages should publish the built `dist/` output through the workflow

## Firebase On GitHub Pages

Firebase is already wired into the app, but the online GitHub Pages build now expects the web config through GitHub Actions secrets instead of a tracked `.env` file.

1. Enable Anonymous Auth in Firebase Authentication
2. Publish the rules from `firebase/firestore.rules`
3. In GitHub, add these repository secrets under `Settings -> Secrets and variables -> Actions`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
4. Push to GitHub so the Pages workflow rebuilds
5. Open the site, enter a participant name, and load the workspace

Detailed console and deployment steps are in [docs/firebase-setup.md](docs/firebase-setup.md).

## Current Build Phases

1. Architecture and file structure
2. Participant-name workspace model
3. Session workflow and analytics
4. GitHub Pages deployment
5. Firebase-backed persistence with local fallback
