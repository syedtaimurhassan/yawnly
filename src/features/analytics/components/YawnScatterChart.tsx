import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { YawnScatterPoint } from "@/features/analytics/model/analytics.selectors";

interface YawnScatterChartProps {
  durationMinutes: number;
  firstYawnMinute: number | null;
  points: YawnScatterPoint[];
}

function sleepinessColor(sleepiness: number): string {
  if (sleepiness <= 1) return "#4db388";
  if (sleepiness <= 2) return "#89c9a0";
  if (sleepiness <= 3) return "#d1a347";
  if (sleepiness <= 4) return "#d4805a";
  return "#d76742";
}

function getDescription(points: YawnScatterPoint[], durationMinutes: number): string {
  if (points.length === 0) {
    return "No yawns logged — a useful yawn-free baseline for comparison.";
  }

  const avgMinute = points.reduce((sum, p) => sum + p.minutesIntoSession, 0) / points.length;
  const avgSleepiness = points.reduce((sum, p) => sum + p.sleepiness, 0) / points.length;
  const mid = durationMinutes / 2;
  const firstHalf = points.filter((p) => p.minutesIntoSession < mid);
  const secondHalf = points.filter((p) => p.minutesIntoSession >= mid);
  const firstHalfAvg =
    firstHalf.length > 0
      ? firstHalf.reduce((s, p) => s + p.sleepiness, 0) / firstHalf.length
      : null;
  const secondHalfAvg =
    secondHalf.length > 0
      ? secondHalf.reduce((s, p) => s + p.sleepiness, 0) / secondHalf.length
      : null;

  if (firstHalfAvg !== null && secondHalfAvg !== null && secondHalfAvg - firstHalfAvg >= 1.2) {
    return `Sleepiness builds as the session goes on — avg ${firstHalfAvg.toFixed(1)}/5 early, rising to ${secondHalfAvg.toFixed(1)}/5 later.`;
  }

  if (avgMinute <= durationMinutes * 0.25) {
    return `Yawns arrived in the first quarter of the session. A short warm-up might push that first cue later.`;
  }

  if (avgSleepiness >= 3.8) {
    return `High average sleepiness (${avgSleepiness.toFixed(1)}/5). Color shows how intense each yawn felt.`;
  }

  return `${points.length} yawn${points.length === 1 ? "" : "s"} across the session. Color shows sleepiness — hover each dot for the detail.`;
}

export function YawnScatterChart({ durationMinutes, firstYawnMinute, points }: YawnScatterChartProps) {
  const description = getDescription(points, durationMinutes);

  return (
    <ChartCard description={description} title="Yawns by time and sleepiness">
      <div className="scatter-legend">
        <span className="scatter-legend__badge scatter-legend__badge--low">Low</span>
        <span className="scatter-legend__track" />
        <span className="scatter-legend__badge scatter-legend__badge--high">High sleepiness</span>
      </div>
      <ResponsiveContainer height={220} width="100%">
        <ScatterChart margin={{ bottom: 8, left: -8, right: 8, top: 8 }}>
          <CartesianGrid stroke="rgba(229,226,220,0.55)" strokeDasharray="3 3" />
          <XAxis
            dataKey="minutesIntoSession"
            domain={[0, Math.ceil(durationMinutes)]}
            name="Minutes"
            tickFormatter={(v: number) => `${v}m`}
            type="number"
          />
          <YAxis
            dataKey="sleepiness"
            domain={[0.5, 5.5]}
            name="Sleepiness"
            tickFormatter={(v: number) => `${v}`}
            ticks={[1, 2, 3, 4, 5]}
            type="number"
            width={20}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as YawnScatterPoint;
              return (
                <ChartTooltip
                  active
                  label={`${Math.round(point.minutesIntoSession)} min into session`}
                  payload={[
                    {
                      color: sleepinessColor(point.sleepiness),
                      name: "Sleepiness",
                      value: `${point.sleepiness}/5`,
                    },
                    {
                      color: "rgba(31,36,46,0.15)",
                      name: "Yawn",
                      value: `#${point.index + 1}`,
                    },
                  ]}
                />
              );
            }}
          />
          {firstYawnMinute !== null && (
            <ReferenceLine
              label={{
                fill: "var(--color-accent)",
                fontSize: 10,
                position: "top",
                value: "first",
              }}
              stroke="var(--color-accent)"
              strokeDasharray="4 4"
              x={firstYawnMinute}
            />
          )}
          <Scatter
            data={points}
            shape={(props: any) => {
              const { cx, cy, payload } = props as {
                cx: number;
                cy: number;
                payload: YawnScatterPoint;
              };
              if (typeof cx !== "number" || typeof cy !== "number") return <g />;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  fill={sleepinessColor(payload.sleepiness)}
                  r={7}
                  stroke="white"
                  strokeWidth={2}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
