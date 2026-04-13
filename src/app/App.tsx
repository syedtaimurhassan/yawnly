import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AppView } from "@/app/view-state";
import type { Course } from "@/features/courses/model/course.types";
import { ParticipantPanel } from "@/features/participants/components/ParticipantPanel";
import type { ParticipantProfile } from "@/features/participants/model/participant.types";
import { useAnalytics } from "@/features/analytics/hooks/useAnalytics";
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
} from "@/features/session/model/session.utils";
import { ExportDataPanel } from "@/features/settings/components/ExportDataPanel";
import { FirebaseStatusPanel } from "@/features/settings/components/FirebaseStatusPanel";
import { StorageModePanel } from "@/features/settings/components/StorageModePanel";
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(
    "Enter a participant name to load a saved workspace or create a blank one.",
  );
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);

  const activeRepository =
    settings.storageMode === "firebase" && firebaseReady && firebaseRepository
      ? firebaseRepository
      : localRepository;
  const waitingForRepository =
    settings.storageMode === "firebase" && firebaseReady && !firebaseRepository;
  const busy = actionBusy || waitingForRepository;

  const currentSession =
    sessions.find((session) => session.id === currentSessionId) ??
    sessions.find((session) => isActiveSession(session)) ??
    null;
  const latestCompletedSession =
    sessions.find((session) => session.id === lastCompletedSessionId) ??
    sessions.find((session) => session.status === "completed") ??
    null;
  const analytics = useAnalytics(sessions, latestCompletedSession);

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
          setErrorMessage(error instanceof Error ? error.message : "Failed to initialize Firebase auth.");
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
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to prepare the Firestore repository.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseReady]);

  async function persistSession(nextSession: StudySession) {
    if (!participant) {
      throw new Error("Load a participant workspace before saving a session.");
    }

    const saved = await activeRepository.upsertSession(participant.nameKey, nextSession);
    setSessions((current) => {
      const existingIndex = current.findIndex((session) => session.id === saved.id);
      if (existingIndex >= 0) {
        return current
          .map((session, index) => (index === existingIndex ? saved : session))
          .sort((left, right) => right.startTime - left.startTime);
      }

      return [saved, ...current].sort((left, right) => right.startTime - left.startTime);
    });
    return saved;
  }

  function resetWorkspace(message: string) {
    setParticipant(null);
    setCourses([]);
    setSessions([]);
    setCurrentSessionId(null);
    setLastCompletedSessionId(null);
    setView("setup");
    setInfoMessage(message);
  }

  async function handleLoadParticipant(displayName: string) {
    setActionBusy(true);
    setErrorMessage(null);

    try {
      const workspace = await activeRepository.loadWorkspace(displayName);
      const activeSession = workspace.sessions.find((session) => isActiveSession(session)) ?? null;
      const nextSettings = {
        ...settings,
        lastParticipantName: workspace.participant.displayName,
      };

      saveAppSettings(nextSettings);
      setSettings(nextSettings);
      setParticipant(workspace.participant);
      setCourses(workspace.courses);
      setSessions(workspace.sessions);
      setCurrentSessionId(activeSession?.id ?? null);
      setLastCompletedSessionId(getLatestCompletedSessionId(workspace.sessions));
      setView(activeSession ? "active" : "setup");
      setInfoMessage(
        activeSession
          ? `Resumed the active session for ${workspace.participant.displayName}.`
          : workspace.existed
            ? `Loaded the existing workspace for ${workspace.participant.displayName}.`
            : `Created a new workspace for ${workspace.participant.displayName}.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the participant workspace.");
    } finally {
      setActionBusy(false);
    }
  }

  function handleClearParticipant() {
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the new course.");
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to remove the course.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleStartSession(input: StartSessionInput) {
    setActionBusy(true);
    setErrorMessage(null);

    try {
      const nextSession = createStudySession(input, activeRepository.kind);
      const saved = await persistSession(nextSession);
      setCurrentSessionId(saved.id);
      setLastCompletedSessionId(null);
      setView("active");
      setInfoMessage(`Started a new ${saved.taskType.replace("-", " ")} session for ${saved.participantNameSnapshot}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to start the session.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleLogYawn(sleepiness: number) {
    if (!currentSession) {
      return;
    }

    setActionBusy(true);
    setErrorMessage(null);

    try {
      await persistSession(appendYawn(currentSession, sleepiness, activeRepository.kind));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the yawn event.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleEndSession(reason: SessionEndReason) {
    if (!currentSession) {
      return;
    }

    setActionBusy(true);
    setErrorMessage(null);

    try {
      const completed = await persistSession(
        completeSession(currentSession, reason, activeRepository.kind),
      );
      setCurrentSessionId(null);
      setLastCompletedSessionId(completed.id);
      setView("summary");
      setInfoMessage(`Saved the completed session for ${completed.participantNameSnapshot}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to close the session.");
    } finally {
      setActionBusy(false);
    }
  }

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
    resetWorkspace(`Storage mode is now ${mode}. Enter a name to load that workspace.`);
  }

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      participant,
      settings,
      courses,
      sessions,
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

  function handleReturnToSetup() {
    resetWorkspace("Re-enter a participant name before starting another session.");
  }

  const headerActions =
    view === "analytics" ? (
      <Button onClick={handleReturnToSetup} type="button" variant="secondary">
        Back to setup
      </Button>
    ) : participant ? (
      <Button onClick={() => setView("analytics")} type="button" variant="secondary">
        Insights
      </Button>
    ) : null;

  return (
    <div className="app-shell">
      <div className="app-frame">
        <div className="topbar">
          <div>
            <span className="eyebrow">From scratch rebuild</span>
            <h1>Yawnly</h1>
            <p className="topbar__subtitle">
              {participant
                ? `Workspace: ${participant.displayName} • ${settings.storageMode} storage`
                : `Type a name to open a shared study history in ${settings.storageMode} mode.`}
            </p>
          </div>
          {headerActions}
        </div>

        {errorMessage ? <div className="banner banner--danger">{errorMessage}</div> : null}
        {!errorMessage && infoMessage ? <div className="banner banner--info">{infoMessage}</div> : null}

        {busy ? (
          <EmptyState
            title="Loading your workspace"
            description="The app is preparing Firebase, local storage, or the selected participant history."
          />
        ) : null}

        {!busy && view === "setup" ? (
          <div className="layout-grid">
            <div className="stack-lg">
              <ParticipantPanel
                busy={busy}
                currentParticipant={participant}
                initialName={settings.lastParticipantName ?? ""}
                onClearParticipant={handleClearParticipant}
                onLoadWorkspace={handleLoadParticipant}
              />
              {participant ? (
                <SessionSetupForm
                  busy={busy}
                  courses={courses}
                  onCreateCourse={handleCreateCourse}
                  onRemoveCourse={handleRemoveCourse}
                  onStart={handleStartSession}
                  participantName={participant.displayName}
                />
              ) : (
                <EmptyState
                  title="Enter a name to unlock session tracking"
                  description="When the typed name already exists, Yawnly reloads that participant's history and course list."
                />
              )}
            </div>

            <div className="stack-lg">
              <StorageModePanel
                firebaseAvailable={firebaseReady}
                mode={settings.storageMode}
                onChangeMode={handleChangeStorageMode}
              />
              <FirebaseStatusPanel
                configured={firebaseReady}
                errorMessage={errorMessage}
                userId={firebaseUserId}
              />
              <ExportDataPanel
                courseCount={courses.length}
                onExport={handleExport}
                participantName={participant?.displayName ?? null}
                sessionCount={sessions.length}
              />
            </div>
          </div>
        ) : null}

        {!busy && view === "active" && currentSession ? (
          <ActiveSessionView
            inactivityTimeoutMs={settings.inactivityTimeoutMs}
            onEndSession={handleEndSession}
            onLogYawn={handleLogYawn}
            session={currentSession}
          />
        ) : null}

        {!busy && view === "summary" && latestCompletedSession ? (
          <Suspense
            fallback={
              <EmptyState
                title="Loading session summary"
                description="The reflection view is being prepared."
              />
            }
          >
            <SessionSummaryView
              onStartAnother={handleReturnToSetup}
              onViewAnalytics={() => setView("analytics")}
              session={latestCompletedSession}
            />
          </Suspense>
        ) : null}

        {!busy && view === "analytics" ? (
          !participant ? (
            <EmptyState
              title="No participant workspace loaded"
              description="Return to setup, enter a participant name, and load the relevant session history first."
            />
          ) : analytics.overview.sessionCount === 0 ? (
            <EmptyState
              title="No completed sessions yet"
              description="Finish at least one study session to unlock reflection and trend views."
            />
          ) : (
            <Suspense
              fallback={
                <EmptyState
                  title="Loading analytics"
                  description="The charting bundle is loading only when you need it."
                />
              }
            >
              <AnalyticsScreen analytics={analytics} storageMode={settings.storageMode} />
            </Suspense>
          )
        ) : null}
      </div>
    </div>
  );
}
