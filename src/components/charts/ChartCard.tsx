import type { PropsWithChildren } from "react";
import { Card } from "@/components/ui/Card";

interface ChartCardProps extends PropsWithChildren {
  title: string;
  description?: string;
}

export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <Card className="chart-card">
      <div className="chart-card__header">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="chart-card__body">{children}</div>
    </Card>
  );
}

