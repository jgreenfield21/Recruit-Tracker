import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isOnReplit = Boolean(
  typeof window !== "undefined" && window.location.hostname.includes("replit")
);

const isFirebaseConfigured = Boolean(
  !isOnReplit &&
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
);

let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export { auth, isFirebaseConfigured };

export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    console.error("Firebase not configured");
    return null;
  }
  
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
