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
- [ ] Slice 4 — Seat picker + 409 which-seats-failed handling.
- [ ] Slice 5 — Hold countdown (display-only) + confirm + confirm-after-expiry 409.
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
