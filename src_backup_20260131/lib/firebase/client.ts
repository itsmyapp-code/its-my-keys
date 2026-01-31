import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { firebaseConfig } from "./config";

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
// We use initializeFirestore to configure specific settings like cache size if needed,
// but getFirestore is usually sufficient. 
// For offline persistence, we need to handle it carefully in Next.js/Browser env.
const db = getFirestore(app);

if (typeof window !== "undefined") {
    // Enable offline persistence
    import("firebase/firestore").then(({ enableMultiTabIndexedDbPersistence }) => {
        enableMultiTabIndexedDbPersistence(db).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Persistence failed: Multiple tabs open.');
            } else if (err.code === 'unimplemented') {
                console.warn('Persistence failed: Browser not supported.');
            }
        });
    });
}

export { app, auth, db };
