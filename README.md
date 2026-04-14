# Yawnly

Yawnly is a study tracking app.

It helps a student log yawns during a study session and look at the pattern later.
The idea is to notice tiredness early and see which course feels more draining over time.

## What it has

- enter your name and load your own workspace
- start a study session
- log a yawn with one tap
- rate how sleepy you feel
- end the session and see a short summary
- open insights and see charts from old sessions
- add and remove courses
- save data in Firebase or local storage

## How it works

- you type your name first
- the app uses that name to load the same workspace again later
- if the name is new it starts with a blank workspace
- sessions and courses are saved
- if Firebase mode is on the same data can be loaded again online

## Run it locally

1. run `npm install`
2. run `npm run dev`
3. open the local link shown by Vite

Do not open `index.html` directly in the browser.

## Put it online on GitHub Pages

This repo uses GitHub Actions for deployment.

1. push to `main`
2. in GitHub Pages set the source to `GitHub Actions`
3. wait for the deploy workflow to finish

## Firebase setup

For the online version to save and load data from Firebase:

1. enable Anonymous Auth in Firebase
2. publish the rules from `firebase/firestore.rules`
3. add the `VITE_FIREBASE_*` values in GitHub repository secrets
4. push again or rerun the deploy workflow

More setup steps are in [docs/firebase-setup.md](docs/firebase-setup.md).
