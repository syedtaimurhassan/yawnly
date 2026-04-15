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
import {
  type ComparisonMetric,
  type CourseComparisonDatum,
  formatCompactComparisonMetricValue,
  formatComparisonMetricValue,
  getComparisonMetricValue,
} from "@/features/analytics/model/analytics.selectors";

interface ContextComparisonChartProps {
  data: CourseComparisonDatum[];
  metric: ComparisonMetric;
  onSelectCourse: (courseId: string) => void;
  selectedCourseId: string | null;
}

const METRIC_COPY: Record<
  ComparisonMetric,
  { description: string; label: string; title: string }
> = {
  avgYawnsPerSession: {
    description: "This shows how many yawns usually appear in one tracked session for each course.",
    label: "Average yawns",
    title: "Where sessions collect more yawns",
  },
  firstYawnMinute: {
    description: "Lower bars mean yawns tend to start earlier in that course. Courses with no yawns sit at the bottom.",
    label: "Typical first yawn",
    title: "Where yawns start earliest",
  },
  sessionsWithYawnsPct: {
    description: "This shows how often a tracked session for each course includes at least one yawn.",
    label: "Sessions with yawns",
    title: "Where yawns show up most often",
  },
};

export function ContextComparisonChart({
  data,
  metric,
  onSelectCourse,
  selectedCourseId,
}: ContextComparisonChartProps) {
  const copy = METRIC_COPY[metric];

  return (
    <ChartCard description={copy.description} title={copy.title}>
      <ResponsiveContainer height={240} width="100%">
        <BarChart data={data} layout="vertical">
          <XAxis
            tickFormatter={(value) => formatCompactComparisonMetricValue(metric, Number(value))}
            type="number"
          />
          <YAxis dataKey="name" type="category" width={96} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) {
                return null;
              }

              const entry = payload[0].payload as CourseComparisonDatum;

              return (
                <ChartTooltip
                  active
                  label={entry.name}
                  payload={[
                    {
                      color:
                        entry.courseId === selectedCourseId
                          ? "var(--color-accent)"
                          : "var(--color-primary)",
                      name: copy.label,
                      value: formatComparisonMetricValue(
                        metric,
                        metric === "firstYawnMinute"
                          ? entry.firstYawnMinute
                          : getComparisonMetricValue(entry, metric),
                      ),
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
          <Bar
            dataKey={(entry: CourseComparisonDatum) => getComparisonMetricValue(entry, metric)}
            onClick={(entry: CourseComparisonDatum) => onSelectCourse(entry.courseId)}
            radius={[0, 10, 10, 0]}
          >
            {data.map((entry) => (
              <Cell
                cursor="pointer"
                fill={
                  entry.courseId === selectedCourseId
                    ? "var(--color-accent)"
                    : "var(--color-primary)"
                }
                key={entry.courseId}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
