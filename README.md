# Yawnly

Yawnly is a local-first study tracking app for logging yawns, noticing fatigue early, and reflecting on which study contexts feel draining over time.

## What Is Implemented

- A clean rebuild from scratch in React + TypeScript
- A single-screen mobile-first web app that works on GitHub Pages
- Local-first storage through `localStorage`
- A repository boundary so the app can switch to Firestore later
- Session setup, active tracking, summary, and analytics
- GitHub Pages deployment workflow
- Firebase config, auth, Firestore repository, and rules scaffolding

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

## Firebase Later

1. Copy `.env.example` to `.env.local`
2. Fill in the Firebase web config values
3. Enable Anonymous Auth in Firebase Authentication
4. Create Firestore in native mode
5. Deploy the Firestore rules from `firebase/firestore.rules`
6. Switch storage mode from `Local` to `Firebase` inside the app

## Current Build Phases

1. Architecture and file structure
2. Local-first domain model and storage
3. Session workflow and analytics
4. GitHub Pages deployment
5. Firebase-ready repository layer
