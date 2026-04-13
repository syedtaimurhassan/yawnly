import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAnalytics } from "@/features/analytics/hooks/useAnalytics";
import type { AppView } from "@/app/view-state";
import type { Course } from "@/features/courses/model/course.types";
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

export function App() {
  const localRepository = useMemo(() => createLocalStorageRepository(), []);
  const firebaseReady = isFirebaseConfigured();
  const [firebaseRepository, setFirebaseRepository] = useState<DataRepository | null>(null);
  const [view, setView] = useState<AppView>("setup");
  const [settings, setSettings] = useState(getAppSettings());
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);

  const activeRepository =
    settings.storageMode === "firebase" && firebaseReady && firebaseRepository
      ? firebaseRepository
      : localRepository;

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
      .then((module) => {
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

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (settings.storageMode === "firebase" && firebaseReady && !firebaseRepository) {
        setBusy(true);
        return;
      }

      setBusy(true);
      setErrorMessage(null);

      try {
        const [nextCourses, nextSessions] = await Promise.all([
          activeRepository.listCourses(),
          activeRepository.listSessions(),
        ]);

        if (cancelled) {
          return;
        }

        setCourses(nextCourses);
        setSessions(nextSessions);

        const activeSession = nextSessions.find((session) => isActiveSession(session)) ?? null;
        if (activeSession) {
          setCurrentSessionId(activeSession.id);
          setView("active");
        } else {
          setCurrentSessionId(null);
          setView((current) => (current === "active" ? "setup" : current));
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to load application data.";
        setErrorMessage(message);

        if (settings.storageMode === "firebase") {
          const fallbackSettings = {
            ...settings,
            storageMode: "local" as StorageMode,
          };

          saveAppSettings(fallbackSettings);
          setSettings(fallbackSettings);
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [activeRepository, settings.storageMode, firebaseReady, firebaseRepository]);

  async function persistSession(nextSession: StudySession) {
    const saved = await activeRepository.upsertSession(nextSession);
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

  async function handleCreateCourse(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    if (courses.some((course) => course.name.toLowerCase() === normalizedName.toLowerCase())) {
      return;
    }

    const course = createCourse(normalizedName);
    await activeRepository.upsertCourse(course);
    setCourses((current) =>
      [...current, course].sort((left, right) => left.name.localeCompare(right.name)),
    );
  }

  async function handleStartSession(input: StartSessionInput) {
    const nextSession = createStudySession(input, activeRepository.kind);
    const saved = await persistSession(nextSession);
    setCurrentSessionId(saved.id);
    setLastCompletedSessionId(null);
    setView("active");
  }

  async function handleLogYawn(sleepiness: number) {
    if (!currentSession) {
      return;
    }

    await persistSession(appendYawn(currentSession, sleepiness, activeRepository.kind));
  }

  async function handleEndSession(reason: SessionEndReason) {
    if (!currentSession) {
      return;
    }

    const completed = await persistSession(
      completeSession(currentSession, reason, activeRepository.kind),
    );
    setCurrentSessionId(null);
    setLastCompletedSessionId(completed.id);
    setView("summary");
  }

  function handleChangeStorageMode(mode: StorageMode) {
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
  }

  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
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
  }

  const headerActions =
    view === "analytics" ? (
      <Button onClick={() => setView("setup")} type="button" variant="secondary">
        Back to setup
      </Button>
    ) : (
      <Button onClick={() => setView("analytics")} type="button" variant="secondary">
        Insights
      </Button>
    );

  return (
    <div className="app-shell">
      <div className="app-frame">
        <div className="topbar">
          <div>
            <span className="eyebrow">From scratch rebuild</span>
            <h1>Yawnly</h1>
          </div>
          {headerActions}
        </div>

        {errorMessage ? <div className="banner banner--danger">{errorMessage}</div> : null}

        {busy ? (
          <EmptyState
            title="Loading your workspace"
            description="The app is wiring local storage and checking whether Firebase is available."
          />
        ) : null}

        {!busy && view === "setup" ? (
          <div className="layout-grid">
            <SessionSetupForm
              busy={busy}
              courses={courses}
              onCreateCourse={handleCreateCourse}
              onStart={handleStartSession}
            />
            <div className="stack-lg">
              <SectionHeader
                eyebrow="Phase 4"
                title="Storage and migration controls"
                description="These controls are intentionally visible early so the architecture stays honest."
              />
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
              onStartAnother={() => setView("setup")}
              onViewAnalytics={() => setView("analytics")}
              session={latestCompletedSession}
            />
          </Suspense>
        ) : null}

        {!busy && view === "analytics" ? (
          analytics.overview.sessionCount === 0 ? (
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
