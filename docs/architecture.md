# Architecture

## Goal

Yawnly is built as a mobile-first single-page app that can run on GitHub Pages, persist to Firestore directly from the browser, and still fall back to local storage when needed.

## Core Design Decisions

- No backend server in v1
- No required router in v1
- Analytics are derived from raw sessions on the client
- Data access goes through a repository interface
- Local settings stay in browser storage even when session data moves to Firebase
- Participant names are used as the workspace key for low-friction retrieval

## View State

- `setup`
- `active`
- `summary`
- `analytics`

## Boundaries

- `features/` owns product behavior
- `services/storage/` owns data access
- `services/firebase/` owns Firebase initialization and auth
- `lib/` owns lightweight helpers
- `docs/` captures the system model and migration path

## Storage Modes

- `firebase` is the default mode and uses Firestore plus anonymous auth
- `local` keeps data isolated to the current browser
- Both modes share the same feature components through the `DataRepository` interface

## Participant Workspace Model

- The user types a display name before starting a session
- The app normalizes that display name into a `nameKey`
- The `nameKey` becomes the Firestore document path under `participants/{nameKey}`
- Entering the same name later reloads the same courses, sessions, and analytics

## Migration Path

1. Local-only tracking and analytics
2. GitHub Pages deployment
3. Participant-name Firestore workspaces
4. Raw yawn-event preservation for deeper analysis
5. Optional migration to stronger user identity later
