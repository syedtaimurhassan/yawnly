import { cx } from "@/lib/classNames";

interface YawnButtonProps {
  isPulsing: boolean;
  onClick: () => void;
}

export function YawnButton({ isPulsing, onClick }: YawnButtonProps) {
  return (
    <button
      className={cx("yawn-button", isPulsing && "yawn-button--pulse")}
      onClick={onClick}
      type="button"
    >
      <span className="yawn-button__emoji">🥱</span>
      <span className="yawn-button__label">Tap to log a yawn</span>
    </button>
  );
}

