import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Runs only on first use, never at import/build time.
function initFirebaseAdmin() {
  if (!getApps().length) {
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    const privateKey = rawPrivateKey
      ? rawPrivateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n")
      : undefined;

    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !clientEmail || !privateKey) {
      return;
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
}

// Lazy proxies: existing code like `db.collection(...)` and `auth.verifyIdToken(...)`
// keeps working, but Firebase is only initialized when one of them is actually used.
function lazy<T extends object>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_, prop) {
      if (prop === "prototype" || prop === "then" || prop === "$$typeof") {
        return undefined;
      }

      initFirebaseAdmin();
      if (!getApps().length) return undefined;

      try {
        const real = getter() as any;
        if (!real) return undefined;
        const value = real[prop];
        return typeof value === "function" ? value.bind(real) : value;
      } catch {
        return undefined;
      }
    },
  });
}

export const auth: Auth = lazy(() => getAuth());
export const db: Firestore = lazy(() => getFirestore());
