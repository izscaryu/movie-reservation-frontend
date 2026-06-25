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
- [ ] **Slice 2 — Auth layer.** login/signup; access-token-in-memory + refresh-token in
      localStorage; Bearer-attaching wrapper; **single-flight** refresh-on-401; silent
      re-login on load; logout; route guards (authed + ADMIN). STOP + report after this.
- [ ] Slice 3 — Browse (movies list + filter, detail, showtimes-by-date).
- [ ] Slice 4 — Seat picker + 409 which-seats-failed handling.
- [ ] Slice 5 — Hold countdown (display-only) + confirm + confirm-after-expiry 409.
- [ ] Slice 6 — My reservations (paginated upcoming/past, cancel).
- [ ] Slice 7 — Admin dashboard (movie CRUD, showtime create, 4 reports, admin reservations).
- [ ] Slice 8 — Polish + README + two-tab overbooking demo.

Out of scope (v1): realtime/websocket seat updates (poll / refresh-on-conflict),
payment, email, i18n, SSR.

## Log

- Slice 1 (in progress): scaffolded, configured Tailwind, wrote typed client + DTO
  types verified against live Swagger, wired Router + React Query, movies list renders
  real paginated data.
