import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import {
  selectFatigueTrend,
  type SessionInsight,
} from "@/features/analytics/model/analytics.selectors";

type TrendMetric = "avgSleepiness" | "totalYawns";

interface FatigueTrendChartProps {
  insights: SessionInsight[];
}

function getDescription(
  points: Array<{ rawValue: number }>,
  metric: TrendMetric,
): string {
  if (points.length < 2) {
    return "Track a few more sessions to see whether your focus is improving or shifting over time.";
  }

  if (points.length < 4) {
    const last = points[points.length - 1].rawValue;
    return metric === "totalYawns"
      ? `${Math.round(last)} yawn${Math.round(last) === 1 ? "" : "s"} in your most recent session. Keep tracking to spot a trend.`
      : `Average sleepiness of ${last.toFixed(1)}/5 most recently. A few more sessions will reveal a pattern.`;
  }

  const recentSlice = points.slice(-3);
  const olderSlice = points.slice(0, points.length - 3);
  const recentAvg = recentSlice.reduce((s, p) => s + p.rawValue, 0) / recentSlice.length;
  const olderAvg = olderSlice.reduce((s, p) => s + p.rawValue, 0) / olderSlice.length;
  const diff = recentAvg - olderAvg;

  if (metric === "totalYawns") {
    if (diff <= -1.5) {
      return `Fewer yawns recently — down to ${recentAvg.toFixed(1)} per session from ${olderAvg.toFixed(1)} earlier. Positive shift.`;
    }
    if (diff >= 1.5) {
      return `More yawns recently — ${recentAvg.toFixed(1)} per session vs ${olderAvg.toFixed(1)} earlier. Worth reviewing your sleep or session timing.`;
    }
    return `Yawn count is holding steady around ${recentAvg.toFixed(1)} per session — no clear shift yet.`;
  }

  if (diff <= -0.4) {
    return `Sleepiness is trending down — from ${olderAvg.toFixed(1)}/5 to ${recentAvg.toFixed(1)}/5 recently. Sessions feel lighter.`;
  }
  if (diff >= 0.4) {
    return `Sleepiness is rising — from ${olderAvg.toFixed(1)}/5 to ${recentAvg.toFixed(1)}/5 recently. Review your sleep or study conditions.`;
  }
  return `Sleepiness is consistent at ${recentAvg.toFixed(1)}/5 across recent sessions.`;
}

export function FatigueTrendChart({ insights }: FatigueTrendChartProps) {
  const [metric, setMetric] = useState<TrendMetric>("totalYawns");

  const trendData = useMemo(() => selectFatigueTrend(insights), [insights]);

  const trendPoints = useMemo(
    () =>
      trendData.map((point) => ({
        dateLabel: point.dateLabel,
        rawValue: metric === "totalYawns" ? point.totalYawns : point.avgSleepiness,
        rollingAvg:
          metric === "totalYawns" ? point.rollingAvgYawns : point.rollingAvgSleepiness,
      })),
    [trendData, metric],
  );

  const description = getDescription(trendPoints, metric);
  const showRolling = trendPoints.length >= 4;
  const yDomain: [number | string, number | string] =
    metric === "avgSleepiness" ? [0, 5] : [0, "auto"];
  const yFormatter = (v: number) => (metric === "avgSleepiness" ? `${v}/5` : String(v));

  return (
    <ChartCard description={description} title="Focus trend over time">
      <div className="trend-metric-row">
        {(["totalYawns", "avgSleepiness"] as TrendMetric[]).map((m) => (
          <button
            className={
              metric === m
                ? "segmented-control__item segmented-control__item--active"
                : "segmented-control__item"
            }
            key={m}
            onClick={() => setMetric(m)}
            type="button"
          >
            {m === "totalYawns" ? "Yawns per session" : "Avg sleepiness"}
          </button>
        ))}
      </div>
      <ResponsiveContainer height={220} width="100%">
        <LineChart data={trendPoints} margin={{ bottom: 4, left: -8, right: 8, top: 8 }}>
          <CartesianGrid stroke="rgba(229,226,220,0.55)" strokeDasharray="3 3" />
          <XAxis dataKey="dateLabel" interval="preserveStartEnd" tick={{ fontSize: 11 }} />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 11 }}
            tickFormatter={yFormatter}
            width={40}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as { rawValue: number; rollingAvg: number };
              const entries: Array<{ color: string; name: string; value: string }> = [
                {
                  color: "var(--color-primary)",
                  name: metric === "totalYawns" ? "Yawns" : "Avg sleepiness",
                  value:
                    metric === "avgSleepiness"
                      ? `${point.rawValue}/5`
                      : String(point.rawValue),
                },
              ];
              if (showRolling) {
                entries.push({
                  color: "rgba(75,139,112,0.55)",
                  name: "3-session avg",
                  value:
                    metric === "avgSleepiness"
                      ? `${point.rollingAvg}/5`
                      : String(point.rollingAvg),
                });
              }
              return <ChartTooltip active label={label} payload={entries} />;
            }}
          />
          <Line
            dataKey="rawValue"
            dot={{ fill: "var(--color-primary)", r: 4, strokeWidth: 0 }}
            name={metric === "totalYawns" ? "Yawns" : "Avg sleepiness"}
            stroke="rgba(75,139,112,0.4)"
            strokeDasharray="4 4"
            type="monotone"
          />
          {showRolling && (
            <Line
              dataKey="rollingAvg"
              dot={false}
              name="3-session avg"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              type="monotone"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {showRolling && (
        <div className="trend-legend">
          <span className="trend-legend__item">
            <span className="trend-legend__dot trend-legend__dot--session" />
            Session value
          </span>
          <span className="trend-legend__item">
            <span className="trend-legend__dot trend-legend__dot--rolling" />
            3-session avg
          </span>
        </div>
      )}
    </ChartCard>
  );
}
