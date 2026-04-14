import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface ParticipantEntryScreenProps {
  initialName: string;
  busy: boolean;
  errorMessage: string | null;
  onLoadWorkspace: (displayName: string) => Promise<void>;
  onOpenSettings: () => void;
}

export function ParticipantEntryScreen({
  initialName,
  busy,
  errorMessage,
  onLoadWorkspace,
  onOpenSettings,
}: ParticipantEntryScreenProps) {
  const [displayName, setDisplayName] = useState(initialName);

  useEffect(() => {
    setDisplayName(initialName);
  }, [initialName]);

  const trimmedName = displayName.trim();

  async function handleContinue() {
    if (!trimmedName) {
      return;
    }

    await onLoadWorkspace(trimmedName);
  }

  return (
    <div className="mobile-screen">
      <div className="screen-toolbar">
        <button className="toolbar-pill" onClick={onOpenSettings} type="button">
          Settings
        </button>
      </div>

      <div className="screen-stack">
        <header className="screen-header">
          <h1>Welcome to Yawnly</h1>
          <p>
            Enter your name to reopen a saved study history or start with a blank workspace.
          </p>
        </header>

        {errorMessage ? <div className="banner banner--danger">{errorMessage}</div> : null}

        <div className="card stack-md">
          <label className="field-label" htmlFor="participant-name">
            Name
          </label>
          <input
            className="text-input text-input--hero"
            id="participant-name"
            onChange={(event) => setDisplayName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleContinue();
              }
            }}
            placeholder="Enter your name"
            value={displayName}
          />
          <p className="microcopy">
            Type the same name later to load the same courses, sessions, and analytics.
          </p>
          <Button
            block
            disabled={!trimmedName || busy}
            onClick={() => {
              void handleContinue();
            }}
            size="lg"
            type="button"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
