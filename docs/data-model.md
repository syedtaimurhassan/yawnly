# Data Model

## Participant Profile

- `displayName`
- `nameKey`
- `createdAt`
- `updatedAt`
- `lastSeenAt`
- `source`

## Course

- `id`
- `name`
- `active`
- `createdAt`
- `updatedAt`
- `deletedAt`

## Yawn Event

- `id`
- `timestamp`
- `sleepiness`

## Study Session

- `id`
- `participantKey`
- `participantNameSnapshot`
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
- `lastParticipantName`

## Firestore Shape

- `participants/{nameKey}`
- `participants/{nameKey}/courses/{courseId}`
- `participants/{nameKey}/sessions/{sessionId}`
- `participants/{nameKey}/sessions/{sessionId}/yawnEvents/{eventId}`

Analytics remain client-derived in the first Firebase version, but the raw yawn event subcollection is preserved for later analysis work.
