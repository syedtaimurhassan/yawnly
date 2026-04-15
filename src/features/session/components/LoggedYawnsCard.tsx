import { memo, useMemo, useState } from "react";
import type { YawnEvent } from "@/features/session/model/session.types";
import { formatClock, minutesBetween } from "@/lib/dates";

interface LoggedYawnsCardProps {
  onRemoveYawn: (yawnId: string) => void;
  startTime: number;
  yawns: YawnEvent[];
}

const DEFAULT_VISIBLE_YAWNS = 5;

export const LoggedYawnsCard = memo(function LoggedYawnsCard({
  onRemoveYawn,
  startTime,
  yawns,
}: LoggedYawnsCardProps) {
  const [showAll, setShowAll] = useState(false);

  const sortedYawns = useMemo(
    () => [...yawns].sort((left, right) => right.timestamp - left.timestamp),
    [yawns],
  );

  const visibleYawns = showAll ? sortedYawns : sortedYawns.slice(0, DEFAULT_VISIBLE_YAWNS);

  if (sortedYawns.length === 0) {
    return null;
  }

  return (
    <div className="card yawn-log-card">
      <div className="yawn-log-card__header">
        <div className="section-header">
          <h2>Logged yawns</h2>
          <p>Review recent taps and remove any accidental ones.</p>
        </div>
        {sortedYawns.length > DEFAULT_VISIBLE_YAWNS ? (
          <button
            className="field-action"
            onClick={() => setShowAll((current) => !current)}
            type="button"
          >
            {showAll ? "Show recent" : `Show all (${sortedYawns.length})`}
          </button>
        ) : null}
      </div>

      <div className="yawn-log-list">
        {visibleYawns.map((yawn) => {
          const minutesIntoSession = minutesBetween(startTime, yawn.timestamp);

          return (
            <div className="yawn-log-item" key={yawn.id}>
              <div className="yawn-log-item__meta">
                <strong>{formatClock(yawn.timestamp)}</strong>
                <span>{minutesIntoSession} min into session</span>
              </div>
              <div className="yawn-log-item__actions">
                <span className="yawn-log-badge">Sleepiness {yawn.sleepiness}/5</span>
                <button
                  aria-label={`Remove yawn logged at ${formatClock(yawn.timestamp)}`}
                  className="text-button text-button--danger"
                  onClick={() => onRemoveYawn(yawn.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
