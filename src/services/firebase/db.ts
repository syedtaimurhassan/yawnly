import { getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "@/services/firebase/app";

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

