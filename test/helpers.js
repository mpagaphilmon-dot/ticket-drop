// Shared test setup: one emulator test environment, seeded events, and a way to
// act as a given user through the real app code (public/js/tickets.js).
import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ticketApi } from "../public/js/tickets.js";

export async function startEnv() {
  return initializeTestEnvironment({
    projectId: "demo-ticket-drop",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
}

export async function seedEvent(env, id, { capacity = 10, seatsLeft = capacity, waitNext = 0, waitServed = 0 } = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "events", id), {
      name: `Event ${id}`,
      venue: "Main Hall",
      startsAt: new Date("2026-12-01T18:00:00Z"),
      capacity,
      seatsLeft,
      waitNext,
      waitServed,
    });
  });
}

// Act as a signed-in user: returns their Firestore handle and the app's ticket API.
export function as(env, uid) {
  const db = env.authenticatedContext(uid).firestore();
  return { db, api: ticketApi(db, { doc, runTransaction, serverTimestamp }) };
}

// Read with rules off, to check the true state of the database.
export async function event(env, id) {
  let data;
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(ctx.firestore(), "events", id))).data();
  });
  return data;
}

export async function ticketIds(env, eventId) {
  let ids;
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDocs(collection(ctx.firestore(), "events", eventId, "tickets"));
    ids = snap.docs.map((d) => d.id).sort();
  });
  return ids;
}
