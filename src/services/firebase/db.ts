import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";
import { getFirebaseApp } from "@/services/firebase/app";

let firestoreInitialized = false;

export function getFirebaseDb() {
  const app = getFirebaseApp();

  if (!firestoreInitialized) {
    initializeFirestore(app, {
      localCache: persistentLocalCache(),
    });
    firestoreInitialized = true;
  }

  return getFirestore(app);
}
