import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel, disableNetwork } from 'firebase/firestore';
import localFirebaseConfig from '../../firebase-applet-config.json';

// Suppress internal @firebase/firestore backoff and quota-exhausted console error spam
try {
  setLogLevel('silent');
} catch {}

const isCompleteEnvConfig = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
);

const firebaseConfig = {
  apiKey: (isCompleteEnvConfig ? import.meta.env.VITE_FIREBASE_API_KEY : localFirebaseConfig.apiKey) || localFirebaseConfig.apiKey,
  authDomain: (isCompleteEnvConfig ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : localFirebaseConfig.authDomain) || localFirebaseConfig.authDomain,
  projectId: (isCompleteEnvConfig ? import.meta.env.VITE_FIREBASE_PROJECT_ID : localFirebaseConfig.projectId) || localFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || localFirebaseConfig.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFirebaseConfig.messagingSenderId || '',
  appId: (isCompleteEnvConfig ? import.meta.env.VITE_FIREBASE_APP_ID : localFirebaseConfig.appId) || localFirebaseConfig.appId,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    localFirebaseConfig.firestoreDatabaseId ||
    '(default)'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

let quotaExhaustedFlag = false;

export function isFirestoreQuotaError(error: unknown): boolean {
  if (!error) return false;
  const code = (error as any)?.code || '';
  const msg = error instanceof Error ? error.message : String(error);
  const lower = `${code} ${msg}`.toLowerCase();
  return (
    lower.includes('resource-exhausted') ||
    lower.includes('quota exceeded') ||
    lower.includes('quota limit') ||
    lower.includes('free daily write units')
  );
}

export function isQuotaExhausted(): boolean {
  return quotaExhaustedFlag;
}

export function markQuotaExhausted(error?: unknown): void {
  if (error && !isFirestoreQuotaError(error)) {
    return;
  }
  if (!quotaExhaustedFlag) {
    quotaExhaustedFlag = true;
    disableNetwork(db).catch(() => {});
  }
}
