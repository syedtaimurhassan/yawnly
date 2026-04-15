import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AppView } from "@/app/view-state";
import type { Course } from "@/features/courses/model/course.types";
import { ParticipantEntryScreen } from "@/features/participants/components/ParticipantEntryScreen";
import type { ParticipantProfile } from "@/features/participants/model/participant.types";
import { buildAnalyticsSnapshot } from "@/features/analytics/hooks/useAnalytics";
import { ActiveSessionView } from "@/features/session/components/ActiveSessionView";
import { SessionSetupForm } from "@/features/session/components/SessionSetupForm";
import type {
  SessionEndReason,
  StartSessionInput,
  StudySession,
} from "@/features/session/model/session.types";
import {
  appendYawn,
  completeSession,
  createCourse,
  createStudySession,
  isActiveSession,
  removeYawn,
} from "@/features/session/model/session.utils";
import { SettingsSheet } from "@/features/settings/components/SettingsSheet";
import type { StorageMode } from "@/features/settings/model/settings.types";
import { isFirebaseConfigured } from "@/lib/env";
import { getAppSettings, saveAppSettings } from "@/lib/storage";
import { createLocalStorageRepository } from "@/services/storage/local-storage.repository";
import type { DataRepository } from "@/services/storage/repositories";

const SessionSummaryView = lazy(() =>
  import("@/features/session/components/SessionSummaryView").then((module) => ({
    default: module.SessionSummaryView,
  })),
);

const AnalyticsScreen = lazy(() =>
  import("@/features/analytics/components/AnalyticsScreen").then((module) => ({
    default: module.AnalyticsScreen,
  })),
);

function getActionableErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected application error.";

  if (message.includes("Missing or insufficient permissions")) {
    return "Firebase denied this request. Publish the rules from firebase/firestore.rules in Firestore Database -> Rules, then make sure Anonymous auth is enabled in Authentication -> Sign-in method.";
  }

  if (message.includes("operation-not-allowed")) {
    return "Anonymous auth is disabled. Enable Authentication -> Sign-in method -> Anonymous in Firebase Console.";
  }

  if (message.includes("unauthorized-domain")) {
    return "This site domain is not authorized for Firebase Auth. Add syedtaimurhassan.github.io under Authentication -> Settings -> Authorized domains.";
  }

  return message;
}

function getLatestCompletedSessionId(sessions: StudySession[]) {
  return sessions.find((session) => session.status === "completed")?.id ?? null;
}

export function App() {
  const localRepository = useMemo(() => createLocalStorageRepository(), []);
  const firebaseReady = isFirebaseConfigured();
  const [firebaseRepository, setFirebaseRepository] = useState<DataRepository | null>(null);
  const [view, setView] = useState<AppView>("setup");
  const [settings, setSettings] = useState(getAppSettings());
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<string | null>(null);
  const [screenBusy, setScreenBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    "Enter a participant name to load a saved workspace or create a blank one.",
  );
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeRepository =
    settings.storageMode === "firebase" && firebaseReady && firebaseRepository
      ? firebaseRepository
      : localRepository;
  const waitingForRepository =
    settings.storageMode === "firebase" && firebaseReady && !firebaseRepository;
  const blockingBusy = screenBusy || waitingForRepository;
  const busy = actionBusy || blockingBusy;
  const latestCompletedSession =
    sessions.find((session) => session.id === lastCompletedSessionId) ??
    sessions.find((session) => session.status === "completed") ??
    null;
  const currentSessionRef = useRef<StudySession | null>(null);
  const hasInsights = useMemo(
    () => sessions.some((session) => session.status === "completed"),
    [sessions],
  );
  const analytics = useMemo(
    () =>
      view === "analytics"
        ? buildAnalyticsSnapshot(sessions, latestCompletedSession)
        : null,
    [latestCompletedSession, sessions, view],
  );

  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    if (!firebaseReady) {
      setFirebaseUserId(null);
      return undefined;
    }

    void import("@/services/firebase/auth")
      .then(async (module) => {
        await module.ensureAnonymousUser();

        if (cancelled) {
          return;
        }

        unsubscribe = module.subscribeToAnonymousUser((user) => {
          setFirebaseUserId(user?.uid ?? null);
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(getActionableErrorMessage(error));
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [firebaseReady]);

  useEffect(() => {
    let cancelled = false;

    if (!firebaseReady) {
      setFirebaseRepository(null);
      return undefined;
    }

    void import("@/services/storage/firestore.repository")
      .then((module) => {
        if (!cancelled) {
          setFirebaseRepository(module.createFirestoreRepository());
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(getActionableErrorMessage(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseReady]);

  const upsertSessionLocally = useCallback((nextSession: StudySession) => {
    setSessions((current) => {
      const existingIndex = current.findIndex((session) => session.id === nextSession.id);
      if (existingIndex >= 0) {
        const existing = current[existingIndex];
        if (existing.updatedAt >= nextSession.updatedAt) {
          return current;
        }

        return current
          .map((session, index) => (index === existingIndex ? nextSession : session))
          .sort((left, right) => right.startTime - left.startTime);
      }

      return [nextSession, ...current].sort((left, right) => right.startTime - left.startTime);
    });
  }, []);

  const replaceCurrentSessionLocally = useCallback((nextSession: StudySession | null) => {
    setCurrentSession((current) => {
      if (!nextSession) {
        return null;
      }

      if (!current || current.id !== nextSession.id) {
        return nextSession;
      }

      if (current.updatedAt >= nextSession.updatedAt) {
        return current;
      }

      return nextSession;
    });
  }, []);

  const persistSession = useCallback(async (nextSession: StudySession) => {
    if (!participant) {
      throw new Error("Load a participant workspace before saving a session.");
    }

    return activeRepository.upsertSession(participant.nameKey, nextSession);
  }, [activeRepository, participant]);

  const syncActiveSessionInBackground = useCallback((nextSession: StudySession) => {
    replaceCurrentSessionLocally(nextSession);

    void persistSession(nextSession)
      .then((saved) => {
        if (saved.status === "active") {
          const current = currentSessionRef.current;
          if (!current || current.id !== saved.id) {
            return;
          }

          replaceCurrentSessionLocally(saved);
          return;
        }

        upsertSessionLocally(saved);
      })
      .catch((error: unknown) => {
        setErrorMessage(getActionableErrorMessage(error));
      });

    return nextSession;
  }, [persistSession, replaceCurrentSessionLocally, upsertSessionLocally]);

  function resetWorkspace(message: string) {
    setParticipant(null);
    setCourses([]);
    setSessions([]);
    setCurrentSession(null);
    setLastCompletedSessionId(null);
    setView("setup");
    setInfoMessage(message);
  }

  async function handleLoadParticipant(displayName: string) {
    setScreenBusy(true);
    setErrorMessage(null);

    try {
      const workspace = await activeRepository.loadWorkspace(displayName);
      const activeSession = workspace.sessions.find((session) => isActiveSession(session)) ?? null;
      const completedSessions = workspace.sessions
        .filter((session) => !isActiveSession(session))
        .sort((left, right) => right.startTime - left.startTime);
      const nextSettings = {
        ...settings,
        lastParticipantName: workspace.participant.displayName,
      };

      saveAppSettings(nextSettings);
      setSettings(nextSettings);
      setParticipant(workspace.participant);
      setCourses(workspace.courses);
      setSessions(completedSessions);
      setCurrentSession(activeSession);
      setLastCompletedSessionId(getLatestCompletedSessionId(completedSessions));
      setView(activeSession ? "active" : "setup");
      setInfoMessage(
        activeSession
          ? `Resumed the active session for ${workspace.participant.displayName}.`
          : workspace.existed
            ? `Loaded the existing workspace for ${workspace.participant.displayName}.`
            : `Created a new workspace for ${workspace.participant.displayName}.`,
      );
    } catch (error) {
      setErrorMessage(getActionableErrorMessage(error));
    } finally {
      setScreenBusy(false);
    }
  }

  function handleSwitchParticipant() {
    setSettingsOpen(false);
    resetWorkspace("Enter another name to load a different workspace.");
  }

  async function handleCreateCourse(name: string) {
    if (!participant) {
      setErrorMessage("Load a participant workspace before adding courses.");
      return;
    }

    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    if (courses.some((course) => course.name.toLowerCase() === normalizedName.toLowerCase())) {
      return;
    }

    setActionBusy(true);
    setErrorMessage(null);

    try {
      const course = createCourse(normalizedName);
      const saved = await activeRepository.upsertCourse(participant.nameKey, course);
      setCourses((current) =>
        [...current, saved].sort((left, right) => left.name.localeCompare(right.name)),
      );
      setInfoMessage(`Added ${saved.name} to ${participant.displayName}'s course list.`);
    } catch (error) {
      setErrorMessage(getActionableErrorMessage(error));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRemoveCourse(courseId: string) {
    if (!participant) {
      setErrorMessage("Load a participant workspace before removing courses.");
      return;
    }

    const course = courses.find((item) => item.id === courseId);
    if (!course) {
      return;
    }

    setActionBusy(true);
    setErrorMessage(null);

    try {
      await activeRepository.archiveCourse(participant.nameKey, course);
      setCourses((current) => current.filter((item) => item.id !== courseId));
      setInfoMessage(`Removed ${course.name} from the active course list. Past sessions stay intact.`);
    } catch (error) {
      setErrorMessage(getActionableErrorMessage(error));
    } finally {
      setActionBusy(false);
    }
  }

  const handleStartSession = useCallback(async (input: StartSessionInput) => {
    setErrorMessage(null);

    try {
      const nextSession = createStudySession(input, activeRepository.kind);
      const saved = syncActiveSessionInBackground(nextSession);
      setLastCompletedSessionId(null);
      setView("active");
      setInfoMessage(`Started a new session for ${saved.participantNameSnapshot}.`);
    } catch (error) {
      setErrorMessage(getActionableErrorMessage(error));
    }
  }, [activeRepository.kind, syncActiveSessionInBackground]);

  const handleLogYawn = useCallback(async (sleepiness: number) => {
    const session = currentSessionRef.current;
    if (!session) {
      return;
    }

    setErrorMessage(null);

    try {
      syncActiveSessionInBackground(appendYawn(session, sleepiness, activeRepository.kind));
    } catch (error) {
      setErrorMessage(getActionableErrorMessage(error));
    }
  }, [activeRepository.kind, syncActiveSessionInBackground]);

  const handleRemoveYawn = useCallback(async (yawnId: string) => {
    const session = currentSessionRef.current;
    if (!session) {
      return;
    }

    setErrorMessage(null);

    try {
      const nextSession = removeYawn(session, yawnId, activeRepository.kind);
      if (nextSession === session) {
        return;
      }

      syncActiveSessionInBackground(nextSession);
    } catch (error) {
      setErrorMessage(getActionableErrorMessage(error));
    }
  }, [activeRepository.kind, syncActiveSessionInBackground]);

  const handleEndSession = useCallback(async (reason: SessionEndReason) => {
    const session = currentSessionRef.current;
    if (!session) {
      return;
    }

    setErrorMessage(null);

    try {
      const completed = completeSession(session, reason, activeRepository.kind);
      replaceCurrentSessionLocally(null);
      upsertSessionLocally(completed);
      void persistSession(completed)
        .then((saved) => {
          upsertSessionLocally(saved);
        })
        .catch((error: unknown) => {
          setErrorMessage(getActionableErrorMessage(error));
        });
      setLastCompletedSessionId(completed.id);
      setView("summary");
      setInfoMessage(`Saved the completed session for ${completed.participantNameSnapshot}.`);
    } catch (error) {
      setErrorMessage(getActionableErrorMessage(error));
    }
  }, [activeRepository.kind, persistSession, replaceCurrentSessionLocally, upsertSessionLocally]);

  function handleChangeStorageMode(mode: StorageMode) {
    if (mode === settings.storageMode) {
      return;
    }

    if (mode === "firebase" && !firebaseReady) {
      setErrorMessage("Firebase mode is disabled until the VITE_FIREBASE_* values are configured.");
      return;
    }

    const nextSettings = {
      ...settings,
      storageMode: mode,
    };

    saveAppSettings(nextSettings);
    setSettings(nextSettings);
    setErrorMessage(null);
    setSettingsOpen(false);
    resetWorkspace(`Storage mode is now ${mode}. Enter a name to load that workspace.`);
  }

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      participant,
      settings,
      courses,
      sessions: currentSession ? [currentSession, ...sessions] : sessions,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `yawnly-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    const nextSettings = {
      ...settings,
      lastExportAt: Date.now(),
    };

    saveAppSettings(nextSettings);
    setSettings(nextSettings);
    setInfoMessage("Exported the current participant workspace as JSON.");
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <SettingsSheet
          busy={busy}
          courseCount={courses.length}
          errorMessage={errorMessage}
          firebaseAvailable={firebaseReady}
          firebaseUserId={firebaseUserId}
          infoMessage={infoMessage}
          onChangeStorageMode={handleChangeStorageMode}
          onClose={() => setSettingsOpen(false)}
          onExport={handleExport}
          onSwitchParticipant={handleSwitchParticipant}
          open={settingsOpen}
          participantName={participant?.displayName ?? null}
          sessionCount={sessions.length + (currentSession ? 1 : 0)}
          storageMode={settings.storageMode}
        />

        {!settingsOpen && participant && errorMessage ? (
          <div className="banner banner--danger">{errorMessage}</div>
        ) : null}

        {blockingBusy ? (
          <div className="mobile-screen">
            <EmptyState
              title="Loading your workspace"
              description="Yawnly is preparing Firebase, local storage, or the selected participant history."
            />
          </div>
        ) : null}

        {!busy && !participant ? (
          <ParticipantEntryScreen
            busy={busy}
            errorMessage={errorMessage}
            initialName={settings.lastParticipantName ?? ""}
            onLoadWorkspace={handleLoadParticipant}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : null}

        {!busy && participant && view === "setup" ? (
          <SessionSetupForm
            busy={busy}
            courses={courses}
            hasInsights={hasInsights}
            onCreateCourse={handleCreateCourse}
            onOpenSettings={() => setSettingsOpen(true)}
            onRemoveCourse={handleRemoveCourse}
            onStart={handleStartSession}
            onViewAnalytics={() => setView("analytics")}
            participantName={participant.displayName}
          />
        ) : null}

        {!busy && view === "active" && currentSession ? (
          <ActiveSessionView
            courseNameSnapshot={currentSession.courseNameSnapshot}
            inactivityTimeoutMs={settings.inactivityTimeoutMs}
            onEndSession={handleEndSession}
            onLogYawn={handleLogYawn}
            onRemoveYawn={handleRemoveYawn}
            participantNameSnapshot={currentSession.participantNameSnapshot}
            sleepQuality={currentSession.sleepQuality}
            startTime={currentSession.startTime}
            yawnCount={currentSession.yawns.length}
            yawns={currentSession.yawns}
          />
        ) : null}

        {!busy && view === "summary" && latestCompletedSession ? (
          <Suspense
            fallback={
              <div className="mobile-screen">
                <EmptyState
                  title="Loading session summary"
                  description="The reflection view is being prepared."
                />
              </div>
            }
          >
            <SessionSummaryView
              onStartAnother={() => setView("setup")}
              onViewAnalytics={() => setView("analytics")}
              session={latestCompletedSession}
            />
          </Suspense>
        ) : null}

        {!busy && participant && view === "analytics" ? (
          analytics && analytics.sessionInsights.length === 0 ? (
            <div className="mobile-screen">
              <EmptyState
                title="No completed sessions yet"
                description="Finish at least one study session to unlock reflection and trend views."
              />
            </div>
          ) : analytics ? (
            <Suspense
              fallback={
                <div className="mobile-screen">
                  <EmptyState
                    title="Loading analytics"
                    description="The charting bundle is loading only when you need it."
                  />
                </div>
              }
            >
              <AnalyticsScreen
                analytics={analytics}
                onBack={() => setView("setup")}
                onOpenSettings={() => setSettingsOpen(true)}
                participantName={participant.displayName}
              />
            </Suspense>
          ) : null
        ) : null}
      </div>
    </div>
  );
}
