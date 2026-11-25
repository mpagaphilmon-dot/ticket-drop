# Review notes: what AI got right, what I changed, what I rejected

**Philmon Mpaga** · The AI Colony Academy · AI for Software Engineering, Week 8 Capstone · 25 November 2026

Tool: Claude Code (Claude Opus 5.5) in VS Code. Every item below happened during this build;
each one has the evidence that settled it.

## What AI got right (kept after review)

| Area | Decision | How I checked it |
| --- | --- | --- |
| Data model | Ticket id = user id (`events/{e}/tickets/{uid}`), so "one per person" is structural | R2/R4 tests; double-click in the real UI took exactly one seat (10 → 9) |
| Security model | Rules check **both sides** of every write (event ↔ ticket/waitlist) | 13 attack tests that bypass the app and write directly; all refused |
| Testability | `ticketApi(db, fs)` takes Firestore functions as a parameter, so browser and tests run the same file | Tests import `public/js/tickets.js` directly; no copy of the logic exists |
| R6 on the free plan | "Held seat": a cancelled seat is reserved for the next waitlist position; only that person can claim it | R6 tests + manual run: cancel kept the event "Sold out", student08 saw "A seat is held for you" |
| XSS | All text set with `textContent` via `h()`; no `innerHTML` with data | Code search: `innerHTML` does not appear in `public/` |

## Reject log: AI suggestions or outputs I declined or changed

| # | What was proposed / produced | What I did instead | Why |
| --- | --- | --- | --- |
| 1 | Install `firebase@13.4.0`; npm refused (peer conflict with `@firebase/rules-unit-testing@5`). Easy fix: `--force`. | **Rejected `--force`.** Pinned `firebase@12.19.0` in npm *and* the browser CDN. | `--force` installs a combination the test library does not support; tests could pass while testing nothing real. Same SDK version in tests and browser. |
| 2 | First claim code: a plain transaction. The race test failed with `PERMISSION_DENIED` (rules rejected the loser of two overlapping transactions). The tempting fix: relax the rule. | **Kept the rules strict**; added a bounded retry on `permission-denied` in `tickets.js` (60 tries, jitter). | Loosening the rule would reopen overselling. A denial during a race means "data changed"; a fresh read gives the true answer (`sold-out` / `already`). Race test then passed 3/3. |
| 3 | Anonymous sign-in (fastest to build). | **Rejected.** Email + password. | A private window gives a new anonymous identity, which defeats R2 (one ticket per person). |
| 4 | Cloud Functions for claims and the waitlist. | **Rejected for v1.** Spark plan + rules + held-seat design. | Functions need the Blaze (billing) plan. The held-seat design meets R6 with no server code. |
| 5 | `firebase-admin` for the seed script. Its install hung for hours on a slow network. | **Removed it.** Seed uses the Auth emulator REST API + `withSecurityRulesDisabled`. | Dozens of heavy packages for an emulator-only script; fewer dependencies, same result. |
| 6 | Event page re-rendered the whole panel on every live update. | **Changed** to rebuild only when the screen key changes. | Found in review: a seat change while typing would wipe the sign-in form and replay animations. |
| 7 | Test script `node --test test/` | **Fixed** to `node --test test/*.test.js`. | On Node 22 a directory argument is treated as a file; the first run "failed" without running any test. |
| 8 | Aurora background used `filter: blur(70px)` on huge animated layers, and sat behind the body background (invisible). | **Changed** to soft gradients moved with `transform` only, background moved to `<html>`. | Invisible effect + renderer freezes in Chrome on this machine. |
| 9 | "Selling fast" at ≤ 30% seats left. | **Changed** to ≤ 40% or ≤ 3 seats. | Seen in the UI: 2 of 5 seats left showed "Available", which is misleading. |
| 10 | Create production events through the Firebase console (browser automation). The timestamp widget never enabled "Save". | **Replaced** with `scripts/seed-prod.js`: dry run by default, `--confirm` to write, one atomic commit, **skips any event that already has tickets**. | Repeatable and reviewable; cannot reset seats under real ticket holders. |
| 11 | Deploy over the existing BMS dashboard hosting site. | **Changed** to a new site `ticketing-drop` and *disabled* (not deleted) the old one. | Clean URL; old site can be rolled back if ever needed. |

## Security, privacy, IP and routing decisions

- **Enforcement lives in `firestore.rules`.** The browser is untrusted; UI checks are UX only.
- **Public web config** (`apiKey`, `appId`) is committed on purpose: it identifies the project, it is not a secret.
- **Test credentials** (`student01…20@example.com`, one shared password) exist only in the emulator seed.
- **No personal data in public identifiers**: the hosting site id is `ticketing-drop`, not my name.
- **Production seeding** borrows a short-lived token from my own `firebase login` in memory; it is never printed or saved.
- **IP**: all code written for this project; fonts are Google Fonts (open licences); no copied third-party code.
- **Review routing**: changes to `firestore.rules` or `tickets.js` need the full test suite + the race test 3×
  before merge (see `docs/PR-REVIEW.md`).
