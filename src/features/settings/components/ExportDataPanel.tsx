import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ExportDataPanelProps {
  sessionCount: number;
  courseCount: number;
  participantName?: string | null;
  onExport: () => void;
}

export function ExportDataPanel({
  sessionCount,
  courseCount,
  participantName,
  onExport,
}: ExportDataPanelProps) {
  return (
    <Card className="stack-md">
      <div className="section-header">
        <h3>Export data</h3>
        <p>Export the current participant workspace before any storage migration or major refactor.</p>
      </div>
      <p className="microcopy">{participantName ? `Current workspace: ${participantName}` : "No workspace loaded yet."}</p>
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
      <Button block disabled={!participantName} onClick={onExport} type="button" variant="secondary">
        Export JSON
      </Button>
    </Card>
  );
}
