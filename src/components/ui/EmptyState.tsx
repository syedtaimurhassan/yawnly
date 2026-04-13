import { Card } from "@/components/ui/Card";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </Card>
  );
}

