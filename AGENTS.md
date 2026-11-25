# AGENTS.md: rules for humans and AI agents working on Ticket Drop

**Philmon Mpaga** · The AI Colony Academy · AI for Software Engineering, Week 8 Capstone · 25 November 2026

Ticket Drop: fair ticket claiming for popular student events. Firebase **Spark (free) plan**:
Hosting + Firestore + Auth, **no Cloud Functions**. Plain HTML/CSS/JS, no framework, no bundler.
Each rule has a short *why* so you can apply it to cases the examples don't cover.

## 0. Ownership and change process

| | |
| --- | --- |
| **Owner** | Philmon Mpaga (capstone author). Final say on every rule. |
| **Applies to** | Every contributor and every AI coding agent (Claude Code reads this via `CLAUDE.md`). |
| **Review cadence** | Re-read at the start of each milestone and after any incident (a failing test that reached `main`, a security finding, a rule an agent kept breaking). At least monthly while the project is active. |
| **Change process** | 1. Open a PR that edits this file only. 2. Say which rule changes and the *why* (the failure or decision behind it). 3. Owner approves. 4. If a rule is removed, delete or update the tests/code it protected in the same PR. |
| **Rationale log** | Each rule carries its *why* inline. Real incidents behind them are listed in `docs/REVIEW-NOTES.md`. |

## 1. Source of truth

| Question | Read this |
| --- | --- |
| What the app must do | `docs/SPEC.md` (requirements R1–R6 and acceptance criteria) |
| What is enforced | `firestore.rules` |
| How actions work | `public/js/tickets.js` |
| How it is tested | `test/*.test.js` |
| How to run / deploy | `README.md` |

If code and spec disagree, stop and ask; do not "fix" the spec to match the code.

## 2. Security: the browser is untrusted

- **Every** rule in the spec (one ticket per person, never oversell, waitlist order, held seats)
  must be enforced in `firestore.rules`. Checks in `tickets.js` or the UI are for a good experience only.
  *Why:* there is no server code on the Spark plan. Anyone can open dev tools and write to
  Firestore directly; only the rules stand between them and the data.
- Check both sides of every action: the event write must require the matching ticket/waitlist
  write, and the ticket/waitlist write must require the matching event write
  (`exists` / `existsAfter` / `get` / `getAfter`).
  *Why:* checking only one side lets a client do the other half alone (e.g. decrement seats
  without a ticket, or create a ticket without decrementing).
- New fields or collections are denied by default. Add an explicit, minimal `allow`.
- Never loosen a rule to make a test or a race pass. Fix the client instead (see §4).
- Never put secrets in `public/`. The web config in `public/js/config.js` is a public identifier, not a secret.

## 3. Structure: one job per file

| File | Job | Must not |
| --- | --- | --- |
| `public/js/tickets.js` | claim / cancel / joinWaitlist, one Firestore transaction each | touch the DOM, import Firebase directly |
| `public/js/firebase.js` | initialise Firebase, choose emulator vs real project | contain app logic |
| `public/js/ui.js` | DOM helpers, icons, formatting, friendly error text | read or write Firestore |
| `public/js/event.js`, `index.js` | page state + render | re-implement claim/cancel logic |
| `firestore.rules` | enforce the spec | trust any field the client sends without checking |
| `scripts/seed.js` | emulator data only | ever target a real project |
| `scripts/seed-prod.js` | create launch events in the real project | overwrite an event that has tickets or a waitlist |

- `tickets.js` receives Firestore functions as a parameter (`ticketApi(db, fs)`).
  *Why:* the same file then runs in the browser (CDN SDK) and in the tests (npm SDK), so the
  tests exercise the real code, not a copy.
- Keep changes small: touch only the files the task needs. Don't reformat or rename unrelated code.

## 4. Data and concurrency

- The ticket document id **is** the user id: `events/{eventId}/tickets/{uid}`. Same for the waitlist.
  *Why:* "one per person per event" then holds by construction, and a retry finds the existing ticket.
- Every change to `seatsLeft`, `waitNext` or `waitServed` happens inside a transaction together
  with the matching ticket/waitlist write. Never use a blind `increment()` or a write outside a transaction.
- Transactions use `maxAttempts: 100`.
  *Why:* the SDK default (5) makes claims give up during a rush; a refused claim must mean "sold out".
- `tickets.js` retries a transaction refused with `permission-denied` (up to 60 times, with jitter).
  *Why:* when two transactions overlap, the rules check the loser's write against the winner's newer
  data and refuse it; the SDK does not retry that. A fresh read then returns the right answer
  (`sold-out`, `already`). Without this the race test fails.

## 5. UI

- Set text with `textContent` (the `h()` helper), never `innerHTML` with data.
  *Why:* event names and emails come from the database; `innerHTML` would allow script injection.
- Show errors as a plain sentence via `friendlyError()`, with a Retry where it makes sense. No raw codes.
- One state object; the action panel is rebuilt **only when its screen key changes**.
  *Why:* live updates arrive constantly; rebuilding on every update replayed animations and wiped a half-typed sign-in form.
- Every animation must stop under `prefers-reduced-motion`. Keep text contrast readable on the dark theme.
- Animate with `transform`/`opacity` only; no `filter: blur()` on large animated layers.
  *Why:* the blurred aurora froze Chrome's renderer on a low-end machine.

## 6. Tests

- Node's built-in runner (`node:test`) + `@firebase/rules-unit-testing` against the emulator.
  Run with `npm test` (starts and stops the emulators). All tests must pass before you finish.
- Each requirement gets **behaviour tests** (through `tickets.js`) and **attack tests**
  (direct `writeBatch` writes that a cheating client could send, asserted with `assertFails`).
  *Why:* behaviour tests prove the app works; attack tests prove the rules hold when the app is bypassed.
- Assert the final database state (`seatsLeft`, ticket ids), not only the returned status.
- The race test (50 claims, 10 seats, exactly 10 succeed) must stay green. Run it 3 times after touching concurrency code.

## 7. Libraries

- Browser: Firebase JS SDK from `https://www.gstatic.com/firebasejs/<version>/`, pinned to the
  **same version** as the `firebase` devDependency (currently 12.19.0). Fonts from Google Fonts.
  *Why:* tests and browser must run the same SDK; `@firebase/rules-unit-testing` 5.x requires firebase 12.
- Dev only: `firebase`, `@firebase/rules-unit-testing` (tests and the seed script).
  Don't add a framework, bundler or test library without asking.
  *Why:* `firebase-admin` was dropped: it pulled in dozens of Google Cloud packages only for
  the emulator seed (and hung the install on a slow network); the emulator REST API covers it.

## 8. Environments and deployment

- Local: emulators with project id `demo-ticket-drop` (the `demo-` prefix means no real project is touched).
- Production: project `bmsbalancing` (display name "ticketing"), Hosting site `ticketing-drop`.
  Deploy only when asked: `firebase deploy --only firestore:rules,hosting`.
- Never deploy with failing tests. Never deploy rules that have not been run against the test suite.
