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
  data: Array<{ label: string; avgYawns: number }>;
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
      title="Fatigue and sleep"
      description="Compare average yawns by prior-night sleep quality."
    >
      <ResponsiveContainer height={220} width="100%">
        <BarChart data={data}>
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="avgYawns" radius={[10, 10, 0, 0]}>
            {data.map((entry, index) => (
              <Cell fill={BAR_COLORS[index % BAR_COLORS.length]} key={entry.label} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

