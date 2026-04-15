import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import type { TimeOfDayImpactDatum } from "@/features/analytics/model/analytics.selectors";

interface TimeOfDayImpactChartProps {
  data: TimeOfDayImpactDatum[];
}

const BAR_COLORS = [
  "var(--color-fatigue-low)",
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-fatigue-high)",
];

export function TimeOfDayImpactChart({ data }: TimeOfDayImpactChartProps) {
  return (
    <ChartCard
      description="Use this as a timing hint. Higher bars mean yawns appeared in more sessions at that time of day."
      title="When yawns show up most often"
    >
      <ResponsiveContainer height={220} width="100%">
        <BarChart data={data}>
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(value) => `${value}%`} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) {
                return null;
              }

              const entry = payload[0].payload as TimeOfDayImpactDatum;

              return (
                <ChartTooltip
                  active
                  label={label}
                  payload={[
                    {
                      color: payload[0].color as string,
                      name: "Sessions with yawns",
                      value: `${entry.sessionsWithYawnsPct}%`,
                    },
                    {
                      color: "rgba(31, 36, 46, 0.15)",
                      name: "Typical first yawn",
                      value:
                        entry.avgFirstYawnMinute === null
                          ? "No yawns yet"
                          : `${Math.round(entry.avgFirstYawnMinute)} min`,
                    },
                    {
                      color: "rgba(31, 36, 46, 0.15)",
                      name: "Sessions tracked",
                      value: entry.sessionCount,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="sessionsWithYawnsPct" radius={[10, 10, 0, 0]}>
            {data.map((entry, index) => (
              <Cell fill={BAR_COLORS[index % BAR_COLORS.length]} key={entry.label} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
