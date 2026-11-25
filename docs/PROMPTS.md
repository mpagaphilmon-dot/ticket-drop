# Prompts and context used

**Philmon Mpaga** · The AI Colony Academy · AI for Software Engineering, Week 8 Capstone · 25 November 2026

## Context given to the agent
| Source | What it contributed |
| --- | --- |
| Capstone sheet, row "Ticket Drop" | Problem, core journey, R1–R6, stretch S1/S2, "rule that can break", done-when, seed data |
| Week 8 brief (course page screenshots) | Submission bundle, evidence list, pass bar, AGENTS.md stretch |
| `docs/SPEC.md` (written first, agreed before code) | Acceptance criteria every test maps to |
| `AGENTS.md` (via `CLAUDE.md`) | Standing rules: rules-first security, one job per file, tests, libraries |

## Key prompts (my words, in order)
1. *"Check the capstone link and the wk8 folder, then I will give further instructions."* (Understand before building.)
2. *"Can we build it, then we use Firebase."* Then, after comparing options: *"Go with Firebase free plan."*
3. *"Assume you are a senior full-stack engineer… first understand the aim, do not assume or hallucinate,
   do not make corrections without telling me first, explain every decision before committing."* (Working agreement.)
4. *"Need a full working system."* (Scope: deployed, not just local.)
5. *"Run tests as recommended. Firebase: you have access through the CLI."*
6. *"Rename it to ticketing… you can remove the existing BMS dashboard."* (Reuse an existing project.)
7. *"Document things as per the requirements… styling at your best, unique, animations, swirl fire, outstanding design."*
8. *"Modern approaches on the buttons like sign out, login."*
9. Chose **"Script via my CLI login"** for creating live events.

## Agent working pattern that worked
- Propose → explain trade-offs → I decide → implement → run tests → show real output (including failures).
- Ask before outward-facing actions (creating projects, deploying, disabling the old site).
- Failures are reported with evidence, not hidden (see the reject log in `docs/REVIEW-NOTES.md`).
