# Handoff note: Ticket Drop v1

**Philmon Mpaga** · The AI Colony Academy · AI for Software Engineering, Week 8 Capstone · 25 November 2026

**Live:** https://ticketing-drop.web.app · **Firebase project:** `bmsbalancing` ("ticketing"), Spark plan ·
**Firestore:** `(default)`, `africa-south1` · **Hosting site:** `ticketing-drop`

## What shipped
The full core journey (see seats → Get ticket → ticket code → share link), sold-out + waitlist,
cancel with a held seat for the next person, live updates everywhere. R1–R6 from `docs/SPEC.md`
are covered by 23 automated tests (behaviour, attack and race) and were walked through in the browser.

## How to verify in 2 minutes
```sh
npm install
npm test                 # 23/23, includes 50 claims for 10 seats -> exactly 10
npm run dev              # terminal 1, then open http://localhost:5000
npm run seed             # terminal 2: 3 events, 20 test users
```

## Risks (known, accepted for v1)

| Risk | Impact | Mitigation now | Next step |
| --- | --- | --- | --- |
| One ticket per **account**, not per human | A person with many emails can take many seats | Documented limitation | Email verification; Google sign-in; App Check |
| A held seat is never claimed | That seat stays held | Waitlisted user sees it live and is prompted | Hold expiry (needs a scheduled job → Blaze, or a client-triggered expiry rule) |
| No bot protection | Scripts could hammer claims | Rules still cap tickets at capacity and one per account | Enable Firebase App Check (reCAPTCHA Enterprise) |
| Race retries rely on `permission-denied` meaning "data changed" | A genuinely forbidden write is retried up to 60× before the error shows | Bounded retries with jitter; the app never sends forbidden writes on purpose | Distinguish cases by re-reading state before retrying |
| Spark quotas (50k reads / 20k writes per day) | A very large event could hit the daily cap | Live listeners only on one event doc + own ticket/waitlist doc | Monitor usage in the console; upgrade plan if needed |
| Fonts and SDK load from Google CDNs | Site styling degrades if a CDN is blocked | System font fallbacks in CSS | Self-host fonts if needed |

## Rollback

| What | How |
| --- | --- |
| Website | Firebase console → Hosting → `ticketing-drop` → Release history → **Rollback**, or `firebase hosting:clone ticketing-drop:<VERSION_ID> ticketing-drop:live` |
| Security rules | `git checkout <good-commit> -- firestore.rules && npm test && firebase deploy --only firestore:rules` (console → Firestore → Rules also keeps history) |
| Event data | Events are recreated by `node scripts/seed-prod.js --confirm` (skips events with tickets). Ticket data has no automatic backup on Spark. |
| Old BMS dashboard | Was **disabled, not deleted**: redeploy its code to site `bmsbalancing`, or clone a previous version from its release history. |

## Next steps (in priority order)
1. App Check + email verification (abuse resistance).
2. Held-seat expiry (e.g. 15 min), then stretch S1 (timed live queue) and S2 (lottery when demand ≥ 5× seats).
3. Organiser page (owner-only, enforced in rules) to create events without the seed script.
4. End-to-end browser tests (Playwright) for the screens; today the UI was verified manually.
5. Pre-existing housekeeping: an empty Google Cloud project `ticket-drop-6955` was left by a failed project creation; delete it in the Cloud console if not needed.
