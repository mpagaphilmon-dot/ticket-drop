# Presentation (5–7 min) and demo video (3–4 min)

**Philmon Mpaga** · The AI Colony Academy · AI for Software Engineering, Week 8 Capstone · 25 November 2026

## Slides / talking points (about 6 minutes)

1. **The problem (30 s).** Popular events sell out in seconds; unfair systems let some grab many. Brief: Ticket Drop.
2. **What I shipped (45 s).** Live at ticketing-drop.web.app. Core journey + sold out + waitlist + held seat. Firebase free plan, no server code.
3. **The rule that can break (60 s).** 50 people, 10 seats, same moment. Show the data model (ticket id = user id) and the two-sided rule: *a ticket needs exactly one fewer seat; one fewer seat needs a new ticket.*
4. **Proof (60 s).** `npm test`: 23/23. Point at the race test and two attack tests (ticket for someone else; seats lowered without a ticket). "The rules hold even when my app code is bypassed."
5. **Where AI helped (45 s).** Spec → data model → rules → tests → design, fast. I spent my time reviewing.
6. **Where AI failed and how I stayed in control (75 s).** The race test failed; the tempting fix was weakening the rule. I refused, and the client re-reads instead. Two more from the reject log (anonymous auth rejected; `--force` rejected). Every outward action was approved by me.
7. **Risks and next steps (30 s).** One ticket per account, not per human; held-seat expiry; App Check. Rollback plan exists.

## Demo video script (3–4 min), as "done when" asks

| Time | Show | Say |
| --- | --- | --- |
| 0:00 | Home page | "Live seat counts; Selling fast when nearly gone." |
| 0:20 | Event page, sign in | Ring meter, sign-in toggle. |
| 0:40 | **Double-click Get ticket** | "A retry does not double claim: 10 → 9, one ticket code." |
| 1:10 | Second browser, sold-out event | **Sold out** stamp, Join waitlist → position #2. |
| 1:40 | First browser cancels | Second browser updates live: **A seat is held for you** → Claim. |
| 2:20 | Terminal: `npm test` | Race test: 50 claims, 10 seats, exactly 10 succeed; attack tests refused. |
| 3:00 | Error screen | Turn off network, try to claim: plain-sentence error + Retry. |
| 3:20 | Share link | Opens the event with seats left, signed out. |
