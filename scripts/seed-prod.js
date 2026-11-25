// Create (or reset) the launch events in the REAL Firebase project.
//
//   node scripts/seed-prod.js            dry run: shows what would be written
//   node scripts/seed-prod.js --confirm  writes it
//
// Events can only be created by the project owner (firestore.rules forbids it
// from browsers), so this runs as you: it borrows a short-lived access token from
// your existing `firebase login` via the installed Firebase CLI, exactly as
// `firebase deploy` does. The token is kept in memory and only sent to Google's
// Firestore API. Nothing is printed or saved.
//
// Safety: an event that already has tickets or waitlist entries is SKIPPED, so a
// re-run can never reset seatsLeft underneath real ticket holders.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const confirm = process.argv.includes("--confirm");
const projectId = JSON.parse(readFileSync(".firebaserc", "utf8")).projects.default;
if (!projectId || projectId.startsWith("demo-")) throw new Error(`Refusing to run against "${projectId}".`);

// Times are Africa/Johannesburg (+02:00).
const events = [
  { id: "jazz-night", name: "Campus Jazz Night", venue: "Great Hall", startsAt: "2026-12-05T19:00:00+02:00", capacity: 10 },
  { id: "ai-talk", name: "Guest Talk: AI in Engineering", venue: "Lecture Theatre 2", startsAt: "2026-12-08T14:00:00+02:00", capacity: 5 },
  { id: "final-match", name: "Inter-Faculty Football Final", venue: "Sports Ground", startsAt: "2026-12-12T15:00:00+02:00", capacity: 4 },
];

// ---- borrow an access token from the installed Firebase CLI ----
async function accessToken() {
  const root = execSync("npm root -g", { encoding: "utf8" }).trim();
  const require = createRequire(path.join(root, "firebase-tools", "package.json"));
  const auth = require("./lib/auth");
  const { requireAuth } = require("./lib/requireAuth");
  const apiv2 = require("./lib/apiv2");
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error("Not signed in: run `firebase login` first.");
  await requireAuth({ user: account.user, tokens: account.tokens });
  return apiv2.getAccessToken();
}

const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function api(token, method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url.replace(base, "")} -> ${res.status} ${json.error?.message ?? ""}`);
  return json;
}

async function hasDocs(token, eventId, sub) {
  const json = await api(token, "GET", `${base}/events/${eventId}/${sub}?pageSize=1`);
  return (json.documents ?? []).length > 0;
}

const fields = (e) => ({
  name: { stringValue: e.name },
  venue: { stringValue: e.venue },
  startsAt: { timestampValue: new Date(e.startsAt).toISOString() },
  capacity: { integerValue: String(e.capacity) },
  seatsLeft: { integerValue: String(e.capacity) },
  waitNext: { integerValue: "0" },
  waitServed: { integerValue: "0" },
});

const token = await accessToken();
const writes = [];
for (const e of events) {
  if ((await hasDocs(token, e.id, "tickets")) || (await hasDocs(token, e.id, "waitlist"))) {
    console.log(`skip   ${e.id}: already has tickets or a waitlist`);
    continue;
  }
  console.log(`${confirm ? "write " : "would write"}  ${e.id}: ${e.name}, ${e.capacity} seats, ${e.startsAt}`);
  writes.push({ update: { name: `projects/${projectId}/databases/(default)/documents/events/${e.id}`, fields: fields(e) } });
}

if (!confirm) {
  console.log(`\nDry run for project "${projectId}". Re-run with --confirm to write.`);
} else if (writes.length) {
  await api(token, "POST", `${base}:commit`, { writes }); // one atomic commit
  console.log(`\nWrote ${writes.length} event(s) to "${projectId}".`);
} else {
  console.log("\nNothing to write.");
}
