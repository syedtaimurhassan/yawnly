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
  data: Array<{ label: string; yawns: number }>;
}

export function FatigueTrendChart({ data }: FatigueTrendChartProps) {
  return (
    <ChartCard
      title="Fatigue over time"
      description="Review trends across study days, not just one session."
    >
      <ResponsiveContainer height={220} width="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="4 4" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Line
            dataKey="yawns"
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

