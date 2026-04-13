import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ExportDataPanelProps {
  sessionCount: number;
  courseCount: number;
  onExport: () => void;
}

export function ExportDataPanel({
  sessionCount,
  courseCount,
  onExport,
}: ExportDataPanelProps) {
  return (
    <Card className="stack-md">
      <div className="section-header">
        <h3>Export data</h3>
        <p>Export a JSON snapshot before any storage migration or major refactor.</p>
      </div>
      <div className="session-metrics">
        <div>
          <strong>{sessionCount}</strong>
          <span>Sessions</span>
        </div>
        <div>
          <strong>{courseCount}</strong>
          <span>Courses</span>
        </div>
      </div>
      <Button block onClick={onExport} type="button" variant="secondary">
        Export JSON
      </Button>
    </Card>
  );
}

