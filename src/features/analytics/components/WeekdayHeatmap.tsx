import { memo, useMemo, useState } from "react";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  TIME_OF_DAY_BUCKETS,
  WEEKDAY_ORDER,
  type HeatmapCell,
  selectWeekdayHeatmap,
  type SessionInsight,
} from "@/features/analytics/model/analytics.selectors";

interface WeekdayHeatmapProps {
  insights: SessionInsight[];
}

const TIME_ABBR: Record<string, string> = {
  Afternoon: "Aft.",
  Evening: "Eve.",
  "Late night": "Late",
  Morning: "Morn.",
};

function cellColor(cell: HeatmapCell): string {
  if (cell.sessionCount === 0) return "rgba(229,226,220,0.4)";
  if (cell.sessionsWithYawnsPct <= 20) return "var(--color-heat-1)";
  if (cell.sessionsWithYawnsPct <= 40) return "var(--color-heat-2)";
  if (cell.sessionsWithYawnsPct <= 60) return "var(--color-heat-3)";
  if (cell.sessionsWithYawnsPct <= 80) return "var(--color-heat-4)";
  return "var(--color-heat-5)";
}

function getDescription(grid: HeatmapCell[][]): string {
  const allCells = grid.flat().filter((c) => c.sessionCount > 0);

  if (allCells.length < 3) {
    return "Study across different times and days to reveal your personal fatigue pattern here.";
  }

  const hotCell = allCells.reduce((max, c) =>
    c.sessionsWithYawnsPct > max.sessionsWithYawnsPct ? c : max,
  );
  const coolCell = allCells.reduce((min, c) =>
    c.sessionsWithYawnsPct < min.sessionsWithYawnsPct ? c : min,
  );

  if (hotCell.sessionsWithYawnsPct - coolCell.sessionsWithYawnsPct < 20) {
    return "Yawn patterns are fairly even across your tracked slots so far. More sessions will sharpen the picture.";
  }

  const coolDesc =
    coolCell.sessionsWithYawnsPct === 0
      ? "no yawns yet"
      : `${coolCell.sessionsWithYawnsPct}% yawn rate`;

  return `${hotCell.weekday} ${hotCell.timeOfDay.toLowerCase()} is your heaviest slot (${hotCell.sessionsWithYawnsPct}% of sessions with yawns). ${coolCell.weekday} ${coolCell.timeOfDay.toLowerCase()} looks calmer — ${coolDesc}.`;
}

export const WeekdayHeatmap = memo(function WeekdayHeatmap({ insights }: WeekdayHeatmapProps) {
  const grid = useMemo(() => selectWeekdayHeatmap(insights), [insights]);
  const description = useMemo(() => getDescription(grid), [grid]);
  const [selectedCell, setSelectedCell] = useState<{
    weekday: string;
    timeOfDay: string;
  } | null>(null);

  const selected = selectedCell
    ? (grid
        .flat()
        .find(
          (c) => c.weekday === selectedCell.weekday && c.timeOfDay === selectedCell.timeOfDay,
        ) ?? null)
    : null;

  function handleCellClick(cell: HeatmapCell) {
    if (cell.sessionCount === 0) return;
    setSelectedCell((current) =>
      current?.weekday === cell.weekday && current.timeOfDay === cell.timeOfDay
        ? null
        : { timeOfDay: cell.timeOfDay, weekday: cell.weekday },
    );
  }

  return (
    <ChartCard description={description} title="When yawns happen most">
      <div className="heatmap">
        <div className="heatmap-header">
          <span />
          {TIME_OF_DAY_BUCKETS.map((tod: string) => (
            <span className="heatmap-header-cell" key={tod}>
              {TIME_ABBR[tod] ?? tod}
            </span>
          ))}
        </div>

        {grid.map((row, rowIndex) => (
          <div className="heatmap-row" key={WEEKDAY_ORDER[rowIndex]}>
            <span className="heatmap-weekday">{WEEKDAY_ORDER[rowIndex]}</span>
            {row.map((cell) => {
              const isSelected =
                selectedCell?.weekday === cell.weekday &&
                selectedCell.timeOfDay === cell.timeOfDay;
              return (
                <button
                  className={[
                    "heatmap-cell",
                    cell.sessionCount === 0 ? "heatmap-cell--empty" : "",
                    isSelected ? "heatmap-cell--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={cell.timeOfDay}
                  onClick={() => handleCellClick(cell)}
                  style={{ background: cellColor(cell) }}
                  type="button"
                >
                  {cell.sessionCount > 0 && (
                    <span className="heatmap-cell__value">{cell.sessionsWithYawnsPct}%</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div className="heatmap-legend">
          <span className="heatmap-legend__label">Fewer yawns</span>
          <span className="heatmap-legend__track" />
          <span className="heatmap-legend__label">More yawns</span>
        </div>
      </div>

      {selected && (
        <div className="heatmap-detail">
          <div className="heatmap-detail__header">
            <strong>
              {selected.weekday} · {selected.timeOfDay}
            </strong>
            <button
              className="field-action"
              onClick={() => setSelectedCell(null)}
              type="button"
            >
              Close
            </button>
          </div>
          <div className="heatmap-detail__metrics">
            <div className="heatmap-detail__metric">
              <strong>{selected.sessionsWithYawnsPct}%</strong>
              <span>Sessions with yawns</span>
            </div>
            <div className="heatmap-detail__metric">
              <strong>{selected.avgYawns ?? 0}</strong>
              <span>Avg yawns</span>
            </div>
            <div className="heatmap-detail__metric">
              <strong>{selected.sessionCount}</strong>
              <span>Sessions tracked</span>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
});
