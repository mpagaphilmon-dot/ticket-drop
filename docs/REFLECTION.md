# Reflection: Ticket Drop

**Philmon Mpaga** · The AI Colony Academy · AI for Software Engineering, Week 8 Capstone · 25 November 2026

> Draft prepared with AI assistance from my build notes. I have read it, and I edit it into my own words before submitting.

My capstone was Ticket Drop, where the hard part is many students claiming the last seats at the same
moment. I built it on Firebase's free plan with plain HTML, CSS and JavaScript; it is live at ticketing-drop.web.app.

**Where AI helped.** Claude Code was most useful for turning the brief into a structure I could check.
It drafted a one-page spec with acceptance criteria per requirement, then proposed a data model where
the ticket document id *is* the user id, so "one ticket per person" holds by construction rather than by
a check someone can forget. It wrote Firestore security rules that verify both halves of every action
(a ticket can only be created if the seat count drops by exactly one, and vice versa), and a test suite
with two kinds of test: behaviour tests through the real app code and "attack" tests that bypass the app
and write straight to the database like a cheating browser would. It also produced the visual design
quickly, so my time went into review.

**Where AI failed or needed correcting.** The most important failure was the race condition itself. The
first claim code passed every single-user test but failed the brief's key test, 50 claims for 10 seats,
with permission errors. The easy fix would have been to loosen the security rule; I rejected that because
it would reopen overselling. Instead the client now treats a denial during a race as "the data changed"
and re-reads, and the race test passes consistently. Other corrections: npm suggested `--force` for a
version conflict (I pinned a compatible version instead); the test command was wrong for Node 22; a
redesign rebuilt the page on every live update, which would have erased what a user was typing; and an
animated blur effect froze the browser. When console data entry failed, I wrote a seed script that refuses
to overwrite events with tickets. My reject log lists eleven such decisions.

**How I verified correctness and security.** I did not trust "it works on my screen". The 23 automated
tests run against the Firebase emulator and assert the final database state, not just return values.
Thirteen of them are attacks: creating a ticket for someone else, lowering seats without a ticket,
raising seats, jumping the waitlist, cancelling someone else's ticket. All are refused by the rules. I
ran the race test repeatedly, then walked every screen in the browser: a double-click took exactly one
seat, and a cancellation correctly held the seat for the first person on the waitlist instead of releasing
it to everyone. On security I chose email sign-in over anonymous sign-in, because a private window would
otherwise give a new identity and defeat the one-ticket rule. All text is inserted as text, never HTML.
The known limitation is that the rule is one ticket per account, not per human; that is in the handoff.

**AI-use declaration.** I used Claude Code (Claude Opus 5.5) throughout: to draft the spec, security
rules, application code, tests, styling and documentation, and to run commands for testing and
deployment. I set the direction and made the decisions: the idea and its scope, Firebase's free plan
over a paid plan or my own server, email sign-in, the held-seat waitlist design, and approving each
milestone. I reviewed the generated code, rejected or changed the suggestions listed in my reject log,
and verified behaviour with tests and in the browser. I can explain every rule, test and design decision
in this repository.
