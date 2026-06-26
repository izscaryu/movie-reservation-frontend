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
- [x] Slice 6 — My reservations (paginated upcoming/past, cancel).
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

- Slice 6 (done, pushed): My reservations.
  - `src/pages/ReservationsPage.tsx` (replaces the placeholder; route `/reservations` behind
    `RequireAuth`): Upcoming/Past tabs (the `filter` query param), server-driven pagination
    (`page`/`size=10`, Prev/Next gated on `first`/`last` — never compute totals client-side,
    landmine #6), a status badge per row (CONFIRMED/PENDING/CANCELLED/EXPIRED), and per-row
    Cancel with an inline "Cancel this reservation? Yes / Keep" confirm step.
  - **List-only by decision:** no Confirm action and no path that feeds a list row into
    `HoldPage` (there's no `GET /api/reservations/{id}` to rebuild a hold anyway). The page
    only lists + cancels.
  - Cancel is offered only on the **Upcoming** tab for **PENDING + CONFIRMED** rows. The Past
    tab is read-only history, so a started-showtime CONFIRMED is never offered for cancel.
    On success the `['reservations']` query is invalidated (refetch). On 409/404 the list is
    also refetched and the server message is surfaced (the row changed underneath us, e.g.
    cancelled in another tab) — the server stays authoritative.
  - `api/reservations.ts` already had `getMyReservations` + `cancelReservation` (built ahead
    in earlier slices); Slice 6 is the page. `placeholders.tsx` lost its `ReservationsPage`
    export; `App.tsx` imports the real page.

### Live finding — `filter` splits by SHOWTIME TIME, not status; cancel matrix verified

`/api/reservations/me?filter=upcoming|past` partitions by the showtime's time, **not** by
reservation status. Verified live (admin user): `upcoming` returned 8 rows mixing `CONFIRMED`
and `CANCELLED`; `past` was empty (all seed showtimes are in 2036). No `filter` == `upcoming`
here. An **invalid** `filter` (`?filter=bogus`) returns **200**, not 400 (ignored) — the UI
only ever sends the two valid values. Because a row's status is independent of the tab, the
page shows a status badge and gates the Cancel button on status, not on the tab alone.

Cancel (`DELETE /api/reservations/{id}`) verified live, recording the real results:
- **PENDING** → `204 No Content` (empty body).
- **CONFIRMED (future)** → `204 No Content` — the decision's open question; cancelling a
  future CONFIRMED **is allowed**, and the row then reads `CANCELLED` in the list. This is
  why Cancel is offered on CONFIRMED, not just PENDING.
- **Re-cancel a CANCELLED/EXPIRED row** → `409 "Reservation N cannot be cancelled in its
  current state"`. The UI gates this out, but a stale row can still hit it → refetch + show.
- **Non-existent id** → `404 "No reservation with id: N"`.
- `cancelReservation` returns `Promise<void>`; the 204 is handled by `parseResponse` (204 →
  undefined). No response body to read.

**Verification scope (honest):** the live checks were the API contract (login → list
upcoming/past → paginate → the full cancel matrix above) plus `tsc`/`vite build`, `eslint`,
and transforming `ReservationsPage.tsx` + `App.tsx` through the running Vite dev server (both
200, valid JS, no error overlay). The rendered DOM was **not** driven/clicked in a real
browser — no Playwright/Puppeteer in this repo, and no prior slice has done browser
automation; "live" here means the same contract+build+transform bar used in Slices 3–5.
Side effect of verification: seed reservations #105 (PENDING→cancelled) and #106
(PENDING→CONFIRMED→cancelled) were created and cancelled on showtime 75; their seats were
released, so no holds dangle.

- Slice 7 — **Part A+B (done, pushed)**: admin shell + movie CRUD. (Slice 7 is staged:
  A+B here, C = showtime create next, then D = reports + E = admin reservations in a later
  session. The slice checkbox stays unticked until E.)
  - `src/pages/admin/AdminLayout.tsx`: admin shell with a section sub-nav (Movies / Showtimes
    / Reports / Reservations) + `<Outlet/>`. `App.tsx` replaces the old `admin/*` placeholder
    route with a nested `admin` route under `RequireAdmin`: `index`→redirect to `movies`,
    `movies`, `movies/new`, `movies/:movieId/edit`, plus `showtimes`/`reports`/`reservations`
    rendering `AdminStub` (temporary "coming in Part X" — `showtimes` is replaced in Part C).
    Unknown `/admin/*` redirects to `/admin/movies`. `placeholders.tsx` is now just the 404.
  - `src/api/admin.ts`: `createMovie` / `updateMovie` / `deleteMovie` (via `authFetch`).
  - `src/pages/admin/AdminMoviesPage.tsx`: paged list (reuses the public `GET /api/movies`,
    which already excludes soft-deleted), `+ New movie`, per-row Edit link + Delete with an
    inline "Delete this movie? Yes / Keep" confirm. Delete invalidates both `['admin-movies']`
    and the public `['movies']` cache.
  - `src/pages/admin/MovieFormPage.tsx`: shared create/edit form (title*, durationMinutes*,
    genres as a comma input → `string[]`, optional posterUrl/description). Edit prefills from
    `GET /api/movies/{id}` (one-shot guard so a refetch can't clobber edits) and handles the
    404 (deleted) case. 400s surface the server's field-prefixed message inline.

### Live finding — admin movie CRUD contract (verified live, throwaway movie #202)

- `POST /api/admin/movies` → **201** with the full `MovieResponse`; **genres come back
  sorted** (sent `["Test","Demo"]`, got `["Demo","Test"]`) — so trust the response, don't
  re-sort client-side.
- `PUT /api/admin/movies/{id}` → **200** with the updated `MovieResponse`.
- Validation **400** uniform body, message is **field-prefixed and `; `-joined**:
  `"durationMinutes: must not be null; title: must not be blank"` — shown inline as-is.
- `DELETE /api/admin/movies/{id}` → **204** empty (the spec says 200 — trust live, 204).
  After it, `GET /api/movies/{id}` → **404** and the row is gone from `GET /api/movies`
  (174→… ; soft-delete via the V2 column). `deleteMovie` is `Promise<void>`.
- Authz: a non-admin `POST /api/admin/movies` → **403** (backend enforces; `RequireAdmin`
  covers the UI). The `GET /api/movies` page size is capped — `?size=200` → **400**, so the
  admin list uses a modest size (12).

**Verification scope (A+B):** live API contract above + `tsc`/`vite build` (109 modules) +
`eslint` clean + Vite-transformed every new admin module (`AdminLayout`, `AdminMoviesPage`,
`MovieFormPage`, `AdminStub`, `api/admin.ts`, `App.tsx`) through the running dev server (all
200). The rendered admin DOM was **not** clicked — left for the user's in-browser pass before
Parts D/E (same bar as prior slices).

- Slice 7 — **Part C (done, pushed)**: showtime create.
  - `src/pages/admin/AdminShowtimesPage.tsx` (replaces the Showtimes stub): a create form —
    movie `<select>`, numeric `theaterRoomId`, `datetime-local` start time, price. On success
    shows the created showtime (movie · room · start→end · price, all formatted) and keeps
    movie/room/price for quick repeat scheduling. Any non-2xx surfaces the server message.
  - `src/api/admin.ts`: `createShowtime`. `src/api/movies.ts`: `getAllMovies` (pages through
    at size 100 — the picker needs the full list; `size>100` → 400) feeding the movie select.
  - `src/types/api.ts`: `ShowtimeRequest`.

### Decision — `theaterRoomId` is out-of-band (no GET /rooms); future rooms endpoint is the fix

There is **no rooms/theaters endpoint** in the API. The showtime-create form therefore takes
a **raw numeric `theaterRoomId`** and relies on the server to reject an unknown id. To make
this usable, the form shows an inline hint of the seeded rooms: **1 (Room 1, 40 seats), 2
(Room 2, 80), 3 (Room 3, 54)** — read from the backend's `RoomSeatInitializer` (3 rooms,
seeded in list order so ids 1–3); id 1 ↔ "Room 1" confirmed live (existing showtimes + the
create echo below). **This is a known gap:** scheduling depends on out-of-band room-id
knowledge. The real fix is a future `GET /api/rooms` (its own backend + frontend slice);
until then the hint + server-side validation is the v1 stopgap.

### Live finding — showtime `startTime` round-trip is clean (no +offset leak)

The inverse of the Slice 5 read bug (writing a zoneless-UTC instant). Verified live, not just
the 200: created a showtime `{movieId:113, theaterRoomId:1, startTime:"2037-03-15T09:45",
price:13.50}` → **201**, body echoed `startTime:"2037-03-15T09:45:00"` (seconds normalized,
**no offset shift**) with `endTime:"2037-03-15T11:25:00"` derived server-side. Then fetched
`GET /api/movies/113/showtimes?date=2037-03-15` (the public view) and the row read the **same**
`"2037-03-15T09:45:00"`. So the `datetime-local` value is sent **as-is, no conversion**, and
because `format.ts` renders with `timeZone:'UTC'` the admin sees back exactly what they typed.
Accepted format: `LocalDateTime` with optional seconds (`YYYY-MM-DDTHH:mm` accepted).
Side effect: this verification left a real showtime **#146** (movie 113, Room 1, 2037-03-15
09:45) in the DB — there's no delete-showtime endpoint, so it persists as harmless test data.

**Verification scope (C):** the live create + round-trip above + `tsc`/`vite build` + `eslint`
clean + Vite-transformed `AdminShowtimesPage` / `api/admin.ts` / `api/movies.ts` / `App.tsx`
(all 200). DOM not clicked — the user will verify A+B and C in-browser (esp. the time
round-trip) before D+E.
