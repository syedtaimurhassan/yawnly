# Architecture

## Goal

Yawnly is built as a local-first, mobile-first single-page app that can be hosted on GitHub Pages now and upgraded to Firebase later without rewriting the feature screens.

## Core Design Decisions

- No backend server in v1
- No required router in v1
- Analytics are derived from raw sessions on the client
- Data access goes through a repository interface
- Local settings stay in browser storage even when data moves to Firebase

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

## Migration Path

1. Local-only tracking and analytics
2. GitHub Pages deployment
3. Firebase Anonymous Auth
4. Firestore repository
5. Optional local-to-cloud migration flow

