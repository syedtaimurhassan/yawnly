export type StorageMode = "local" | "firebase";

export interface AppSettings {
  storageMode: StorageMode;
  inactivityTimeoutMs: number;
  lastExportAt?: number;
  lastParticipantName?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  storageMode: "firebase",
  inactivityTimeoutMs: 30 * 60 * 1000,
};
