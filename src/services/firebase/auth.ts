import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { isFirebaseConfigured } from "@/lib/env";
import { getFirebaseApp } from "@/services/firebase/app";

let pendingSignIn: Promise<User> | null = null;

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function ensureAnonymousUser() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase auth is unavailable because the app is not configured.");
  }

  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (!pendingSignIn) {
    pendingSignIn = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => {
        pendingSignIn = null;
      });
  }

  return pendingSignIn;
}

export function subscribeToAnonymousUser(callback: (user: User | null) => void) {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(getFirebaseAuth(), callback);
}

