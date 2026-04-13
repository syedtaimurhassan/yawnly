import type { FirebaseOptions } from "firebase/app";
import { appEnv, isFirebaseConfigured } from "@/lib/env";

export const firebaseWebConfig: FirebaseOptions | null = isFirebaseConfigured()
  ? {
      apiKey: appEnv.firebase.apiKey,
      authDomain: appEnv.firebase.authDomain,
      projectId: appEnv.firebase.projectId,
      storageBucket: appEnv.firebase.storageBucket,
      messagingSenderId: appEnv.firebase.messagingSenderId,
      appId: appEnv.firebase.appId,
      measurementId: appEnv.firebase.measurementId,
    }
  : null;

