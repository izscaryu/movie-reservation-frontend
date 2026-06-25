# Frontend Progress — Movie Reservation SPA

React SPA consuming the existing Spring Boot API (separate repo
`movie-reservation-system`). The backend is the contract: shapes are verified
against the live OpenAPI spec at `http://localhost:8080/v3/api-docs` (Swagger UI
at `/swagger-ui/index.html`), not from memory. The backend must be running
(`docker compose up` in the backend repo) throughout development.

Per-slice discipline: each slice is a focused commit (or a few), **pushed** when
the slice closes. No "31 commits unpushed" backlog.

## Stack (locked)

- Vite 5 + React 18 + TypeScript (strict). Pinned to Vite 5 / React 18 / Tailwind 3
  / React Router 6 / TanStack Query 5 because the local toolchain is **Node 18.17.1**
  (Vite 6/7 and Tailwind 4 want Node 20+).
- Tailwind CSS 3 (PostCSS).
- React Router 6 (route-based pages + guards).
- TanStack Query 5 — all server state (caching + refetch for the seat-map poll and
  the refresh-on-401 retry).
- A thin hand-written typed `fetch` wrapper (`src/lib/http.ts`). No codegen; DTOs
  mirrored by hand in `src/types/api.ts`.
- Auth state via React Context only (no Redux).

## Contract notes (verified against live `/v3/api-docs`, Phase 10 backend)

Differences found vs. the kickoff scaffold — trust the spec:

- `SeatMapResponse` is `{ showtimeId, seats: SeatMapEntry[] }` (the grid is the
  nested `seats` array, not the top object).
- `SeatMapEntry`: `{ showtimeSeatId, rowLabel, seatNumber, label, status }`.
  `showtimeSeatId` is the id you POST to reserve (NOT a physical seat id).
- `ReservationResponse.seats` is `string[]` (seat labels), and it has
  `{ id, showtimeId, movieTitle, startTime, status, createdAt, expiresAt, totalPrice, seats }`.
- `AuthResponse`: `{ accessToken, token (DEPRECATED alias), tokenType, expiresInMs, refreshToken }`.
- Error body is uniform: `{ timestamp, status, error, message, path }`.
- `MovieResponse.description` / `.posterUrl` come back `null` in real data → typed nullable.
- Paginated query params: `page` (default 0), `size` (default 20); movies also `genre`;
  `/reservations/me` also `filter`. `/movies/{id}/showtimes` takes optional `date` and
  returns a plain array (not a page).
- Extra endpoints present beyond the kickoff list: `POST /api/admin/users/{id}/promote`.

Auth flow verified live: login → bearer call → `/refresh` rotates tokens → reusing the
**old** refresh token returns `401 "Invalid or expired refresh token"` (reuse detection).
Access token exp − iat = 900s (15 min). This is why the 401 refresh must be single-flight
(landmine #1).

## Slices

- [x] **Slice 1 — Scaffold + API client + types.** Vite+React+TS+Tailwind+Router+Query.
      Typed fetch wrapper (no auth yet). Types mirroring the DTOs (verified). Routing
      skeleton with placeholder pages. Verify: builds + `GET /api/movies` renders real
      data from the running backend.
- [x] **Slice 2 — Auth layer.** login/signup; access-token-in-memory + refresh-token in
      localStorage; Bearer-attaching wrapper; **single-flight** refresh-on-401; silent
      re-login on load; logout; route guards (authed + ADMIN). Proven; STOP + report.
- [x] Slice 3 — Browse (movies list + filter, detail, showtimes-by-date).
- [x] Slice 4 — Seat picker + 409 which-seats-failed handling.
- [x] Slice 5 — Hold countdown (display-only) + confirm + confirm-after-expiry 409.
- [ ] Slice 6 — My reservations (paginated upcoming/past, cancel).
- [ ] Slice 7 — Admin dashboard (movie CRUD, showtime create, 4 reports, admin reservations).
- [ ] Slice 8 — Polish + README + two-tab overbooking demo.

Out of scope (v1): realtime/websocket seat updates (poll / refresh-on-conflict),
payment, email, i18n, SSR.

## Log

- Slice 1 (done, pushed): scaffolded, configured Tailwind, wrote typed client + DTO
  types verified against live Swagger, wired Router + React Query, movies list renders
  real paginated data. Repo: https://github.com/izscaryu/movie-reservation-frontend
- Slice 2 (done, pushed): auth layer.
  - `src/lib/session.ts`: token store (access in memory, refresh in localStorage) +
    **single-flight** `refreshAccessToken()` (one in-flight promise; concurrent callers
    join) + `authFetch` (attach Bearer, retry once through refresh on 401) +
    `restoreSession` (silent re-login on load).
  - `src/auth/AuthContext.tsx`: derives the UI user from the JWT claims, subscribes to
    session changes, runs silent re-login. `src/auth/guards.tsx`: `RequireAuth` +
    `RequireAdmin`. Login/Signup screens. Logout (best-effort server revoke + local clear).
  - `src/lib/session.test.ts` (Vitest): 3 concurrent 401s → **exactly one `/refresh`**,
    all three retried and succeed; in-flight promise reuse; dead-refresh-token clears
    session + throws `SessionExpiredError`. Run: `npm test`.

### Live finding (trust live over the doc) — concurrent refresh is NOT catastrophic here

The kickoff's landmine #1 says a concurrent refresh burst replays a rotated token →
backend revokes the whole token family → forced logout. **That did not reproduce against
this backend build.** Verified live: 3 concurrent `POST /api/auth/refresh` with the same
token returned `[200, 200, 200]`, issuing 3 distinct new refresh tokens that all stayed
valid; only the consumed ORIGINAL token was then rejected (`401`). Reuse rejection is real
but **sequential** (replay a consumed token → 401), not triggered by a tight concurrent burst.

Single-flight is kept anyway, because it's still the correct client design:
1. Without it, N concurrent refreshes each `setSession()` → a localStorage write race; the
   client keeps only the last-written refresh token and may strand in-flight retries on a
   stale access token.
2. The backend's leniency is build/timing-dependent; the documented contract is reuse
   detection + rotation, and single-flight is the only design that's safe regardless.
3. It's strictly cheaper: one `/refresh` per burst, deterministic stored token, no churn.

- Slice 3 (done, pushed): browse.
  - `src/pages/MoviesPage.tsx`: cards now link to `/movies/:id`; duration formatted.
  - `src/pages/MovieDetailPage.tsx`: movie detail (poster/title/duration/genres/desc,
    404 handled) + a showtimes section with a date filter. Default is **all upcoming**
    (no `?date=`), because the seed data is sparse and a specific day is usually empty;
    showtimes are grouped by day and each links to `/showtimes/:id/seats`.
  - `src/lib/format.ts`: shared date/time/price/duration formatters (LocalDateTime
    strings have no TZ → parsed as local for display).
  - Contract verified live: `/api/movies/{id}` 404s with the uniform error body for a
    missing id; `/api/movies/{id}/showtimes` returns an array, `?date=YYYY-MM-DD` filters,
    an empty day returns `[]`.
- Slice 4 (done, pushed): seat picker (the centerpiece).
  - `src/components/SeatGrid.tsx`: rows grouped by `rowLabel`, seats by `seatNumber`,
    colored by status (AVAILABLE/HELD/BOOKED) + selected + a rose ring for just-lost
    seats. Only AVAILABLE seats are clickable.
  - `src/pages/SeatPickerPage.tsx`: select seats → `POST /api/reservations` (via
    `authFetch`). On success shows the PENDING hold (seats, total, expiresAt); the
    countdown/confirm is Slice 5. Seat-map GET is public; reserving requires auth, so an
    unauthenticated "Hold" routes to /login with the return path.
  - **The 409 path (landmine #5):** the backend reports conflicts through the uniform
    error body's `message`, naming seats by LABEL — verified live:
    `{"status":409,"message":"Seats not available: A3, A4"}`. On 409 the UI parses those
    labels (`src/lib/seatConflict.ts`, unit-tested), refetches the seat map (the lost
    seats now render HELD), highlights them with a ring, drops them from the selection,
    and shows "A3, A4 were just taken. Pick again." — not a generic toast.
  - 400s are surfaced inline with the server message (`must not be empty`,
    `One or more seat ids do not belong to showtime N`).
  - v1 concurrency approach = **refresh-on-conflict** (no auto-poll), which is both the
    documented v1 choice and what keeps the two-tab 409 demo reliably reproducible. A
    manual "Refresh map" button is provided.

- Slice 5 (done, pushed): hold countdown + confirm.
  - `src/hooks/useCountdown.ts`: 1-second countdown to `expiresAt`. **Display-only**
    (landmine #2) — the Confirm button is never gated on it; the server's 409 is
    authoritative.
  - `src/pages/HoldPage.tsx` (`/hold/:reservationId`, behind `RequireAuth`): receives the
    PENDING hold via navigation state from the seat picker (no `GET /api/reservations/{id}`
    exists, so a hard refresh falls back to a "check My reservations" pointer). Shows the
    countdown + Confirm + Release-hold (DELETE). On confirm 200 → confirmed panel; on 409
    → "Hold expired" panel with a path back to seats; 404 handled.
  - `SeatPickerPage` now navigates to `/hold/:id` (state = the reservation) on a successful
    hold instead of an inline panel.
  - Confirm contract verified live: PENDING→200 (`CONFIRMED`, `expiresAt:null`);
    already-confirmed / cancelled / **expired** → 409 `"Reservation N is not pending
    (already confirmed, expired or cancelled)"`; non-existent or another user's → 404
    (per-user scoped, no 403 leak). The expired path shares the confirmed/cancelled 409.

### Live finding — server timestamps are UTC WITHOUT a `Z` (TZ landmine)

`expiresAt` / `createdAt` / showtime `startTime` come back as zoneless LocalDateTime
strings that are actually **UTC** (`"2026-06-25T18:14:10.92"`). Verified live: a fresh
hold's `expiresAt` is `now+600s` only when parsed as UTC; parsed as browser-local (UTC+2
here) it reads as already-expired by the offset (`-6600s`) — the countdown would show
`0:00` instantly. Fix: `parseServerInstant()` appends `Z` to zoneless datetimes, and all
formatters render with `timeZone: 'UTC'` so the displayed wall-clock equals the stored
value with no off-by-offset or date-rollover across timezones. Locked by `format.test.ts`.
This also corrected the Slice 3 showtime display, which had been parsing as local.

### Live finding — the 409 conflict body is a STRING, not structured

The kickoff says the 409 "body names WHICH seats failed." It does, but as a
comma-separated **label** list inside `message` (`"Seats not available: A1, A2"`), not a
structured `seats` array and not by id. `parseUnavailableSeatLabels` extracts them; mapping
label→`showtimeSeatId` is done against the freshly-refetched map.
