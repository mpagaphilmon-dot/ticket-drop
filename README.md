# Ticket Drop

**Philmon Mpaga** · The AI Colony Academy · AI for Software Engineering, Week 8 Capstone · 25 November 2026

Fair ticket drops for popular student events: one ticket per person, never more tickets than
seats, and a fair waitlist when it sells out.

**Live:** https://ticketing-drop.web.app

Built on the Firebase **Spark (free) plan**: Hosting, Firestore and Auth, with plain HTML, CSS and
JavaScript. There is no server code; `firestore.rules` enforces every rule in [`docs/SPEC.md`](docs/SPEC.md).

## Requirements

- Node.js 20+
- Java 11+ (for the Firebase emulators)
- Firebase CLI: `npm install -g firebase-tools`

## Setup

```sh
npm install
```

## Run the tests

```sh
npm test
```

Starts the Firestore and Auth emulators, runs `test/*.test.js` (23 tests) and stops the emulators.
This includes the race test: 50 users claim 10 seats at the same moment and exactly 10 succeed,
and attack tests that write to the database directly the way a cheating browser could.

## Run it locally

```sh
npm run dev      # terminal 1: emulators + site at http://localhost:5000
npm run seed     # terminal 2: 3 events, 20 users (student01@example.com … student20@example.com)
```

The seed script prints the test password. The emulator UI is at http://localhost:4000.

## Deploy

```sh
npm test                                              # must be green
firebase deploy --only firestore:rules,hosting        # project from .firebaserc
node scripts/seed-prod.js                             # dry run: shows the launch events
node scripts/seed-prod.js --confirm                   # creates them (skips events that have tickets)
```

Setting up a new project: create it in the Firebase console (no billing needed), enable
**Authentication → Email/Password**, create a **Firestore** database, add a web app and copy its
config into `public/js/config.js`, then `firebase use --add`.

## Project layout

```
AGENTS.md             team-owned rules for people and AI agents (CLAUDE.md imports it)
docs/SPEC.md          requirements R1–R6 and acceptance criteria
docs/                 reflection, review notes + reject log, handoff, PR norms, prompts, presentation, evidence/
firestore.rules       security rules: what is enforced
public/               the site (plain HTML/CSS/JS)
  js/tickets.js       claim / cancel / join waitlist (shared with the tests)
scripts/seed.js       emulator-only seed data
scripts/seed-prod.js  launch events for the real project (owner only)
test/                 behaviour, attack and race tests
```
