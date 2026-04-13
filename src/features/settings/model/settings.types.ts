export type StorageMode = "local" | "firebase";

export interface AppSettings {
  storageMode: StorageMode;
  inactivityTimeoutMs: number;
  lastExportAt?: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  storageMode: "local",
  inactivityTimeoutMs: 30 * 60 * 1000,
};

