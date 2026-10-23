# Lance Ops — Housekeeping MVP

A mobile-first room board for hotel housekeepers, built for the Lance Product Engineer take-home.

**Core fix:** a "My rooms" list ordered by what's urgent, with plain-language visual status and one-tap start / finish.
**New feature:** report an issue in two taps (DND, guest declined, AC, leak, broken…), routed automatically to the right person.

See **[WRITEUP.md](WRITEUP.md)** for the critique, decisions, metric, risks and next steps.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000 — open with a phone-sized viewport
```

Deploy: push to GitHub → import in Vercel (zero config).

## Demo script (≈2 min)

1. **Continue as Maya** → PIN `1234`.
2. Read the list top-down: **207** is first because of an early check-in in under an hour (red), then **205** (arrival 11:00), then empty and stayover rooms.
3. Tap **Start cleaning** on 207 → the card turns into a live timer and slides to *Cleaning now*.
4. Tap **Issue** → **AC / heat**. Sent to Sam (maintenance) on that tap; add a photo or note if you want.
5. Tap **Done — room is clean** → 207 goes to *Done today*, progress ticks up. Every action has **Undo**.
6. On 104 tap **Issue** → **Do not disturb** → the room moves to *Later* with the time it comes back.
7. **Switch** → **Jordan** (PIN `1234`): reports land in *Reported from rooms*; 207 is in *Ready to inspect*.
   **Mark fixed**, **Pass · Ready**, or **Send back → Bathroom**.
8. **Switch** back to Maya: she gets the notices, and the sent-back room is at the top of her list.

The clock starts at 9:41 AM and runs in real time. The ↺ button in the header resets the demo.

## Stack & structure

Next.js 15 (App Router) · Tailwind v4 · shadcn/ui (Button, Drawer on vaul, Sonner, Textarea) · Motion · lucide-react. State is a single reducer persisted to `localStorage`; no backend.

```
src/lib/data.ts        fake hotel: staff, rooms, seeded issues
src/lib/meta.ts        status + issue vocabulary (label, icon, colour, routing)
src/lib/store.tsx      reducer, simulated clock, urgency ordering (queueFor / reasonFor)
src/components/
  sign-on.tsx          shared-phone sign-on: continue as last user, search, PIN pad
  housekeeper.tsx      My rooms: cards, timer, Later, Done, room sheet
  issue-sheet.tsx      two-tap issue reporting
  supervisor.tsx       board: reports inbox, inspection, floor grid
  status.tsx           StatusPill, StatusSteps, Avatar
```

Motion and mobile details follow Emil Kowalski's skills (in `.claude/skills`): transform/opacity only, strong ease-out curves, under 300 ms for UI, transitions rather than keyframes for rapidly triggered elements, pointer-down feedback, `prefers-reduced-motion`, no tap highlight, 16px inputs, safe-area insets, `dvh`.
