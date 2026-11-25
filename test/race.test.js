// The "rule that can break": many people claim the last seats at the same moment.
// Brief: "A test sends 50 claims for 10 seats and exactly 10 succeed."
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { as, event, seedEvent, startEnv, ticketIds } from "./helpers.js";

let env;
before(async () => { env = await startEnv(); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

test("50 users claim 10 seats at the same moment: exactly 10 succeed", async () => {
  await seedEvent(env, "race", { capacity: 10 });
  const users = Array.from({ length: 50 }, (_, i) => `user${String(i + 1).padStart(2, "0")}`);

  // Each user is a separate client, so the claims really race at the database.
  const results = await Promise.all(users.map((uid) => as(env, uid).api.claim("race", uid)));

  const winners = users.filter((_, i) => results[i].status === "claimed");
  const others = results.filter((r) => r.status !== "claimed").map((r) => r.status);

  assert.equal(winners.length, 10, "exactly 10 claims succeed");
  assert.ok(others.every((s) => s === "sold-out"), `every other claim is sold-out, got: ${[...new Set(others)]}`);
  assert.equal((await event(env, "race")).seatsLeft, 0);
  assert.deepEqual(await ticketIds(env, "race"), winners.sort(), "tickets in the database match the winners");
});
