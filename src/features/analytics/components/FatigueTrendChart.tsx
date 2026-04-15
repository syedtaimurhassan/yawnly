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

interface FatigueTrendChartProps {
  data: Array<{ label: string; sessionCount: number; yawnsPerHour: number }>;
}

export function FatigueTrendChart({ data }: FatigueTrendChartProps) {
  return (
    <ChartCard
      title="Fatigue rate over time"
      description="This keeps the trend fair by comparing yawns against total study time on each day."
    >
      <ResponsiveContainer height={220} width="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="4 4" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(value) => `${value}/hr`} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) {
                return null;
              }

              const entry = payload[0].payload as FatigueTrendChartProps["data"][number];

              return (
                <ChartTooltip
                  active
                  label={label}
                  payload={[
                    {
                      color: "var(--color-primary)",
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
          <Line
            dataKey="yawnsPerHour"
            dot={{ fill: "var(--color-primary)" }}
            stroke="var(--color-primary)"
            strokeWidth={3}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
