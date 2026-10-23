# Lance Take-Home — Critique & Write-Up

**Candidate:** Emmanuel Aina · **Role:** Product Engineer
**Live demo:** _<add Vercel link>_ · **Repo:** _<add GitHub link>_ · **Loom:** _<add link>_

---

## Part 1 — UX critique

Everything below comes from the 82-second product walkthrough. I focused on what slows down or confuses someone using the app 50+ times a shift.

### 1. Room status is written in code, not shown at a glance
- **What's broken:** cards on *My work* read "Clean · Vacant dirty · KING". The first "Clean" is the task type and "dirty" is the room state, so one line says both clean and dirty. The property board uses OD / OC / VD / VC / VR / OOO, told apart mainly by pastel colour. Clean types (Full service / Refresh / Strip) are internal terms.
- **Who:** housekeepers (low training, often working in a second language), and front desk reading the board.
- **Why it matters:** every glance needs decoding. Misreads mean cleaning the wrong room first, or front desk sending a guest into a room that isn't ready.

### 2. The list doesn't say what to do next
- **What's broken:** the caption says "dirty ones first", but all four cards are dirty and look identical. Nothing on the card shows a guest arrival time, early check-in, VIP or do-not-disturb, and priority ("Standard") only appears after tapping into the room. The "Assigned to you" heading is partly hidden behind the filter chips.
- **Who:** housekeepers, and through them, arriving guests.
- **Why it matters:** the housekeeper has to guess the order. A room needed for a 10:30 early check-in can be cleaned after a stayover that could have waited. This is the most expensive error in housekeeping, and the app has the data to prevent it.

### 3. Each room takes too many taps on a screen built for managers
- **What's broken:** every room goes list → detail → **Start clean** → **Complete clean** → back. The detail screen is a table of fields (Priority, Cleaned by, Planned, Clean type, Room type, Checkout…) that a housekeeper rarely needs mid-shift. Status shows twice and disagrees: a pill saying "In progress · 0 min" next to a 0:06 timer.
- **Who:** housekeepers, about 15 rooms × 2 status changes per shift.
- **Why it matters:** about 3 extra taps and a screen change per update, times dozens a shift. Friction also leads to batching: people update status at the end of the floor, so the "live" board isn't live.

### 4. Reporting a problem is hidden, so problems get radioed or forgotten
- **What's broken:** the only way to report anything from a room is a generic **More actions** button. In the maintenance flow, the AC job is closed with **Complete task** and no note or photo, and nothing links it back to room 305's status or the front desk. **Stop** is ambiguous (pause? cancel?).
- **Who:** housekeepers (who find most problems), maintenance, supervisor, front desk.
- **Why it matters:** a hidden report path means issues go to the radio or a verbal handoff and get lost. Rooms are then marked clean with a broken AC, and the guest finds it.

### 5. "Clean" jumps straight to available, with no inspection or handoff
- **What's broken:** **Complete clean** moves 103 straight to Vacant clean. The board has a VR ("ready", i.e. inspected) state, but no inspection step appears in the app. A 6-second clean is accepted without question.
- **Who:** supervisor, front desk, guest.
- **Why it matters:** front desk can't tell "cleaned" from "checked and ready", and quality problems reach the guest.

### Also noted
- **Shared-device sign-on doesn't scale to a real shift.** Using name + PIN on a shared hotel phone is right (it records who did each room). But the list has no search or "continue as last user", which matters at 30–60 staff. The video also doesn't show whether the PIN is asked again every time the phone wakes.
- **Assigning rooms ignores workload:** it's hidden behind a generic "+". The picker counts rooms rather than minutes (a 30-minute full clean ≠ a 15-minute refresh), isn't sorted by who has the most capacity, and the assignee isn't notified.
- **The numbers don't match between screens:** Maya shows "4 of 7 · 7 refreshes" but has 4 rooms. The crew screen says "0 Departures" while the board shows 5 vacant-dirty rooms. That undermines trust in the "live" claim.

---

## Part 3 — Write-up

### User and problem
**User:** a housekeeper mid-shift. She's holding a cart, has ~15 rooms, checks the phone 50+ times, and has little training.
**Problem:** her room list doesn't say *what state each room is in* or *what to do next*, and every update takes a detour through a data-heavy screen. When something's wrong in a room, there's no fast way to say so.

### What I built and why
A mobile-first web app (Next.js + Tailwind + shadcn/ui) with one flow done properly: **start of shift → clean rooms in the right order → report problems → finish**, plus the supervisor side that receives the work.

**Core fix — a "My rooms" list you can act on without thinking**
- **Ordered by urgency, with the reason shown on the card:** "Early check-in in 49 min · 10:30 AM" in red, "Guest arrives in 1h 19m" in amber, "Checked out · no arrival yet", "Guest staying · tidy while they're out". Order: room in progress → sent back → empty rooms with arrivals (rush first) → empty rooms → stayovers.
- **Plain-language status with colour + icon + words, never colour alone:** Needs cleaning → Cleaning now → Clean · awaiting check → Ready for guest. A 4-step progress bar on every card shows where the room is in its day.
- **One tap to start, one tap to finish, right from the list.** The card turns into a live timer (it goes red past the planned time), then "Done — room is clean". Every change gets an **Undo** toast instead of an "Are you sure?" dialog, because a confirm step slows down 99 correct taps to protect against 1 mistake.
- **Where to walk:** every card says "Room 207 · Floor 2 · East wing". The details sheet shows a small corridor map with the door, stairs and lift.
- **Three tabs instead of one long scroll:** *To do / Later / Done*, with live counts that pop when a room moves between them.
- **Details on demand, iOS-style:** tapping a card opens a half-height sheet with just what's needed to act (location, why now, Start / Issue). Drag up or tap *More details* to expand: all guest requests (there can be several, with quantity and source), special instructions (allergies, suite steps), room progress, the corridor map, room facts, reported issues, and today's timeline.
- **Room progress spelled out:** "Step 1 of 4 · Needs cleaning — Next: you start cleaning", with named steps (To clean → Cleaning → Inspection → Ready). Finished steps get green ticks and the current step is dark, so colour never carries the meaning alone.

**New feature — report an issue in two taps**
- Every card has an **Issue** button. Tap it, then tap what's wrong. It's sent on that second tap.
- The options are grouped as *Can't clean right now* (Do not disturb, Guest said no, Need more time) and *Something's wrong* (AC/heat, Leak, Lights/power, TV/Wi-Fi, Broken, Lost & found, Something else). Each one is a big icon tile.
- It's **routed automatically** and the confirmation says to whom ("AC / heat · 207 → Sam · Maintenance"). A DND/declined report moves the room to **Later** with the time it comes back.
- **Photo and note are optional extras after sending**, never a gate in front of it.
- The report appears as a chip on the room card, then shows as "fixed" when it's resolved.

**Supervisor side, only as much as needed to close the loop**
- Jordan's **Hotel board** shows counts, **Reported from rooms** (Mark fixed / Clear) and **Ready to inspect** (Pass → Ready, or Send back with a one-tap reason). It also has a floor grid using the same status language, with flags on rooms that have open reports.
- The loop closes: when Jordan fixes or sends back, Maya gets a notice next time she opens the app, and a sent-back room jumps to the top of her list.

**Feel:** motion is used only where it explains what happened. Cards slide to their new place in the list when status changes, the progress bar fills, the confirmation check springs in, bottom sheets can be swiped away, and buttons respond the moment a finger lands (on pointer-down). Reduced-motion is respected. The mobile basics are covered: no tap flash, no zoom when an input is focused, safe-area padding for the notch, `dvh` for the visible screen height, and haptic ticks on Android.

### In vs. out
| In | Out (deliberately) |
| --- | --- |
| Housekeeper list: urgency order, visual status, one-tap start/finish, undo | Real auth, multi-property, roles & permissions |
| Two-tap issue reporting with routing, Later queue, optional photo/note | Maintenance work-order lifecycle (assign, parts, SLA) |
| Supervisor: issue inbox, inspect/send back, board | Room assignment / workload balancing |
| Plain words + icons on every status (helps second-language readers) | Language switching & accessibility settings (next, see below) |
| Shared-phone sign-on with "Continue as last user" | Offline queue & sync, push notifications |
| Simulated clock, fake hotel data, local persistence, reset | PMS integration (arrivals, checkouts) |

### Primary success metric
**Median time from picking up the phone to the correct status change**, target **under 5 seconds and at most 2 taps** (the video's flow needs ~4 taps across 2 screens).
Guardrail for the feature: **share of room issues reported in-app vs. by radio or verbally** (goal: majority in-app within 2 weeks), plus **median time to report < 10 s**.

### Risks / edge cases
1. **The order is only as good as the data.** If the PMS (property management system) has stale arrival or checkout times, the list confidently tells her to clean the wrong room first. Mitigations: show the reason on every card (so she can sanity-check), let the supervisor mark a room as a rush, and a next step of syncing with the PMS in real time.
2. **Shared phones and poor Wi-Fi.** A wrong person signed in puts the wrong name on rooms, and stairwells/basements drop signal. Production needs an auto sign-out after a period of inactivity, plus an offline queue for status changes that syncs when signal returns and shows whether each change has synced.
3. Smaller: a guest who's on DND all day loops through Later (cap the retries and escalate to the supervisor). An accidental "Done" tap is covered by Undo, but a too-fast clean should eventually be flagged to the supervisor.

### What I'd build next
1. **Live arrivals from the PMS** plus a front-desk "rush this room" button. That makes the urgency order real.
2. **One-tap language switching, plus personal accessibility settings.** Many housekeepers work in a second language, and the people who'd struggle most with "Clean Vacant dirty" are the ones the app most needs to reach.
   - **The switcher is where people already are:** on the "Who's working?" screen and in the header, showing each language's own name (Español, Kreyòl, Tagalog, Português, 中文…). It's one tap with no settings menu.
   - **Saved per person, not per phone.** Phones are shared, so Maya's language follows her PIN. Priya picks up the same phone and sees hers.
   - **Free text is translated too, not just the UI.** Guest requests and special instructions show in the housekeeper's language, with the original one tap away so nothing gets lost. Issue reports work the other way: Maya reports in Spanish and maintenance reads it in English. Short labels plus icons (already in this MVP) keep translations reliable and quick to scan.
   - **Accessibility settings, also saved per person:** larger text, a high-contrast mode, less motion, haptics on/off, a left-handed layout (main buttons on the left), and read-aloud for room details and requests. By default, the app follows whatever the phone is already set to.
   - **Measure it:** how many staff use a language other than English, and whether tap-to-status time and in-app reports improve for them.
3. **Offline-first sync** (queued changes with a visible synced/pending state), because hallways and stairwells have bad Wi-Fi.
4. **Workload-aware assignment** for supervisors: balance by minutes and floor, not room count, and notify the housekeeper when a room is added.
5. **Maintenance close-out** with a resolution note/photo that automatically clears the room flag and tells the front desk.
6. Measure: instrument tap-to-status time and report rates to check the success metric.
