import { Button } from "@/components/ui/Button";
import type { StorageMode } from "@/features/settings/model/settings.types";

interface SettingsSheetProps {
  open: boolean;
  busy: boolean;
  courseCount: number;
  errorMessage: string | null;
  firebaseAvailable: boolean;
  firebaseUserId: string | null;
  infoMessage: string | null;
  participantName: string | null;
  sessionCount: number;
  storageMode: StorageMode;
  onChangeStorageMode: (mode: StorageMode) => void;
  onClose: () => void;
  onExport: () => void;
  onSwitchParticipant: () => void;
}

export function SettingsSheet({
  open,
  busy,
  courseCount,
  errorMessage,
  firebaseAvailable,
  firebaseUserId,
  infoMessage,
  participantName,
  sessionCount,
  storageMode,
  onChangeStorageMode,
  onClose,
  onExport,
  onSwitchParticipant,
}: SettingsSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label="App settings">
      <button className="sheet-backdrop" onClick={onClose} type="button" />
      <div className="sheet-panel">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div>
            <h2>App settings</h2>
            <p>Keep the study flow clean. Use this sheet for storage, export, and switching names.</p>
          </div>
          <Button onClick={onClose} size="sm" type="button" variant="secondary">
            Close
          </Button>
        </div>

        {errorMessage ? <div className="banner banner--danger">{errorMessage}</div> : null}
        {!errorMessage && infoMessage ? <div className="banner banner--info">{infoMessage}</div> : null}

        <div className="settings-group">
          <div className="settings-group__header">
            <h3>Workspace</h3>
            <p>{participantName ? `Current name: ${participantName}` : "No participant loaded yet."}</p>
          </div>
          <div className="settings-row">
            <div>
              <strong>{sessionCount}</strong>
              <span>Saved sessions</span>
            </div>
            <div>
              <strong>{courseCount}</strong>
              <span>Active courses</span>
            </div>
          </div>
          <Button
            block
            disabled={!participantName || busy}
            onClick={onSwitchParticipant}
            type="button"
            variant="secondary"
          >
            Switch name
          </Button>
        </div>

        <div className="settings-group">
          <div className="settings-group__header">
            <h3>Storage mode</h3>
            <p>Firebase keeps the same name available across browsers. Local mode stays in this device only.</p>
          </div>
          <div className="segmented-control">
            <button
              className={storageMode === "local" ? "segmented-control__item segmented-control__item--active" : "segmented-control__item"}
              onClick={() => onChangeStorageMode("local")}
              type="button"
            >
              Local
            </button>
            <button
              className={storageMode === "firebase" ? "segmented-control__item segmented-control__item--active" : "segmented-control__item"}
              disabled={!firebaseAvailable}
              onClick={() => onChangeStorageMode("firebase")}
              type="button"
            >
              Firebase
            </button>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group__header">
            <h3>Firebase status</h3>
            <p>Anonymous auth runs quietly in the background to protect Firestore access.</p>
          </div>
          <div className="status-list">
            <div className="status-list__row">
              <span>Configured</span>
              <strong>{firebaseAvailable ? "Yes" : "No"}</strong>
            </div>
            <div className="status-list__row">
              <span>Anonymous user</span>
              <strong>{firebaseUserId ?? "Not connected"}</strong>
            </div>
            <div className="status-list__row">
              <span>Current storage</span>
              <strong>{storageMode}</strong>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-group__header">
            <h3>Export</h3>
            <p>Download the current participant workspace as JSON before major changes or analysis work.</p>
          </div>
          <Button
            block
            disabled={!participantName}
            onClick={onExport}
            type="button"
            variant="secondary"
          >
            Export JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
