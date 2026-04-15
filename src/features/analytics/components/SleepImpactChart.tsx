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

interface SleepImpactChartProps {
  data: Array<{
    avgFirstYawnMinute: number | null;
    label: string;
    sessionCount: number;
    sessionsWithYawnsPct: number;
  }>;
}

const BAR_COLORS = [
  "var(--color-heat-1)",
  "var(--color-heat-2)",
  "var(--color-heat-3)",
  "var(--color-heat-4)",
  "var(--color-heat-5)",
];

export function SleepImpactChart({ data }: SleepImpactChartProps) {
  return (
    <ChartCard
      title="How sleep seems to affect sessions"
      description="Higher bars mean yawns showed up in more sessions. Sleep is rated from 1 for very poor to 5 for very good."
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

              const entry = payload[0].payload as SleepImpactChartProps["data"][number];

              return (
                <ChartTooltip
                  active
                  label={`Sleep quality ${label}/5`}
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
