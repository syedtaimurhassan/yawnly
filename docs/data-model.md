# Data Model

## Course

- `id`
- `name`
- `active`
- `createdAt`
- `updatedAt`

## Yawn Event

- `id`
- `timestamp`
- `sleepiness`

## Study Session

- `id`
- `courseId`
- `courseNameSnapshot`
- `taskType`
- `expectedMinutes`
- `sleepQuality`
- `status`
- `startTime`
- `endTime`
- `endReason`
- `yawns`
- `source`
- `createdAt`
- `updatedAt`

## App Settings

- `storageMode`
- `inactivityTimeoutMs`
- `lastExportAt`

## Firestore Shape

- `users/{uid}`
- `users/{uid}/courses/{courseId}`
- `users/{uid}/sessions/{sessionId}`

Analytics remain client-derived in the first Firebase version.

