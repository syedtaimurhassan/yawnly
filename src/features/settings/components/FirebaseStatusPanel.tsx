import { Card } from "@/components/ui/Card";

interface FirebaseStatusPanelProps {
  configured: boolean;
  userId: string | null;
  errorMessage: string | null;
}

function maskIdentifier(value: string | null) {
  if (!value) {
    return "Not connected";
  }

  if (value.length <= 8) {
    return "********";
  }

  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export function FirebaseStatusPanel({
  configured,
  userId,
  errorMessage,
}: FirebaseStatusPanelProps) {
  return (
    <Card className="stack-md">
      <div className="section-header">
        <h3>Firebase status</h3>
        <p>Anonymous auth runs in the background. The typed participant name decides which workspace loads.</p>
      </div>
      <div className="status-list">
        <div className="status-list__row">
          <span>Configured</span>
          <strong>{configured ? "Yes" : "No"}</strong>
        </div>
        <div className="status-list__row">
          <span>Anonymous user</span>
          <strong>{maskIdentifier(userId)}</strong>
        </div>
        <div className="status-list__row">
          <span>Last error</span>
          <strong>{errorMessage ?? "None"}</strong>
        </div>
      </div>
    </Card>
  );
}
