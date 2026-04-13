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

interface TimelineChartProps {
  data: Array<{ label: string; yawns: number }>;
  title?: string;
  description?: string;
}

export function TimelineChart({
  data,
  title = "Timeline",
  description = "Look for clusters instead of isolated events.",
}: TimelineChartProps) {
  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer height={220} width="100%">
        <BarChart data={data}>
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="yawns" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell fill="var(--color-highlight)" key={entry.label} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

