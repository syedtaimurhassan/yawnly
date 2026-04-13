import { initializeApp, type FirebaseApp } from "firebase/app";
import { isFirebaseConfigured } from "@/lib/env";
import { firebaseWebConfig } from "@/services/firebase/config";

let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp() {
  if (!isFirebaseConfigured() || !firebaseWebConfig) {
    throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* values first.");
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseWebConfig);
  }

  return firebaseApp;
}

