import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { StorageMode } from "@/features/settings/model/settings.types";

interface StorageModePanelProps {
  mode: StorageMode;
  firebaseAvailable: boolean;
  onChangeMode: (mode: StorageMode) => void;
}

export function StorageModePanel({
  mode,
  firebaseAvailable,
  onChangeMode,
}: StorageModePanelProps) {
  return (
    <Card className="stack-md">
      <div className="section-header">
        <h3>Storage mode</h3>
        <p>Firebase is the default for cross-device history. Local mode is still useful for isolated testing.</p>
      </div>
      <div className="button-row">
        <Button
          block
          onClick={() => onChangeMode("local")}
          type="button"
          variant={mode === "local" ? "primary" : "secondary"}
        >
          Local
        </Button>
        <Button
          block
          disabled={!firebaseAvailable}
          onClick={() => onChangeMode("firebase")}
          type="button"
          variant={mode === "firebase" ? "primary" : "secondary"}
        >
          Firebase
        </Button>
      </div>
    </Card>
  );
}
