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

interface FatigueByTaskChartProps {
  data: Array<{ name: string; yawns: number }>;
}

export function FatigueByTaskChart({ data }: FatigueByTaskChartProps) {
  return (
    <ChartCard
      title="Fatigue by task type"
      description="Different mental modes produce different fatigue signatures."
    >
      <ResponsiveContainer height={220} width="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="yawns" radius={[10, 10, 0, 0]}>
            {data.map((entry) => (
              <Cell fill="var(--color-accent)" key={entry.name} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

