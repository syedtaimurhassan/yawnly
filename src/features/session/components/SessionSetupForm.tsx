import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Course } from "@/features/courses/model/course.types";
import { SLEEP_SCALE } from "@/features/session/model/session.constants";
import type { StartSessionInput } from "@/features/session/model/session.types";
import { normalizeParticipantName } from "@/features/participants/model/participant.types";
import { cx } from "@/lib/classNames";

interface SessionSetupFormProps {
  participantName: string;
  courses: Course[];
  hasInsights: boolean;
  onCreateCourse: (courseName: string) => Promise<void>;
  onOpenSettings: () => void;
  onRemoveCourse: (courseId: string) => Promise<void>;
  onStart: (input: StartSessionInput) => Promise<void>;
  onViewAnalytics: () => void;
  busy: boolean;
}

export function SessionSetupForm({
  participantName,
  courses,
  hasInsights,
  onCreateCourse,
  onOpenSettings,
  onRemoveCourse,
  onStart,
  onViewAnalytics,
  busy,
}: SessionSetupFormProps) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [sleepQuality, setSleepQuality] = useState(3);
  const [newCourseName, setNewCourseName] = useState("");
  const [managingCourses, setManagingCourses] = useState(false);

  const selectedCourse = courses.find((course) => course.id === courseId) ?? courses[0];

  useEffect(() => {
    if (!selectedCourse) {
      setCourseId(courses[0]?.id ?? "");
    }
  }, [courses, selectedCourse]);

  async function handleAddCourse() {
    const trimmed = newCourseName.trim();
    if (!trimmed) {
      return;
    }

    await onCreateCourse(trimmed);
    setNewCourseName("");
  }

  async function handleStart() {
    if (!selectedCourse) {
      return;
    }

    await onStart({
      participantKey: normalizeParticipantName(participantName),
      participantNameSnapshot: participantName,
      courseId: selectedCourse.id,
      courseNameSnapshot: selectedCourse.name,
      sleepQuality,
    });
  }

  return (
    <div className="mobile-screen">
      <div className="screen-toolbar">
        <button className="toolbar-pill" onClick={onOpenSettings} type="button">
          Settings
        </button>
        {hasInsights ? (
          <button className="toolbar-pill toolbar-pill--primary" onClick={onViewAnalytics} type="button">
            Insights
          </button>
        ) : null}
      </div>

      <div className="screen-stack">
        <header className="screen-header">
          <h1>Start a Session</h1>
          <p>{participantName} is about to begin a focused study block. Keep the setup lightweight and start quickly.</p>
        </header>

        <section className="form-section">
          <div className="field-row">
            <label className="field-label">Course</label>
            <button
              className="field-action"
              onClick={() => setManagingCourses((current) => !current)}
              type="button"
            >
              {managingCourses ? "Done" : "Manage"}
            </button>
          </div>
          <div className="chip-grid chip-grid--wrap">
            {courses.map((course) => (
              <button
                className={cx("chip", course.id === selectedCourse?.id && "chip--active")}
                key={course.id}
                onClick={() => setCourseId(course.id)}
                type="button"
              >
                {course.name}
              </button>
            ))}
          </div>
          {managingCourses ? (
            <div className="course-manager">
              <div className="inline-form">
                <input
                  className="text-input"
                  onChange={(event) => setNewCourseName(event.target.value)}
                  placeholder="Add a course name"
                  value={newCourseName}
                />
                <Button onClick={handleAddCourse} type="button" variant="secondary">
                  Add
                </Button>
              </div>
              {courses.length > 0 ? (
                <div className="course-list">
                  {courses.map((course) => (
                    <div className="course-row" key={course.id}>
                      <span>{course.name}</span>
                      <button
                        className="course-row__remove"
                        onClick={() => {
                          void onRemoveCourse(course.id);
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="microcopy">No active courses yet. Add one before starting a session.</p>
              )}
            </div>
          ) : null}
        </section>

        <section className="form-section">
          <label className="field-label">How did you sleep last night?</label>
          <p className="microcopy">
            This gives the session a simple baseline for later reflection without adding friction.
          </p>
          <div className="sleep-grid">
            {SLEEP_SCALE.map((value) => (
              <button
                className={cx("sleep-chip", sleepQuality === value && "sleep-chip--active")}
                key={value}
                onClick={() => setSleepQuality(value)}
                type="button"
              >
                {value === 1 ? "😴" : value === 2 ? "😕" : value === 3 ? "😐" : value === 4 ? "🙂" : "😊"}
              </button>
            ))}
          </div>
          <div className="scale-labels">
            <span>Terrible</span>
            <span>Great</span>
          </div>
        </section>
      </div>

      <Button
        block
        className="session-primary-action"
        disabled={!selectedCourse || busy}
        onClick={handleStart}
        size="lg"
        type="button"
      >
        Begin studying
      </Button>
    </div>
  );
}
