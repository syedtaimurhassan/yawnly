import { memo, useCallback, useState } from "react";
import { cx } from "@/lib/classNames";

interface YawnButtonProps {
  onClick: () => void;
}

export const YawnButton = memo(function YawnButton({ onClick }: YawnButtonProps) {
  const [isPulsing, setIsPulsing] = useState(false);

  const handleClick = useCallback(() => {
    onClick();
    setIsPulsing(true);
    window.setTimeout(() => setIsPulsing(false), 420);
  }, [onClick]);

  return (
    <button
      className={cx("yawn-button", isPulsing && "yawn-button--pulse")}
      onClick={handleClick}
      type="button"
    >
      <span className="yawn-button__emoji">🥱</span>
      <span className="yawn-button__label">Tap to log a yawn</span>
    </button>
  );
});
