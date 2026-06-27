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
- [x] Slice 7 — Admin dashboard (movie CRUD, showtime create, 4 reports, admin reservations).
- [x] Slice 8 — Polish + README + two-tab overbooking demo.

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

> A+B+C verified in-browser by the user and confirmed good before D+E.

- Slice 7 — **Part D (done, pushed)**: the 4 reports (read-only).
  - `src/pages/admin/AdminReportsPage.tsx` (replaces the Reports stub): a shared `from`/`to`
    date-range control (Apply / All-time; empty = all-time) drives three reports — a **revenue**
    summary card (totalRevenue + confirmedReservations), a **revenue-by-movie** table (the plain
    array, already sorted desc by the backend), and a **popular-movies** table that is **paged**
    (renders the server's `page`/`totalPages`/`totalElements`/`first`/`last`, never computed
    client-side; size 10). A separate **occupancy** lookup (independent of the range) takes a
    showtime id → a booked / total / occupancy% card; a missing id (404) shows "No showtime with
    id N", other errors surface the message. Showtime/occupancy times go through `formatDateTime`
    (UTC), prices through `formatPrice`.
  - `src/api/admin.ts`: `getRevenueReport` / `getRevenueByMovie` / `getPopularMovies` /
    `getOccupancy` (+ `DateRangeQuery` / `PopularMoviesQuery`). `src/types/api.ts`: `RevenueReport`,
    `RevenueByMovie`, `PopularMovie`, `OccupancyReport`.

### Re-confirmed live (Part D/E grounding) — report + admin-reservation contracts unchanged

Re-verified against live Swagger + responses (not re-derived): `revenue` →
`{from,to,totalRevenue,confirmedReservations}` (from/to optional, `null` = all-time); `revenue/by-movie`
→ `[{movieId,movieTitle,revenue}]` (array, desc); `popular-movies` → paged `{content:[{movieId,
movieTitle,ticketsSold}],…}` (from/to, page, size def 10); `occupancy` →
`{showtimeId,movieTitle,startTime,totalSeats,bookedSeats,occupancyRate}` (showtimeId required, bad id
→ **404**). Report **dates are `yyyy-MM-dd`** and **all params optional** (no-range → 200, all-time).
(Revenue totals now read 600.00 / 30 vs last session's 620 / 31 — expected, since Slice 6/7
verification cancelled a couple of confirmed reservations.)

**Verification scope (D):** live contract re-confirmation above (incl. empty-range = 200) + `tsc`/
`vite build` + `eslint` clean + Vite-transformed `AdminReportsPage` / `api/admin.ts` / `types/api.ts`
/ `App.tsx` (all 200). DOM not auto-clicked (no browser driver — same bar as prior slices).

- Slice 7 — **Part E (done, pushed)** — completes Slice 7: admin reservations (read-only).
  - `src/pages/admin/AdminReservationsPage.tsx` (replaces the Reservations stub): a paged,
    filterable table over `GET /api/admin/reservations` using the richer admin row. Filter bar
    (draft state, applied on **Apply** so the query fires once): status `<select>` (All + the 4
    statuses), `from`/`to` date inputs, sort `<select>` (**Created / Price** — curated to entity
    columns, since an unknown sort field 400s), and order (Desc/Asc, defaults `createdAt`/`desc`
    to match the backend). Columns: id, user (name + email), movie, showtime (`showtimeStartTime`
    via `formatDateTime` UTC), a status badge, created (`createdAt` UTC), total (`formatPrice`).
    Server-driven pagination (renders `page`/`totalPages`/`totalElements`/`first`/`last`). No
    actions — admin reservations are view-only in v1.
  - `src/api/admin.ts`: `getAdminReservations` (+ `AdminReservationsQuery`); `src/types/api.ts`:
    `AdminReservationResponse` (these landed with the Part D commit). Removed the now-unused
    `AdminStub` (every admin section is real).

### Live finding (Part E grounding) — admin-reservations filter/sort contract

`from`/`to` are **dates** (`yyyy-MM-dd` → 200; a datetime with `T` → **400**), so the table uses
date inputs. `sort`/`direction` work (`totalPrice` asc → `10,10,10`; desc → `40,30,30`); an
**unknown sort field → 400**, which is why the sort dropdown is limited to confirmed columns
(`createdAt`, `totalPrice`). `status` filters (`CANCELLED` → 11 rows); no-filter → 200. The admin
row uses **`showtimeStartTime`** (not `startTime`) and carries `userEmail`/`userName`; no `seats`.

**Verification scope (E):** live filter/sort/pagination contract above + `tsc`/`vite build` +
`eslint` clean + Vite-transformed `AdminReservationsPage` / `App.tsx` (200). DOM not auto-clicked.

**Slice 7 complete (A–E).** Remaining: Slice 8 — polish + README + two-tab overbooking demo.

- Slice 8 is staged into four parts (1 restyle · 2 polish states · 3 README · 4 two-tab
  overbooking demo + Playwright GIF), and Part 1 is itself staged: **1a foundation →
  1b+ page-by-page rollout**, each its own commit. The slice checkbox stays unticked until
  Part 4. The user gates between parts; bold is spent in one place (the ticket stub) and kept
  quiet everywhere else.

- Slice 8 — **Part 1a (done, pushed)**: design foundation + `/style` preview. **Presentation
  only — no logic, API, or page behavior touched.** Direction (approved before build): *"warm
  editorial × dark cinema."* Deliberately breaks out of the AI-default near-black + single
  acid-accent (which is exactly what the app had: `slate-950` + `indigo`) by going warm umber
  near-black + **brass**, editorial **Fraunces**, and a monospace "ticket data" signature.
  - **Tokens** (`tailwind.config.js`, **extend-only** so the default Tailwind palette stays
    resolvable for not-yet-migrated pages during rollout): warm `ink` surfaces
    (`#100D0A`/`#1A1510`/`#211A13`/`#2C2419`), `paper` text (`#F2EADB`/dim/faint), `brass`
    (`#C49A3F` + `bright #ECB64A`), `danger`, `alert #F0644B` (the just-lost ring), `status.*`
    (confirmed `#6E9466` / pending `#E8B44C` / cancelled `#847A6A` / expired `#C2533F` — four
    mutually distinct hues; **brass is reserved for the brand, never a status**, so confirmed
    vs pending can't collide), and `seat.*` (open/held/booked + text). `fontFamily`
    display/sans/mono, `tracking.eyebrow`, `shadow.card`/`glow`, fade-in/rise keyframes.
  - **Fonts self-hosted (no CDN, no runtime third-party dep)** — decision per the user:
    offline-reliable for the demo/Playwright capture, no swap-in flash. Latin-subset `woff2`
    vendored in `public/fonts/`, `@font-face` in `index.css`, preloaded `crossorigin` in
    `index.html`. **Fraunces + Hanken Grotesk are variable** (one file each, full weight range;
    Fraunces carries the `opsz` axis → display contrast via `font-optical-sizing: auto`);
    **IBM Plex Mono is static** (one file per weight actually used: 400/500/600). 5 files,
    ~116 KB total. Pulled from Google's css2 `latin` block and committed (the css2 inspection
    confirmed the variable-vs-static split above).
  - **Shared primitives** in `src/components/ui/`: `Button` (primary/secondary/ghost/danger ×
    sm/md/lg + fullWidth; `buttonClasses` split into its own module so a `<Link>` can reuse the
    exact classes during rollout), `Card` (topRule/interactive/padded), `Input`/`Select`/`Field`,
    `Badge` (6 tones — reservation tone names are just the lowercased status), `Table`
    (`Table`/`THead`/`TBody`/`TR`/`TH`/`TD`, `numeric` → right-aligned mono), `Eyebrow`,
    `PageHeader`, and **`TicketStub`** — the signature: a perforated tear-off (bg-`ink` notches
    straddle the edges to punch the card), brass marquee header, monospace "printed" data.
    `src/lib/cn.ts` is a dependency-free class joiner. Files are component-only exports (keeps
    `react-refresh` / eslint clean).
  - **`/style` preview** (`StylePreviewPage`, **TEMPORARY**, standalone route in `App.tsx`
    *outside* the un-migrated `Layout` — remove after Part 1 rollout): renders the marquee
    header mock, palette, the type trio, buttons, inputs, cards, badges, the **five seat states
    side by side** + a live picker row with the **vermilion just-lost ring**, the editorial
    table, and the ticket stub. Built specifically to discharge the user's guardrail — confirm
    at a glance that **brass-selected vs ocher-held (hatched) are unmistakable** and the lost
    ring **punches** (it's the payload of the 409 flow, must read on camera).

### Decision (Part 1a) — seat/badge hues retuned into the palette, semantics frozen

Approved: retune all seat + badge colors into the warm palette while keeping **all five seat
states and four badge states as mutually distinct as before** (semantics over palette). Notably
**selected moves `indigo` → `brass`** (so it matches the brand and stays distinct from HELD's
muted ocher, which also gets a diagonal hatch); BOOKED → oxblood, the just-lost ring → vermilion
`#F0644B`. The retune lands in `SeatGrid`/badges during 1b+ rollout — 1a only defines the tokens
and proves them on `/style`. House named **"The Orpheum"** (approved — a named house reads less
templated).

**Verification scope (1a):** `tsc -b && vite build` (122 modules; CSS 25.46 kB with the tokens +
`@font-face` compiled; the 5 fonts copied to `dist/fonts`) + `eslint` clean + `vitest` 11/11
green (format/session/seatConflict regression — auth + TZ + 409-parse logic untouched and still
pass) + dev-server live checks: `GET /style` → 200, `GET /fonts/fraunces-var-latin.woff2` → 200
`font/woff2`, and `StylePreviewPage` + `TicketStub` transform to valid JS. DOM not auto-clicked
(no browser driver in the repo until Part 4 — same bar as prior slices). **STOP gate: awaiting
user review of the direction at `/style` before any page-by-page rollout (1b+).**

- Slice 8 — **Part 1a craft pass (done, pushed)**: first `/style` review approved the *direction*
  (palette / fonts / ticket stub / seat states — all kept) but flagged the foundation as reading
  flat/unfinished — spacing + surface craft, not color. Fixed on `/style`, still presentation only:
  - **Vertical rhythm scale** applied across the whole preview: tight *within* a group
    (`gap-3` / `space-y-2`), generous *between* groups (sections `mb-20`, subgroups `mt-10` +
    hairline + `pt-10`, header block `mb-8` with eyebrow→title at `mt-3`); more establishing top
    air (`pt-20`) and a bigger gap below the hero. Subgroup labels added so structure reads.
  - **Surface elevation** — dark-UI elevation comes from a catch-light top edge + a soft deep
    ambient, not a flat drop shadow that vanishes on near-black: `shadow.card` reworked
    (`inset` top highlight + layered ambient), `shadow.glow` strengthened and actually used (the
    emphasis card). `ink.raised`/`field`/`line` nudged lighter so cards separate and hairlines
    read; `Card` default padding `p-5`→`p-6`, plus a sectioned-card example showing header-over-
    body padding hierarchy.
  - **Table** de-cramped (this is the admin surface): rows taller, cells `px-3 py-3`→`px-5 py-4`,
    `TH` `px-5 py-3.5`, a crisp `border-b` header rule over hairline row dividers.
  - **Contrast** — `paper.dim` `#B3A795`→`#C8BCA9`, `paper.faint` `#847A6A`→`#9C9082`, so
    captions/eyebrows clear AA on the ink background.
  - **Verification:** `vite build` (122 modules, CSS 25.88 kB), `eslint` clean, `vitest` 11/11,
    dev-server `GET /style` 200 + font 200 `font/woff2` + `StylePreviewPage` transform 200. STOP
    gate still held — awaiting re-review of spacing/surfaces before 1b rollout.

- Slice 8 — **Part 1 rollout 1b–1h (done, pushed)**: spacing/surfaces re-review passed; rolled
  the foundation across every page, **one commit each, presentation only — no logic/API/state
  changes**. Each page is a 1:1 restyle: existing branches (loading / error / empty, busy-button
  text, confirm steps, pagination gating, 404/409 fallbacks) all preserved. Copy nudged to the
  house voice where it helps the end user: nav **"My Tickets"**, brand **"The Orpheum"** (the page
  H1 follows: "My tickets"). Commits:
  - **1b shell** (`Layout`, `placeholders`): marquee header — Fraunces wordmark `◆ The Orpheum`,
    small-caps letterspaced nav with brass active state, sticky blurred bar, Button auth actions
    (Sign up is a brass CTA); 404 restyled.
  - **1c browse** (`MoviesPage`, `MovieDetailPage`): `PageHeader` masthead, interactive `Card`s,
    `Badge` genre pills, `Input`/`Button` filters, mono showtime times + brass prices.
  - **1d auth** (`LoginPage`, `SignupPage`): centered `Card` with eyebrow header, `Field`/`Input`
    + `Button`; success/error banners in palette.
  - **1e my tickets** (`ReservationsPage`): tabs, `Card` rows, status `Badge` (`tone` = lowercased
    status), danger cancel-confirm, empty-state CTA.
  - **1f hold** (`HoldPage`): **the signature lands** — confirm + confirmed views render as the
    `TicketStub`; low-time countdown turns vermilion; confirm still NOT gated on the countdown.
  - **1g admin** (shell + 5 pages): brass sub-nav; `Card`/`Field`/`Select`/`Table` throughout;
    added a `Textarea` primitive.
  - **1h seat picker** (`SeatGrid`, `SeatPickerPage`, new `seatStyles.ts`): the careful pass —
    seat hues retuned to tokens with semantics frozen (**selected = brass, HELD = ocher + shared
    `HELD_HATCH`, BOOKED = oxblood, AVAILABLE clickable, just-lost ring = vermilion/offset**),
    screen as a warm light spill, mono labels, legend matches the grid; the 409 re-pick flow and
    refresh-on-conflict untouched.
  - **Verification (rollout):** `vite build` clean (CSS settled ~22.5 kB once the slate/indigo
    utilities dropped out), `eslint` clean, `vitest` 11/11 (auth/TZ/409-parse regressions green),
    dev-server transforms 200 across the migrated modules (incl. `SeatGrid`/`SeatPickerPage`/
    `HoldPage`). DOM not auto-clicked — no browser driver until Part 4.
  - **Note:** the temporary `/style` preview is **kept for now** as living reference for Part 2
    polish; it'll be removed (or gated) before the slice closes.

**Part 1 (restyle) complete.** STOP gate: awaiting user in-browser review (esp. the seat picker +
hold/ticket-stub) before Part 2 (polish states: loading/error/empty + responsive seat grid).

> Part 1 reviewed in-browser and approved; proceeded to Part 2.

- Slice 8 — **Part 2 (done, pushed)**: polish states + responsive seat grid. **Presentation
  only.** Unified the loading/error/empty patterns that were copy-pasted inline across pages into
  shared primitives, so feedback speaks in one voice:
  - **New primitives** in `src/components/ui/`: `Alert` (tones error/success/warning/info, with
    `role=alert|status`), `EmptyState` (title + message + optional action — an invitation, not a
    dead end), `Spinner` (brass ring, `motion-reduce:animate-none`), `Loading` (spinner + label),
    `Skeleton` (pulsing block, reduced-motion aware).
  - **Sweep:** every inline `border-status-expired/10…` error banner → `<Alert>`; success/warning
    notices → `<Alert tone=…>`; `Loading…` text → `<Loading>` (or skeletons). **Movies grid** and
    the **seat map** now load as **skeletons** (the two heaviest first paints); page-level empties
    (Movies, My tickets, Admin movies) → `EmptyState` with a CTA. The seat-picker 409 "pick again"
    message deliberately keeps its **vermilion** (`alert`) styling — it matches the lost-seat ring,
    not a generic red error.
  - **Responsive seat grid:** seats `h-7 w-7` → `sm:h-8 sm:w-8`, gaps/row-label tighten on mobile,
    `overflow-x-auto` retained as the graceful fallback for the 80-seat room.
  - **Quality floor:** global `:focus-visible` brass outline + `prefers-reduced-motion` block
    (from 1a) confirmed; spinner/skeleton also opt out of motion individually.
  - `/style` gains a **States** section (Alerts / Loading / Empty) so the design system stays
    complete as living reference.
  - **Verification:** `vite build` (128 modules), `eslint` clean, `vitest` 11/11, dev-server
    transforms 200 across the new primitives + swept pages. DOM not auto-clicked (browser driver
    arrives in Part 4).

**Parts 1–2 complete.** Remaining: Part 3 (README — two-tab overbooking narrative) and Part 4
(two-tab overbooking demo + Playwright GIF). `/style` still mounted; remove/gate before the slice
closes.

- Slice 8 — **Part 3 (done, pushed)**: README rewritten so the **headline mirrors the backend's
  overbooking narrative, from the client side** — the backend guarantees one winner, so the story
  here is *what the loser sees*: the 409 (a uniform body whose `message` names seats as a **string**,
  `"Seats not available: C7"`) turned into "C7 was just taken. Pick again." with the seat re-rendering
  `HELD` + the **vermilion ring**, never a generic error, never a seat shown sold twice. Mirrors the
  backend README's shape/voice: anchored TOC, a `(the headline)` section, honest-scope framing,
  tables. Sections: what it is · tech stack · the overbooking race (+ a two-tab "try it yourself" and
  the **refresh-on-conflict, not websockets** rationale — deterministic for the demo) · architecture
  (single-flight refresh / typed `http` / refetch-on-409 / server-driven pagination) · **Design**
  (warm editorial × dark cinema, self-hosted font trio, ticket-stub signature, the five seat states)
  · run steps · client auth · the verified landmines (UTC-without-`Z`, string 409 body, display-only
  countdown, server-authoritative mutations) · project layout · what I'd add. Cross-links the backend
  README's overbooking + auth sections. Left an HTML-comment **placeholder for the Part 4 GIF**.
  Verified the run claims before asserting them: `.env.example` exists, `vite.config` really sets
  `strictPort: true` on 5173.

**Parts 1–3 complete.** Remaining: Part 4 (two-tab overbooking demo + Playwright GIF — first browser
driver in the repo; rehearse manually, then gate so the GIF can be watched). `/style` still mounted;
remove/gate as part of closing the slice.

- Slice 8 — **Part 4 (done, pushed)** — closes Slice 8: two-tab overbooking demo + Playwright GIF —
  the first browser driver in the repo. Scoped deliberately (two files: `e2e/smoke.e2e.ts` light smoke +
  `e2e/overbooking.e2e.ts` the demo capture; `playwright.config.ts`), NOT a sprawling E2E suite —
  the project still verifies behavior at the contract level. The capture mints a fresh showtime per
  run (admin API, random readable 2037 slot with retry-on-overlap) so the room is always clean
  (confirming books seats; there's no delete-showtime endpoint), auths two real users (demo-a /
  demo-b) by seeding their refresh token into `localStorage` (no login footage), then drives the race
  in two isolated contexts and screenshots each beat. A throwaway `ffmpeg` step composed the beats
  side-by-side (TAB A | TAB B banners, top-aligned panes so the app header lines up, per-beat dwell —
  ~5.5s on the 409, the headline) into **`docs/overbooking-demo.gif`** (the committed artifact, 153 KB,
  7 beats, 24s). The 🎟️ in the confirmed heading was dropped (it rendered as a stray red glyph in
  headless Chromium — a fragile cross-environment emoji; the green `CONFIRMED` badge already carries
  the moment).

### ⚠️ Live finding (Part 4) — the HEADLINE feature was broken; caught only by the first real browser drive

The whole point of the 409 path is *"the lost seat re-renders **HELD**."* It **didn't.** On the 409 the
ring + "C7 was just taken. Pick again." copy appeared (both driven by component state), but the seat
stayed **dark/AVAILABLE** — it never flipped to HELD. Cause: the conflict handler refetches the seat map
via `queryClient.fetchQuery`, but the global `queryClient` sets **`staleTime: 30_000`**, so `fetchQuery`
returned the **cached** map (C7 still AVAILABLE) instead of hitting the network. The backend was correct
the whole time (verified live: A holds C7 → 201; B holds C7 → 409 `"Seats not available: C7"`; map shows
C7 `HELD`). The bug was purely client-side: a **cache × render interaction**.

Why it survived every prior slice: it lives **above** the contract/unit-test line. Slices 4–7 verified
the API contract + `tsc`/`eslint`/`vitest` + Vite transforms, but **never drove the rendered DOM** (the
progress notes said so each time). The seat-map GET is correct in isolation; only the *cached refetch on
conflict* is wrong, and that only manifests in a live browser with a warmed cache. **Part 4's browser
drive is the first thing that could have caught it — and did, on the first run.**

Fix (`src/pages/SeatPickerPage.tsx`): `staleTime: 0` on the conflict `fetchQuery` — force a real refetch.
This is the refresh-on-conflict design, not a patch: **the conflict IS the freshness signal.** Guarded
two ways so a future global-config change can't silently re-break it: (1) a load-bearing comment + a
**dev-only tripwire** that `console.warn`s if the "fresh" map still shows a reportedly-taken seat as
AVAILABLE (i.e. a cache hit), and (2) `e2e/overbooking.e2e.ts` asserts the `HELD` flip at the browser
level. After the fix the seat flips to HELD (ocher + hatch) + vermilion ring, exactly as the README claims.

### Decision (Part 4) — Playwright pinned to 1.48.2 (Node-18 ESM/TS landmine)

Latest Playwright (1.61) throws `ERR_UNKNOWN_FILE_EXTENSION` on the `.ts` config under this repo's
`"type":"module"` + **Node 18.17.1**: its TS-under-ESM loader needs Node ≥18.19 (`module.register`).
Pinned **`@playwright/test@1.48.2`** (engines `>=18`, older transpile path) which loads `.ts` fine on
18.17.1. (ffmpeg for the GIF: no system ffmpeg, so `ffmpeg-static` as a transient dev tool — the GIF is
a recording of finished work, kept out of the long-term dependency surface.)

**Dependency surface after Part 4:** kept `@playwright/test` + the two `.e2e.ts` files +
`playwright.config.ts` (the smoke pass stays runnable: `npm run e2e`). Dropped `ffmpeg-static` and the
throwaway `e2e/build-gif.mjs` once the GIF was built — the artifact ships, the heavy capture-only tooling
doesn't. All e2e output (`e2e/output/`, `test-results/`, `playwright-report/`) is gitignored; only
`docs/overbooking-demo.gif` is committed.

**`/style` removed.** The temporary design-foundation preview (`StylePreviewPage`, mounted at `/style`
since Part 1a as living reference for the restyle review) is deleted along with its route — it was
scaffolding, not something that should ship in a portfolio build.

**Verification (Part 4):** the capture itself is the proof — it drives two real authenticated browser
contexts against the live backend and **asserts** the deterministic race (A `POST /api/reservations` →
201; B → 409 `"Seats not available: C7"`; C7 flips `HELD` + vermilion ring + "pick again"; B re-picks C8
→ 201; both confirm → no double-book). Plus `tsc -b && vite build` clean (127 modules after `/style`
removal), `eslint` clean, `vitest` 11/11 (auth/TZ/409-parse regressions green). The README placeholder now
embeds the GIF with an honest caption (live Playwright capture, not a mockup).

**Slice 8 complete (Parts 1–4). The frontend SPA is feature-complete per the planned scope.**
