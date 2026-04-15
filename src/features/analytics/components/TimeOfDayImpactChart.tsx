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
      description="Use this to see whether some parts of the day tend to pull fatigue cues forward more than others."
      title="Fatigue rate by time of day"
    >
      <ResponsiveContainer height={220} width="100%">
        <BarChart data={data}>
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(value) => `${value}/hr`} />
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
                      name: "Yawns per hour",
                      value: `${entry.yawnsPerHour}/hr`,
                    },
                    {
                      color: "rgba(31, 36, 46, 0.15)",
                      name: "Sessions",
                      value: entry.sessionCount,
                    },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="yawnsPerHour" radius={[10, 10, 0, 0]}>
            {data.map((entry, index) => (
              <Cell fill={BAR_COLORS[index % BAR_COLORS.length]} key={entry.label} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
