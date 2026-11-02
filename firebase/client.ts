// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "placeholder.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    "placeholder-project-id",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:placeholder",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Returns (or creates) the Firebase app instance. Safe to call multiple times.
function getFirebaseApp() {
  return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

// Lazy proxy — getAuth() and getFirestore() are deferred until the first
// property access, so they are never called at module-evaluation time.
// This prevents crashes during Next.js SSR / Vercel build where browser
// globals (indexedDB, navigator, etc.) are unavailable.
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (typeof prop !== "string") return undefined;
    if (prop === "prototype" || prop === "then" || prop === "$$typeof")
      return undefined;
    const real = getAuth(getFirebaseApp()) as any;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    if (typeof prop !== "string") return undefined;
    if (prop === "prototype" || prop === "then" || prop === "$$typeof")
      return undefined;
    const real = getFirestore(getFirebaseApp()) as any;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
