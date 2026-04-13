import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Course } from "@/features/courses/model/course.types";
import { SESSION_DURATION_OPTIONS, SLEEP_SCALE, TASK_OPTIONS } from "@/features/session/model/session.constants";
import type { StartSessionInput, TaskType } from "@/features/session/model/session.types";
import { cx } from "@/lib/classNames";

interface SessionSetupFormProps {
  courses: Course[];
  onCreateCourse: (courseName: string) => Promise<void>;
  onStart: (input: StartSessionInput) => Promise<void>;
  busy: boolean;
}

export function SessionSetupForm({
  courses,
  onCreateCourse,
  onStart,
  busy,
}: SessionSetupFormProps) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [taskType, setTaskType] = useState<TaskType>("reading");
  const [expectedMinutes, setExpectedMinutes] = useState(30);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [newCourseName, setNewCourseName] = useState("");

  const selectedCourse = courses.find((course) => course.id === courseId) ?? courses[0];

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
      courseId: selectedCourse.id,
      courseNameSnapshot: selectedCourse.name,
      taskType,
      expectedMinutes,
      sleepQuality,
    });
  }

  return (
    <div className="stack-lg">
      <SectionHeader
        eyebrow="Phase 1"
        title="Start a study session"
        description="Pick a course, define the task, and set a rough duration before deep work begins."
      />

      <Card className="stack-md">
        <SectionHeader
          eyebrow="Course"
          title="What are you studying?"
          description="Keep course labels simple. They drive later reflection."
        />
        <div className="chip-grid">
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
        <div className="inline-form">
          <input
            className="text-input"
            onChange={(event) => setNewCourseName(event.target.value)}
            placeholder="Add a course"
            value={newCourseName}
          />
          <Button onClick={handleAddCourse} type="button" variant="secondary">
            Add
          </Button>
        </div>
      </Card>

      <Card className="stack-md">
        <SectionHeader
          eyebrow="Task"
          title="What kind of work is this?"
          description="The app tracks which task contexts feel more draining over time."
        />
        <div className="task-grid">
          {TASK_OPTIONS.map((option) => (
            <button
              className={cx("task-card", taskType === option.value && "task-card--active")}
              key={option.value}
              onClick={() => setTaskType(option.value)}
              type="button"
            >
              <span className="task-card__emoji">{option.emoji}</span>
              <strong>{option.label}</strong>
            </button>
          ))}
        </div>
      </Card>

      <Card className="stack-md">
        <SectionHeader
          eyebrow="Plan"
          title="Expected length"
          description="This is only a target, not a rigid timer."
        />
        <div className="chip-grid">
          {SESSION_DURATION_OPTIONS.map((minutes) => (
            <button
              className={cx("chip", expectedMinutes === minutes && "chip--active")}
              key={minutes}
              onClick={() => setExpectedMinutes(minutes)}
              type="button"
            >
              {minutes}m
            </button>
          ))}
        </div>
      </Card>

      <Card className="stack-md">
        <SectionHeader
          eyebrow="Sleep"
          title="How did you sleep last night?"
          description="This creates a lightweight baseline for later comparison."
        />
        <div className="chip-grid">
          {SLEEP_SCALE.map((value) => (
            <button
              className={cx("chip", sleepQuality === value && "chip--active")}
              key={value}
              onClick={() => setSleepQuality(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
        <div className="scale-labels">
          <span>Terrible</span>
          <span>Great</span>
        </div>
      </Card>

      <Button block disabled={!selectedCourse || busy} onClick={handleStart} size="lg" type="button">
        Begin session
      </Button>
    </div>
  );
}

