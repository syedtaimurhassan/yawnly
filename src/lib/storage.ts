import type { AppSettings } from "@/features/settings/model/settings.types";
import { DEFAULT_SETTINGS } from "@/features/settings/model/settings.types";

const SETTINGS_KEY = "yawnly:settings";

export function readJson<T>(key: string, fallback: T) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getAppSettings() {
  return readJson<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveAppSettings(settings: AppSettings) {
  writeJson(SETTINGS_KEY, settings);
}

