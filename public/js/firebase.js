// Firebase setup for the browser. On localhost it talks to the emulators
// (project "demo-ticket-drop"); anywhere else it uses the real project in config.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";
import { ticketApi } from "./tickets.js";

const local = ["localhost", "127.0.0.1"].includes(location.hostname);

const app = initializeApp(
  local ? { projectId: "demo-ticket-drop", apiKey: "demo-key", authDomain: "localhost" } : firebaseConfig
);
export const db = getFirestore(app);
export const auth = getAuth(app);

if (local) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}

export const api = ticketApi(db, { doc, runTransaction, serverTimestamp });

export {
  collection,
  createUserWithEmailAndPassword,
  doc,
  onAuthStateChanged,
  onSnapshot,
  orderBy,
  query,
  signInWithEmailAndPassword,
  signOut,
};
