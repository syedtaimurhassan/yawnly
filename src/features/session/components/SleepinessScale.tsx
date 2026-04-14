import { memo, useEffect, useState } from "react";
import { cx } from "@/lib/classNames";

interface SleepinessScaleProps {
  initialValue?: number;
  onChange: (value: number) => void;
}

export const SleepinessScale = memo(function SleepinessScale({
  initialValue = 1,
  onChange,
}: SleepinessScaleProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <div className="scale-card">
      <p className="scale-card__title">How sleepy are you right now?</p>
      <div className="scale-grid">
        {[1, 2, 3, 4, 5].map((option) => (
          <button
            className={cx(
              "scale-pill",
              value === option && "scale-pill--active",
              value === option && option <= 2 && "scale-pill--low",
              value === option && option === 3 && "scale-pill--mid",
              value === option && option >= 4 && "scale-pill--high",
            )}
            key={option}
            onClick={() => {
              setValue(option);
              onChange(option);
            }}
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
});
