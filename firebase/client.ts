// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
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

// Lazy singleton — only initialised when first accessed, safe during SSR/build.
function getFirebaseApp() {
  return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

// Lazy proxy helpers so that top-level `export const auth` and `export const db`
// do NOT trigger Firebase initialisation at module-evaluation time (which would
// crash during Next.js build when browser APIs are unavailable).
function lazyAuth(): Auth {
  return new Proxy({} as Auth, {
    get(_, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop === "prototype" || prop === "then" || prop === "$$typeof")
        return undefined;
      const real = getAuth(getFirebaseApp()) as any;
      const value = real[prop];
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

function lazyDb(): Firestore {
  return new Proxy({} as Firestore, {
    get(_, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop === "prototype" || prop === "then" || prop === "$$typeof")
        return undefined;
      const real = getFirestore(getFirebaseApp()) as any;
      const value = real[prop];
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

export const auth: Auth = lazyAuth();
export const db: Firestore = lazyDb();
