# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Staff of GDG Qassim University (Google Developer Groups on campus): the
leaders and VPs of the current semester's departments, plus super admins.
Regular members never reach this app; they use the public leaderboard site.

- **Department leaders and VPs** start events: they book dates, fill in the
  event details and the Design and Logistics briefs, fix returned requests,
  and publish.
- **Design, Logistics and Media team leaders/VPs** work an inbox of requests
  waiting on their team: mark their part done, or (Design) return it with notes.
  Logistics also closes and reopens calendar days.
- **Super admins** can do anything in any department and skip every time rule.

Much of this happens on a phone, between lectures or at an event. The phone
jobs that matter most: starting or continuing a request, working the team
inbox, and checking where requests and events stand (including notifications).

## Product Purpose

The admin console runs the club's semester: events from first booking to
closed attendance and awarded points, members, the club structure
(departments, leaders, VPs), permissions, points and email.

The **event pipeline** is the main way an event gets created and the most used
feature: book dates (held for 24 hours) → details + Design brief + Logistics
brief → submit to Design and Logistics → (optional return with notes, 12-hour
fix window, late-day point penalty) → Media → ready → publish, which creates the
event in Events as a draft for admins to open.

Success: a leader can take an event from idea to published on a phone without
help, and every team always knows what is waiting on it.

## Positioning

A student club's own operations console, built around its real booking rules
(four-day lead time, Logistics-closed days, 24-hour holds, Design's one return
with a penalty clock) rather than a generic event tool.

## Operating Context

- Arabic is the primary language; English is fully supported. Layouts must
  mirror cleanly (RTL first).
- Light and dark themes both exist.
- Next.js frontend with Clerk sign-in; FastAPI backend. Permissions come from
  the database (current-semester roster, department permissions, super admins).
- Pipeline teams are found by department name (design / logistics / media).
- After publishing, the event lives in Events: Google Form and publish,
  responses (accept/reject, acceptance emails), QR attendance, close event and
  award points, certificates.

## Capabilities and Constraints

- Only show data an endpoint returns, or that can be derived client-side from
  one. No invented activity feeds, live tickers, failure counts or term totals.
- The pipeline stages are: draft, in_review ("With Design & Logistics"),
  returned, media, ready, published, cancelled. Calendar day states: locked
  (too soon), banned (closed by Logistics), open, held, booked, published.
- Department deputies are called **VPs**, never "deputy".
- Notifications exist for the pipeline (request received, dates banned, hold
  expired, returned, task done, media received, ready to publish).

## Brand Commitments

- The GDG logo (`Frontend/public/gdg.png`, the four-colour chevrons) is the
  app's main logo.
- The visual identity is **Mud & Doors** (chosen 2026-10-09 from four
  directions): limewash walls, colour only on painted Najdi doors, each door
  colour a state. It is recorded in `Frontend/DESIGN.md` and is settled; new
  work extends it rather than proposing another look.
- Comfortable over loud: the user asked for "good, perfect, comfortable colors".
- Fonts: Thmanyah Sans for the interface (requested by the user), Reem Kufi for
  titles.

## Evidence on Hand

- Real copy for every screen in `Frontend/messages/en.json` and `ar.json`.
- Real venue list (Arabic) in `Frontend/lib/pipeline-types.ts`.
- No real usage numbers, testimonials or analytics; mockups use labelled sample
  data only.

## Product Principles

1. The pipeline is the front door: creating and moving events is the home
   screen's job, not a side page.
2. Phone first for the three phone jobs; desktop gets more room, not a
   different product.
3. Colour carries state, never decoration (the five door tones in DESIGN.md).
4. Always say whose turn it is and what happens next.
5. Arabic first; every layout mirrors.
