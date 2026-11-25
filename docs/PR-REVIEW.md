# PR review norms

**Philmon Mpaga** · The AI Colony Academy · AI for Software Engineering, Week 8 Capstone · 25 November 2026

Small PRs, one concern each. A PR is ready for review when the author can explain every changed line.

## Author checklist (in the PR description)
- [ ] Which requirement (R1–R6) or issue this changes, and why.
- [ ] `npm test` output: all green. If `firestore.rules` or `tickets.js` changed: race test run **3 times**.
- [ ] New behaviour has a behaviour test; new rule paths have an **attack test** (`assertFails`).
- [ ] Screenshots for any visible UI change (including the error state).
- [ ] AI use: what the agent generated, what you changed or rejected (one line each).

## Reviewer checklist
- **Security first.** Is every new write path enforced in `firestore.rules`, checked from both sides? Could a client do half the action?
- **No loosened rules.** A rule change that makes a test pass by allowing more is rejected unless the spec changed.
- **Tests assert state**, not just return values (`seatsLeft`, ticket ids).
- **UI**: text via `textContent`; errors are plain sentences; animations respect reduced motion.
- **Scope**: only the files the task needs (see `AGENTS.md` §3).

## Routing
| Change touches | Needs |
| --- | --- |
| `firestore.rules`, `public/js/tickets.js` | Owner review + race test ×3 |
| `scripts/seed-prod.js`, deploy config | Owner review; dry run output pasted in the PR |
| UI only (`public/css`, `public/*.html`, render code) | Any reviewer + screenshots |
| `AGENTS.md` | Owner approval (see its change process) |

## Merge
Squash-merge with a message that says *why*. Deploy only from `main`, only with green tests.
