interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipEntry[];
}

export function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      {label ? <p className="chart-tooltip__label">{label}</p> : null}
      {payload.map((entry) => (
        <div className="chart-tooltip__row" key={`${entry.name}-${entry.value}`}>
          <span
            className="chart-tooltip__swatch"
            style={{ backgroundColor: entry.color ?? "var(--color-primary)" }}
          />
          <span>{entry.name}</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

