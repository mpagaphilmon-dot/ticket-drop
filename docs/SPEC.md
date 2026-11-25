# Ticket Drop — Spec (v1)

**Philmon Mpaga** · The AI Colony Academy · AI for Software Engineering, Week 8 Capstone · 25 November 2026

## Problem
Students want a seat at a popular event. Tickets sell out in seconds, and unfair
systems let some people grab many while others get none.

## Users
- **Student**: signed in with email + password. Claims, cancels, joins the waitlist.
- **Visitor**: not signed in. Can open an event or share link and see seats left.
- **Organiser**: creates events in the Firebase console or seed script (no organiser UI in v1).

## Core journey
1. Open the event page and see how many seats are left.
2. Tap **Get ticket**.
3. See a confirmation with your ticket code.
4. Open the share link and see the event with the seats left.

## Requirements and acceptance criteria
Each criterion is checked by an automated test (T) or shown in the demo (D).

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| R1 | The page shows seats left. | A visitor who is not signed in can read an event and its `seatsLeft` (T). The number updates without a refresh when someone claims (D). |
| R2 | One ticket per person per event. | A user who holds a ticket and claims again ends up with exactly one ticket and `seatsLeft` drops only once (T). A user cannot create a ticket for another user (T). |
| R3 | Never issue more tickets than seats. | 50 different users claim 10 seats at the same time: exactly 10 tickets exist and `seatsLeft` is 0 (T). A ticket written without lowering `seatsLeft` by exactly 1 is refused (T). `seatsLeft` can never go below 0 (T). |
| R4 | Tapping twice or retrying claims only once. | Two simultaneous claims by the same user produce one ticket and one decrement (T). Pressing the button again after success shows the same ticket code (D). |
| R5 | When sold out, say so clearly and offer a waitlist. | With `seatsLeft = 0`, a claim returns `sold-out` and no ticket (T). The page shows "Sold out" and a **Join waitlist** button (D). Joining gives a position number; joining twice keeps one place (T). A user cannot join the waitlist while seats are left or while holding a ticket (T). |
| R6 | Cancelling a ticket frees the seat for the next person on the waitlist. | If people are waiting, a cancelled seat is **held** for the earliest waiting person: `seatsLeft` stays 0 and only that person can claim it (T). Another user cannot take the held seat (T). If nobody is waiting, cancelling adds 1 to `seatsLeft` (T). Only the owner can cancel their ticket (T). |

### Screens (Done when)
- **Success**: "You're in" ticket stub with the ticket code and a Cancel ticket button.
- **Sold out**: "Sold out" stamp with Join waitlist, or the user's waitlist position (#n, people ahead).
- **Seat held for you**: "A seat is held for you" with a Claim my seat button.
- **Error**: a plain sentence (e.g. "Could not reach the server, try again") and a Retry button. No raw error codes.
- **Seat level** (R1 detail): "Available", "Selling fast" when 40% or fewer seats (or 3 or fewer) are left, "Sold out" at 0.
- Every animation stops when the user prefers reduced motion.

## Data model (Firestore)
```
events/{eventId}
  name, venue, startsAt (timestamp), capacity (int)
  seatsLeft (int)      seats anyone can claim right now
  waitNext  (int)      next waitlist position to hand out (starts at 0)
  waitServed(int)      positions < waitServed have been offered a held seat
events/{eventId}/tickets/{uid}     code (string, 8 chars), createdAt
events/{eventId}/waitlist/{uid}    pos (int), joinedAt
```
Using the user id as the document id makes "one per person per event" structural.

## Security model
There is no server code (Firebase Spark plan). The browser runs each action as a
Firestore transaction, and **Firestore Security Rules** refuse any write that does
not follow the rules above. The rules, not the browser, are what enforce R2–R6.

## Out of scope (v1)
- Stretch S1 (timed live queue) and S2 (lottery).
- Leaving the waitlist.
- Expiry of a held seat that is never claimed.
- An organiser UI; events are created in the console or by the seed script.
- Payment.

## Known limitations (to repeat in the handoff note)
- One ticket per **account**, not per human: a person can make several accounts.
- A held seat stays held until that person claims it.

## Seed data
3 invented events (one with 10 seats for the race demo, one nearly sold out, one sold out)
and 20 invented users (`student01@example.com` … `student20@example.com`), emulator only.
