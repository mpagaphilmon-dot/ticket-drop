// Ticket actions: claim, cancel, join waitlist.
//
// The Firestore functions are passed in (`fs`) instead of imported, so this same
// file runs in the browser (Firebase from the CDN) and in the tests (Firebase from
// npm). Each action is one transaction; firestore.rules refuses anything that
// does not follow docs/SPEC.md, so these functions cannot cheat even if edited.
//
// Every action returns a plain result object: { status, ... }.

// No 0/O or 1/I/L, so a code read out loud is not misheard.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newTicketCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

// Many people claiming at once makes transactions retry. The SDK default (5)
// is too low for a sell-out rush; a refused claim should mean "sold out",
// not "gave up".
const MAX_ATTEMPTS = 100;

// When two transactions overlap, the rules check the loser's write against the
// winner's newer data (e.g. "seatsLeft 9 is not 9 - 1") and refuse it with
// permission-denied, which the SDK does not retry. That refusal means "the data
// changed under you", so we re-read and try again: the fresh read then returns
// the right answer (sold-out, already, ...). A write the rules truly forbid is
// refused every time and surfaces after MAX_RACE_RETRIES.
const MAX_RACE_RETRIES = 60;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function ticketApi(db, fs) {
  const { doc, runTransaction: sdkRunTransaction, serverTimestamp } = fs;

  async function runTransaction(database, fn, options) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await sdkRunTransaction(database, fn, options);
      } catch (error) {
        if (error?.code !== "permission-denied" || attempt >= MAX_RACE_RETRIES) throw error;
        await pause(10 + Math.random() * 40 * Math.min(attempt, 5)); // jitter spreads out the retries
      }
    }
  }

  const refs = (eventId, uid) => ({
    event: doc(db, "events", eventId),
    ticket: doc(db, "events", eventId, "tickets", uid),
    wait: doc(db, "events", eventId, "waitlist", uid),
  });

  async function readAll(tx, r) {
    const [event, ticket, wait] = await Promise.all([
      tx.get(r.event),
      tx.get(r.ticket),
      tx.get(r.wait),
    ]);
    return { event, ticket, wait };
  }

  // Position in the queue, counting from 1 (1 = next to be offered a seat).
  const queuePosition = (pos, event) => pos - event.waitServed + 1;

  // R2, R3, R4: take a free seat, or a seat held for you. Claiming again
  // returns the ticket you already have instead of a second one.
  async function claim(eventId, uid) {
    const r = refs(eventId, uid);
    return runTransaction(
      db,
      async (tx) => {
        const { event, ticket, wait } = await readAll(tx, r);
        if (!event.exists()) return { status: "not-found" };
        if (ticket.exists()) return { status: "already", code: ticket.data().code };

        const e = event.data();
        const code = newTicketCode();
        const data = { code, createdAt: serverTimestamp() };

        if (wait.exists()) {
          const pos = wait.data().pos;
          if (pos < e.waitServed) {
            tx.set(r.ticket, data);
            tx.delete(r.wait);
            return { status: "claimed", code };
          }
          return { status: "waiting", position: queuePosition(pos, e) };
        }

        if (e.seatsLeft <= 0) return { status: "sold-out" };
        tx.update(r.event, { seatsLeft: e.seatsLeft - 1 });
        tx.set(r.ticket, data);
        return { status: "claimed", code };
      },
      { maxAttempts: MAX_ATTEMPTS }
    );
  }

  // R6: give the seat back. If someone is waiting it is held for them.
  async function cancel(eventId, uid) {
    const r = refs(eventId, uid);
    return runTransaction(
      db,
      async (tx) => {
        const { event, ticket } = await readAll(tx, r);
        if (!event.exists()) return { status: "not-found" };
        if (!ticket.exists()) return { status: "no-ticket" };

        const e = event.data();
        if (e.waitServed < e.waitNext) {
          tx.update(r.event, { waitServed: e.waitServed + 1 });
        } else {
          tx.update(r.event, { seatsLeft: e.seatsLeft + 1 });
        }
        tx.delete(r.ticket);
        return { status: "cancelled" };
      },
      { maxAttempts: MAX_ATTEMPTS }
    );
  }

  // R5: join the waitlist when sold out. Joining twice keeps one place.
  async function joinWaitlist(eventId, uid) {
    const r = refs(eventId, uid);
    return runTransaction(
      db,
      async (tx) => {
        const { event, ticket, wait } = await readAll(tx, r);
        if (!event.exists()) return { status: "not-found" };
        if (ticket.exists()) return { status: "already", code: ticket.data().code };

        const e = event.data();
        if (wait.exists()) {
          return { status: "waiting", position: queuePosition(wait.data().pos, e) };
        }
        if (e.seatsLeft > 0) return { status: "seats-available" };

        tx.set(r.wait, { pos: e.waitNext, joinedAt: serverTimestamp() });
        tx.update(r.event, { waitNext: e.waitNext + 1 });
        return { status: "waiting", position: queuePosition(e.waitNext, e) };
      },
      { maxAttempts: MAX_ATTEMPTS }
    );
  }

  return { claim, cancel, joinWaitlist };
}
