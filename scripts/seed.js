// Seed the LOCAL EMULATOR with 3 invented events and 20 invented users.
// Run while `npm run dev` is running:  npm run seed
//
// Emulator only: it talks to 127.0.0.1 and uses the demo- project id, so it
// cannot write to a real Firebase project. Users are created through the Auth
// emulator's REST API; Firestore is written with security rules bypassed via
// @firebase/rules-unit-testing (the same library the tests use).
// The users and password are test values for local development only.
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, Timestamp, writeBatch } from "firebase/firestore";

const PROJECT_ID = "demo-ticket-drop";
const AUTH = "http://127.0.0.1:9099";
const FIRESTORE = { host: "127.0.0.1", port: 8080 };
const PASSWORD = "student-pass-1"; // emulator-only test password for every seeded user

const users = Array.from({ length: 20 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return { localId: `student${n}`, email: `student${n}@example.com`, displayName: `Student ${n}` };
});

// seatsLeft and the waitlist counters are derived from the tickets below,
// so the seeded data obeys the same rules the app enforces.
const events = [
  { id: "jazz-night", name: "Campus Jazz Night", venue: "Great Hall",
    startsAt: "2026-12-05T19:00:00Z", capacity: 10, tickets: [], waitlist: [] },
  { id: "ai-talk", name: "Guest Talk: AI in Engineering", venue: "Lecture Theatre 2",
    startsAt: "2026-12-08T14:00:00Z", capacity: 5, tickets: ["student01", "student02", "student03"], waitlist: [] },
  { id: "final-match", name: "Inter-Faculty Football Final", venue: "Sports Ground",
    startsAt: "2026-12-12T15:00:00Z", capacity: 4,
    tickets: ["student04", "student05", "student06", "student07"], waitlist: ["student08"] },
];

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");

async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`);
}

async function seedUsers() {
  // Start clean, then create each user with a fixed id so tickets can refer to it.
  await call("DELETE", `${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`);
  for (const user of users) {
    await call("POST", `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`,
      { ...user, password: PASSWORD });
  }
}

async function seedEvents() {
  const env = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: FIRESTORE });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = Timestamp.now();
    for (const e of events) {
      const batch = writeBatch(db);
      batch.set(doc(db, "events", e.id), {
        name: e.name,
        venue: e.venue,
        startsAt: Timestamp.fromDate(new Date(e.startsAt)),
        capacity: e.capacity,
        seatsLeft: e.capacity - e.tickets.length,
        waitNext: e.waitlist.length,
        waitServed: 0,
      });
      for (const uid of e.tickets) batch.set(doc(db, "events", e.id, "tickets", uid), { code: code(), createdAt: now });
      e.waitlist.forEach((uid, pos) => batch.set(doc(db, "events", e.id, "waitlist", uid), { pos, joinedAt: now }));
      await batch.commit();
    }
  });
  await env.cleanup();
}

await seedUsers();
await seedEvents();
console.log(`Seeded ${users.length} users and ${events.length} events into the emulator (${PROJECT_ID}).`);
console.log(`Sign in as student01@example.com … student20@example.com, password: ${PASSWORD}`);
