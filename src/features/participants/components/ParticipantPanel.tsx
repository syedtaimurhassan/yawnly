import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { ParticipantProfile } from "@/features/participants/model/participant.types";

interface ParticipantPanelProps {
  busy: boolean;
  currentParticipant: ParticipantProfile | null;
  initialName: string;
  onClearParticipant: () => void;
  onLoadWorkspace: (displayName: string) => Promise<void>;
}

export function ParticipantPanel({
  busy,
  currentParticipant,
  initialName,
  onClearParticipant,
  onLoadWorkspace,
}: ParticipantPanelProps) {
  const [displayName, setDisplayName] = useState(initialName);

  useEffect(() => {
    setDisplayName(currentParticipant?.displayName ?? initialName);
  }, [currentParticipant, initialName]);

  const trimmedName = displayName.trim();

  async function handleLoadWorkspace() {
    if (!trimmedName) {
      return;
    }

    await onLoadWorkspace(trimmedName);
  }

  return (
    <Card className="stack-md">
      <SectionHeader
        eyebrow="Participant"
        title="Load or create a study history"
        description="Type a name before every new session. Existing names reopen their old courses, sessions, and analytics."
      />

      {currentParticipant ? (
        <div className="participant-summary">
          <div>
            <strong>{currentParticipant.displayName}</strong>
            <span>Name key: {currentParticipant.nameKey}</span>
          </div>
          <div>
            <strong>{currentParticipant.source}</strong>
            <span>
              {currentParticipant.source === "firebase"
                ? "This workspace is loading from Firestore and can follow the same name across browsers."
                : "This workspace is isolated to the current browser until you switch back to Firebase mode."}
            </span>
          </div>
        </div>
      ) : null}

      <div className="inline-form">
        <input
          className="text-input"
          onChange={(event) => setDisplayName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleLoadWorkspace();
            }
          }}
          placeholder="Enter your name"
          value={displayName}
        />
        <Button
          disabled={!trimmedName || busy}
          onClick={() => {
            void handleLoadWorkspace();
          }}
          type="button"
        >
          {currentParticipant ? "Reload" : "Load"}
        </Button>
      </div>

      <div className="button-row">
        <Button
          block
          disabled={!currentParticipant || busy}
          onClick={onClearParticipant}
          type="button"
          variant="secondary"
        >
          Switch name
        </Button>
        <p className="microcopy">
          The name is used as the shared workspace key. That keeps the flow simple, but it is not a
          privacy-preserving identity model.
        </p>
      </div>
    </Card>
  );
}
