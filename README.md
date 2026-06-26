# Movie Reservation — Frontend

A React + TypeScript single-page app for the [Movie Reservation System](../movie-reservation-system)
backend. Browse what's showing, pick seats on a live seat map, hold and confirm a ticket, and —
as an admin — manage the catalogue and read reports.

The backend's headline is **not selling the same seat twice** when two people race for it. This
SPA is the other half of that story: when the race is lost, the interesting part isn't the
error — it's that **the person who lost sees a calm "that seat was just taken — pick again,"
never a generic failure and never a seat that looks sold twice** (see
[The overbooking race, client side](#the-overbooking-race-client-side-the-headline)).

> The backend is the contract. Every type and endpoint is mirrored by hand from the live OpenAPI
> spec at `http://localhost:8080/v3/api-docs` (Swagger UI at `/swagger-ui/index.html`) and verified
> against real responses — not from memory. There is **no codegen**.

---

## Table of contents

- [What it is](#what-it-is)
- [Tech stack](#tech-stack)
- [The overbooking race, client side (the headline)](#the-overbooking-race-client-side-the-headline)
- [Architecture](#architecture)
- [Design](#design)
- [How to run it](#how-to-run-it)
- [Authentication on the client](#authentication-on-the-client)
- [Decisions that bit (and how they're handled)](#decisions-that-bit-and-how-theyre-handled)
- [Project layout](#project-layout)
- [What I'd add with more time](#what-id-add-with-more-time)

---

## What it is

A customer can browse movies and showtimes, open a **live seat map**, hold seats (a 10-minute
`PENDING` hold), confirm them into a ticket, and review their tickets; an admin manages movies and
showtimes and reads revenue / occupancy / popularity reports. Auth is JWT with a rotating refresh
token, and route guards for the authed and `ADMIN` areas.

It's a learning / CV project and honest about scope: it's the **browser client only** (the API is a
separate repo), there's **no real payment** (confirming simulates a completed checkout, matching the
backend), and realtime seat updates are **refresh-on-conflict**, not websockets — a deliberate v1
choice explained below. Everything else — auth with single-flight refresh, the seat-pick/hold/confirm
flow, server-driven pagination, typed DTOs, and the loading/error/empty states — is built the way a
real client would be.

---

## Tech stack

| Area | Choice |
|---|---|
| Build / dev | **Vite 5** (`strictPort` on 5173) |
| UI | **React 18** + **TypeScript** (strict) |
| Styling | **Tailwind CSS 3**, a small token system + hand-built component primitives |
| Routing | **React Router 6** (route-based pages + authed/admin guards) |
| Server state | **TanStack Query 5** (caching, refetch-on-conflict, the 401→refresh retry) |
| HTTP | a thin hand-written typed `fetch` wrapper (`src/lib/http.ts`) — **no codegen** |
| Auth state | **React Context** only (no Redux) |
| Fonts | **self-hosted** (Fraunces · Hanken Grotesk · IBM Plex Mono), latin-subset woff2, no CDN |
| Tests | **Vitest** (the logic that's easy to get wrong: refresh single-flight, TZ parsing, 409 parsing) |

> Pinned to these majors because the toolchain targets **Node 18**. Vite 6+ / Tailwind 4 require
> Node 20+. The pin is intentional, not stale.

---

## The overbooking race, client side (the headline)

Two people open the same showtime and both click **reserve C7** within a second of each other. The
backend guarantees exactly one wins (one `201`, one `409` — see the backend README's
[overbooking section](../movie-reservation-system/README.md#the-overbooking-problem-the-headline)).
The question this client answers is: **what does the loser see?**

The wrong answer is a red "Error 409" toast, or worse, a UI that still shows C7 as yours. The
answer here:

1. The losing `POST /api/reservations` comes back **409** with a uniform error body whose `message`
   names the seats by label — verified live as a **string**, not a structured array:
   `{"status":409,"message":"Seats not available: C7"}`.
2. The client treats that 409 as a **feature, not a failure** (`src/lib/seatConflict.ts`,
   unit-tested): it parses the lost labels, **refetches the seat map** (so C7 now renders `HELD`),
   rings the lost seats in **vermilion**, drops them from the selection, and shows
   **"C7 was just taken. Pick again."** — in the interface's own voice, not a stack trace.
3. The winner, meanwhile, lands on a **PENDING hold** rendered as a tear-off ticket stub with a live
   countdown, and confirms it into a `CONFIRMED` ticket.

No seat is ever shown sold twice; the loser is never dead-ended.

<!-- Part 4: two-tab overbooking GIF (docs/overbooking-demo.gif) lands here. -->

### Try it yourself (two tabs)

1. Sign up / log in as two different users in two browser windows (or one normal + one private).
2. Open the **same showtime's** seat map in both, and select the **same seat** in each.
3. Click **Hold** in window A, then window B.
4. **A** advances to the hold/ticket. **B** stays on the seat map: the seat flips to `HELD` with a
   vermilion ring and the message **"… was just taken. Pick again."** Pick another seat in B and it
   succeeds.

### Why refresh-on-conflict, not websockets

v1 reconciles seat state **on conflict** (the 409 refetch) and on an explicit **Refresh map**
button — no background polling, no socket. Two reasons: it's the documented v1 scope, and it makes
the race **deterministically reproducible** for the demo above (a live socket would often resolve
the seat before the second click). Realtime push is listed under
[What I'd add](#what-id-add-with-more-time).

---

## Architecture

A conventional SPA: route-based pages, a typed API layer, server state in TanStack Query, and a thin
auth/session module the rest of the app doesn't have to think about.

```
React Router pages  ──►  api/*  ──►  lib/http (authFetch)  ──►  Spring Boot API
        │                    │              │
        │                    │              └─ attaches Bearer, retries once through
        │                    │                 a single-flight refresh on 401
        │                    └─ typed functions returning the hand-mirrored DTOs (types/api.ts)
        └─ TanStack Query owns caching, the seat-map refetch-on-409, and pagination state
```

- **`lib/http.ts`** — one typed `fetch` wrapper. Non-2xx becomes a typed `ApiError` carrying the
  uniform `{timestamp,status,error,message,path}` body, so pages can branch on `status` and surface
  the server's own `message`.
- **`lib/session.ts`** — the token store and `authFetch`: access token in memory, refresh token in
  `localStorage`, **single-flight** refresh on `401` (concurrent callers join one in-flight refresh
  promise), silent re-login on load.
- **`auth/`** — `AuthContext` derives the UI user from the JWT claims; `RequireAuth` / `RequireAdmin`
  guard routes.
- **Server-driven pagination** — Prev/Next are gated on the server's `first`/`last`; totals are never
  computed client-side.

---

## Design

The visual direction is **warm editorial × dark cinema** — a single-screen revival house called
**The Orpheum**. It deliberately avoids the default "near-black + one acid accent" dark theme:

- **Palette** — a warm umber near-black (`#100D0A`), warm off-white "paper" text, and a muted
  **brass** accent (`#C49A3F`), not a cold slate + neon.
- **Type** — a self-hosted trio: **Fraunces** (display, optical sizing for marquee contrast),
  **Hanken Grotesk** (body), **IBM Plex Mono** (data). Fonts are vendored as latin-subset woff2 and
  preloaded — no CDN, no swap-in flash, offline-reliable.
- **Signature** — the **ticket stub**: a hold/confirmation is rendered as a perforated tear-off with
  monospace "printed" data, because in a cinema the data really is monospaced on a stub. Bold is
  spent there; everything else stays quiet.
- **Seat states** — five mutually-distinct states with semantics frozen: `AVAILABLE`, **brass**
  selected, **ocher + hatch** held (can't be confused with selected), oxblood booked, and the
  **vermilion just-lost ring** that carries the 409 flow.

Tokens live in `tailwind.config.js`; reusable primitives (Button, Card, Input, Badge, Table,
Alert, EmptyState, Spinner, Skeleton, TicketStub …) live in `src/components/ui/`. The quality
floor — visible keyboard focus and `prefers-reduced-motion` — is wired globally.

---

## How to run it

The backend must be running first (in the backend repo: `docker compose up`), with the API reachable
at `http://localhost:8080`.

```bash
npm install
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:8080
npm run dev             # http://localhost:5173 (port is pinned — see below)
```

Keep Vite on **5173**: the backend's CORS allowlist defaults to `http://localhost:5173`, so another
port hits a CORS wall on day one (or override `APP_CORS_ALLOWED_ORIGINS` on the backend). The dev
server uses `strictPort`, so a busy 5173 fails loudly instead of silently bumping the port.

Seeded admin (backend dev default): **`admin@example.com`** / **`admin123`**.

```bash
npm run build    # tsc -b && vite build — strict typecheck + production build
npm run lint     # eslint
npm test         # vitest (refresh single-flight, TZ parsing, 409 parsing)
```

---

## Authentication on the client

Mirrors the backend's rotating-refresh-token design (full rationale in the backend
[Authentication](../movie-reservation-system/README.md#authentication) section); the client's job is
to make it invisible:

- **Access token in memory**, **refresh token in `localStorage`**. On load, the app silently
  re-logs-in from the stored refresh token, so a page refresh keeps you signed in.
- On a `401` from any protected call, `authFetch` performs **one** `POST /api/auth/refresh`, swaps in
  the new token pair, and retries the original request. If the refresh also fails, the session is
  cleared and the user is sent to login.
- **Single-flight** is the key correctness choice: when several requests `401` at once, they all
  **join one** in-flight refresh rather than each rotating the token — which would cause a
  `localStorage` write race and strand retries on a stale token. Proven in `lib/session.test.ts`
  (3 concurrent 401s → exactly **one** `/refresh`, all three retried and succeed).

---

## Decisions that bit (and how they're handled)

The handful of things that were non-obvious against the real API — each verified live, each covered
by a test or a documented choice (the full per-slice log is in
[`FRONTEND_PROGRESS.md`](FRONTEND_PROGRESS.md)):

- **Server timestamps are UTC without a `Z`.** `expiresAt` / `startTime` come back as zoneless
  `LocalDateTime` strings that are actually UTC. Parsed as browser-local they read as already-expired
  (the countdown would snap to `0:00`). `parseServerInstant()` appends `Z`, and every formatter
  renders with `timeZone: 'UTC'`, so the wall-clock shown equals the value stored. Locked by
  `format.test.ts`.
- **The 409 body is a string, not structured.** `"Seats not available: A1, A2"` — parsed by
  `parseUnavailableSeatLabels` and mapped back to seat ids against a freshly-refetched map
  (`seatConflict.test.ts`).
- **The hold countdown is display-only.** Confirm is **never** gated on the local timer — the
  server's `409` on an expired hold is authoritative. The timer informs; it doesn't decide.
- **The server stays authoritative on every list mutation.** A cancel that `409`/`404`s (the row
  changed in another tab) refetches the list and shows the server's message, rather than guessing.

---

## Project layout

```
src/
  api/            typed endpoint functions (auth, movies, reservations, admin)
  auth/           AuthContext + route guards
  components/
    ui/           design-system primitives (Button, Card, Badge, Table, Alert, TicketStub, …)
    SeatGrid.tsx  the seat map
    Layout.tsx    the marquee shell
  hooks/          useCountdown (display-only)
  lib/            http, session (single-flight refresh), format (UTC), seatConflict, cn
  pages/          one file per route (+ pages/admin/*)
  types/          api.ts — DTOs mirrored by hand from the live spec
```

---

## What I'd add with more time

Deliberately out of scope for this build, not oversights:

- **Realtime seat updates** — a websocket / SSE feed so a seat flips to `HELD` for everyone the
  instant it's held, replacing the v1 refresh-on-conflict.
- **Optimistic seat selection** with rollback on the 409, for a snappier pick.
- **A rebuildable hold on hard refresh** — currently the hold page relies on navigation state
  (there's no `GET /api/reservations/{id}`); a detail endpoint would let it survive a reload.
- **Component/E2E test depth** — the logic-heavy units are tested; the next step is Playwright
  coverage of the seat-pick and two-tab race (the demo harness is the start of this).
- **httpOnly-cookie refresh tokens** — to match the backend's hardened alternative once it ships.

---

*Built slice by slice; the commit history and [`FRONTEND_PROGRESS.md`](FRONTEND_PROGRESS.md) record
the decisions behind each.*
