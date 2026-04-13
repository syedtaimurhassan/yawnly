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

interface YawnsByCourseChartProps {
  data: Array<{ name: string; yawns: number }>;
}

export function YawnsByCourseChart({ data }: YawnsByCourseChartProps) {
  return (
    <ChartCard
      title="Yawns by course"
      description="See which subjects consistently pull fatigue forward."
    >
      <ResponsiveContainer height={220} width="100%">
        <BarChart data={data} layout="vertical">
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="name" type="category" width={88} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="yawns" radius={[0, 10, 10, 0]}>
            {data.map((entry) => (
              <Cell fill="var(--color-primary)" key={entry.name} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

