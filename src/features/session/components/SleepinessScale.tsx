import { cx } from "@/lib/classNames";

interface SleepinessScaleProps {
  value: number;
  onChange: (value: number) => void;
}

export function SleepinessScale({ value, onChange }: SleepinessScaleProps) {
  return (
    <div className="scale-card">
      <div className="section-header">
        <h3>How sleepy are you right now?</h3>
        <p>Capture your state without breaking focus.</p>
      </div>
      <div className="scale-grid">
        {[1, 2, 3, 4, 5].map((option) => (
          <button
            className={cx("scale-pill", value === option && "scale-pill--active")}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      <div className="scale-labels">
        <span>Alert</span>
        <span>Very sleepy</span>
      </div>
    </div>
  );
}

