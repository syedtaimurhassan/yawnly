# Firebase Setup

This project is now wired for Firebase on the client with the modular Firebase JavaScript SDK and anonymous auth in the background.

## Current Model

- The user types a name before starting a new session.
- That name is normalized into a `nameKey`.
- Firestore stores data under `participants/{nameKey}`.
- If the same name is entered later, the same workspace loads again.
- Anonymous Firebase Auth is still enabled behind the scenes so Firestore rules do not need to be completely open.

This is intentionally low-friction, but it is not a private identity model. Anyone who knows a participant name can load that workspace.

## Firestore Shape

- `participants/{nameKey}`
- `participants/{nameKey}/courses/{courseId}`
- `participants/{nameKey}/sessions/{sessionId}`
- `participants/{nameKey}/sessions/{sessionId}/yawnEvents/{eventId}`

The session document stores summary data and the embedded `yawns` array for fast chart rendering. The `yawnEvents` subcollection keeps raw event records for deeper analysis later.

## What Is Already In The Repo

- Firebase web config is committed in [.env](../.env)
- Anonymous auth bootstrap is in [src/services/firebase/auth.ts](../src/services/firebase/auth.ts)
- Firestore initialization with persistent local cache is in [src/services/firebase/db.ts](../src/services/firebase/db.ts)
- Firestore repository logic is in [src/services/storage/firestore.repository.ts](../src/services/storage/firestore.repository.ts)
- Rules for the participant-name model are in [firebase/firestore.rules](../firebase/firestore.rules)

## Firebase Console Steps

1. Open the Firebase project `personal-data-43c4c`.
2. Go to `Build -> Authentication -> Sign-in method`.
3. Enable `Anonymous`.
4. Go to `Build -> Firestore Database`.
5. Confirm the database already exists and note the location you chose. Firestore locations cannot be changed later.
6. Open the `Rules` tab.
7. Replace the current rules with the contents of [firebase/firestore.rules](../firebase/firestore.rules).
8. Click `Publish`.
9. Leave indexes alone for now. This app currently uses simple collection queries that do not need composite indexes.
10. If you later add more advanced filtered analytics, Firestore will give you direct index-creation links from the failed query message.

## GitHub Pages Steps

1. Make sure this repo stays on `Settings -> Pages -> Build and deployment -> Source -> GitHub Actions`.
2. Push the updated repo to GitHub.
3. Wait for the `Deploy Yawnly` workflow to finish.
4. Open the site again and confirm the Firebase status panel shows an anonymous user ID after the app initializes.
5. Type a participant name, load the workspace, and verify the seeded courses appear:
   - `Social Graph`
   - `Graph Theory`
   - `Economics`

## Local Verification

1. Run `npm install`
2. Run `npm run dev`
3. Open the Vite URL
4. Type a name and load a workspace
5. Start and finish a session
6. Refresh the page
7. Type the same name again and confirm the same data reloads

## Data And Analysis Notes

- Historical sessions remain readable even when a course is removed because the session stores `courseNameSnapshot`.
- Removed courses are soft-deleted by setting `active: false`.
- Raw yawn event timestamps are preserved for later analysis.
- If this project grows into heavier research work, the clean next step is moving exports into Cloud Storage or BigQuery rather than overloading the client.

## Optional Hardening Later

- Add App Check if you want to reduce abuse from unauthenticated scripts.
- Replace name-key workspaces with real user accounts if privacy starts to matter.
- Add a migration from local storage to Firestore if you want old browser-only data copied into the cloud.
