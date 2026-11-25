// Behaviour (through the app code) and attack (direct writes) tests, one block
// per requirement in docs/SPEC.md.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { as, event, seedEvent, startEnv, ticketIds } from "./helpers.js";

let env;
before(async () => { env = await startEnv(); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const ticketData = () => ({ code: "ABCDEFGH", createdAt: serverTimestamp() });

describe("R1 the page shows seats left", () => {
  test("a visitor who is not signed in can read the event and seatsLeft", async () => {
    await seedEvent(env, "e1", { capacity: 10, seatsLeft: 7 });
    const visitor = env.unauthenticatedContext().firestore();
    const snap = await assertSucceeds(getDoc(doc(visitor, "events/e1")));
    assert.equal(snap.data().seatsLeft, 7);
  });

  test("a visitor cannot read anyone's ticket", async () => {
    await seedEvent(env, "e1");
    await as(env, "alice").api.claim("e1", "alice");
    const visitor = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(visitor, "events/e1/tickets/alice")));
  });
});

describe("R2 one ticket per person per event", () => {
  test("claiming again returns the same ticket and takes one seat", async () => {
    await seedEvent(env, "e1", { capacity: 10 });
    const { api } = as(env, "alice");
    const first = await api.claim("e1", "alice");
    const second = await api.claim("e1", "alice");
    assert.equal(first.status, "claimed");
    assert.match(first.code, /^[A-Z2-9]{8}$/);
    assert.deepEqual(second, { status: "already", code: first.code });
    assert.equal((await event(env, "e1")).seatsLeft, 9);
    assert.deepEqual(await ticketIds(env, "e1"), ["alice"]);
  });

  test("attack: a user cannot create a ticket for someone else", async () => {
    await seedEvent(env, "e1", { capacity: 10 });
    const { db } = as(env, "alice");
    const batch = writeBatch(db);
    batch.update(doc(db, "events/e1"), { seatsLeft: 9 });
    batch.set(doc(db, "events/e1/tickets/bob"), ticketData());
    await assertFails(batch.commit());
  });

  test("attack: a user cannot read someone else's ticket", async () => {
    await seedEvent(env, "e1");
    await as(env, "alice").api.claim("e1", "alice");
    await assertFails(getDoc(doc(as(env, "bob").db, "events/e1/tickets/alice")));
  });
});

describe("R3 never issue more tickets than seats", () => {
  test("attack: a ticket without lowering seatsLeft is refused", async () => {
    await seedEvent(env, "e1", { capacity: 10 });
    const { db } = as(env, "alice");
    const batch = writeBatch(db);
    batch.set(doc(db, "events/e1/tickets/alice"), ticketData());
    await assertFails(batch.commit());
  });

  test("attack: lowering seatsLeft by 2 for one ticket is refused", async () => {
    await seedEvent(env, "e1", { capacity: 10 });
    const { db } = as(env, "alice");
    const batch = writeBatch(db);
    batch.update(doc(db, "events/e1"), { seatsLeft: 8 });
    batch.set(doc(db, "events/e1/tickets/alice"), ticketData());
    await assertFails(batch.commit());
  });

  test("attack: seatsLeft cannot go below 0", async () => {
    await seedEvent(env, "e1", { capacity: 10, seatsLeft: 0 });
    const { db } = as(env, "alice");
    const batch = writeBatch(db);
    batch.update(doc(db, "events/e1"), { seatsLeft: -1 });
    batch.set(doc(db, "events/e1/tickets/alice"), ticketData());
    await assertFails(batch.commit());
  });

  test("attack: raising seatsLeft or capacity directly is refused", async () => {
    await seedEvent(env, "e1", { capacity: 10, seatsLeft: 0 });
    const { db } = as(env, "alice");
    const raiseSeats = writeBatch(db);
    raiseSeats.update(doc(db, "events/e1"), { seatsLeft: 100 });
    await assertFails(raiseSeats.commit());
    const raiseCapacity = writeBatch(db);
    raiseCapacity.update(doc(db, "events/e1"), { capacity: 100 });
    await assertFails(raiseCapacity.commit());
  });

  test("attack: lowering seatsLeft without a new ticket is refused", async () => {
    await seedEvent(env, "e1", { capacity: 10 });
    const { db } = as(env, "alice");
    const batch = writeBatch(db);
    batch.update(doc(db, "events/e1"), { seatsLeft: 9 });
    await assertFails(batch.commit());
  });
});

describe("R4 tapping twice or retrying claims only once", () => {
  test("two simultaneous claims by the same user give one ticket and one decrement", async () => {
    await seedEvent(env, "e1", { capacity: 10 });
    // Two separate clients for the same user, like two tabs or a double tap.
    const tab1 = as(env, "alice").api;
    const tab2 = as(env, "alice").api;
    const results = await Promise.all([tab1.claim("e1", "alice"), tab2.claim("e1", "alice")]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, ["already", "claimed"]);
    assert.equal(results[0].code, results[1].code);
    assert.equal((await event(env, "e1")).seatsLeft, 9);
    assert.deepEqual(await ticketIds(env, "e1"), ["alice"]);
  });
});

describe("R5 sold out is clear and offers a waitlist", () => {
  test("a claim when sold out returns sold-out and creates no ticket", async () => {
    await seedEvent(env, "e1", { capacity: 2, seatsLeft: 0 });
    const result = await as(env, "alice").api.claim("e1", "alice");
    assert.deepEqual(result, { status: "sold-out" });
    assert.deepEqual(await ticketIds(env, "e1"), []);
  });

  test("joining gives a position; joining twice keeps one place", async () => {
    await seedEvent(env, "e1", { capacity: 2, seatsLeft: 0 });
    const alice = as(env, "alice").api;
    const bob = as(env, "bob").api;
    assert.deepEqual(await alice.joinWaitlist("e1", "alice"), { status: "waiting", position: 1 });
    assert.deepEqual(await bob.joinWaitlist("e1", "bob"), { status: "waiting", position: 2 });
    assert.deepEqual(await alice.joinWaitlist("e1", "alice"), { status: "waiting", position: 1 });
    assert.equal((await event(env, "e1")).waitNext, 2);
  });

  test("cannot join the waitlist while seats are left", async () => {
    await seedEvent(env, "e1", { capacity: 2 });
    const { db, api } = as(env, "alice");
    assert.deepEqual(await api.joinWaitlist("e1", "alice"), { status: "seats-available" });
    const batch = writeBatch(db);
    batch.update(doc(db, "events/e1"), { waitNext: 1 });
    batch.set(doc(db, "events/e1/waitlist/alice"), { pos: 0, joinedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });

  test("cannot join the waitlist while holding a ticket", async () => {
    await seedEvent(env, "e1", { capacity: 1 });
    const { db, api } = as(env, "alice");
    await api.claim("e1", "alice");
    const batch = writeBatch(db);
    batch.update(doc(db, "events/e1"), { waitNext: 1 });
    batch.set(doc(db, "events/e1/waitlist/alice"), { pos: 0, joinedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });

  test("attack: cannot take a waitlist position other than the next one", async () => {
    await seedEvent(env, "e1", { capacity: 1, seatsLeft: 0, waitNext: 3, waitServed: 0 });
    const { db } = as(env, "alice");
    const batch = writeBatch(db);
    batch.update(doc(db, "events/e1"), { waitNext: 4 });
    batch.set(doc(db, "events/e1/waitlist/alice"), { pos: 0, joinedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });
});

describe("R6 cancelling frees the seat for the next person on the waitlist", () => {
  // alice holds the only seat, bob then carol join the waitlist.
  async function soldOutWithQueue() {
    await seedEvent(env, "e1", { capacity: 1 });
    await as(env, "alice").api.claim("e1", "alice");
    await as(env, "bob").api.joinWaitlist("e1", "bob");
    await as(env, "carol").api.joinWaitlist("e1", "carol");
  }

  test("a cancelled seat is held for the first waiting person, and only they can claim it", async () => {
    await soldOutWithQueue();
    assert.deepEqual(await as(env, "alice").api.cancel("e1", "alice"), { status: "cancelled" });

    const e = await event(env, "e1");
    assert.equal(e.seatsLeft, 0, "the seat is held, not released to everyone");
    assert.equal(e.waitServed, 1);

    assert.deepEqual(await as(env, "dave").api.claim("e1", "dave"), { status: "sold-out" });
    assert.deepEqual(await as(env, "carol").api.claim("e1", "carol"), { status: "waiting", position: 1 });

    const bob = await as(env, "bob").api.claim("e1", "bob");
    assert.equal(bob.status, "claimed");
    assert.deepEqual(await ticketIds(env, "e1"), ["bob"]);
  });

  test("attack: someone not served yet cannot claim the held seat", async () => {
    await soldOutWithQueue();
    await as(env, "alice").api.cancel("e1", "alice");
    const { db } = as(env, "carol");
    const batch = writeBatch(db);
    batch.set(doc(db, "events/e1/tickets/carol"), ticketData());
    batch.delete(doc(db, "events/e1/waitlist/carol"));
    await assertFails(batch.commit());
  });

  test("attack: someone not on the waitlist cannot take the held seat", async () => {
    await soldOutWithQueue();
    await as(env, "alice").api.cancel("e1", "alice");
    const { db } = as(env, "dave");
    const batch = writeBatch(db);
    batch.set(doc(db, "events/e1/tickets/dave"), ticketData());
    await assertFails(batch.commit());
  });

  test("with nobody waiting, cancelling adds the seat back", async () => {
    await seedEvent(env, "e1", { capacity: 5 });
    await as(env, "alice").api.claim("e1", "alice");
    assert.equal((await event(env, "e1")).seatsLeft, 4);
    await as(env, "alice").api.cancel("e1", "alice");
    assert.equal((await event(env, "e1")).seatsLeft, 5);
    assert.deepEqual(await ticketIds(env, "e1"), []);
  });

  test("attack: only the owner can cancel a ticket", async () => {
    await seedEvent(env, "e1", { capacity: 5 });
    await as(env, "alice").api.claim("e1", "alice");
    const { db } = as(env, "bob");
    const batch = writeBatch(db);
    batch.update(doc(db, "events/e1"), { seatsLeft: 5 });
    batch.delete(doc(db, "events/e1/tickets/alice"));
    await assertFails(batch.commit());
  });

  test("attack: cancel cannot give back more than one seat", async () => {
    await seedEvent(env, "e1", { capacity: 5 });
    const { db, api } = as(env, "alice");
    await api.claim("e1", "alice");
    const batch = writeBatch(db);
    batch.update(doc(db, "events/e1"), { seatsLeft: 5 + 1 });
    batch.delete(doc(db, "events/e1/tickets/alice"));
    await assertFails(batch.commit());
  });
});
