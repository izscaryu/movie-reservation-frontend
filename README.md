# Movie Reservation — Frontend

A React + TypeScript SPA for the [Movie Reservation System](../movie-reservation-system)
backend (Spring Boot REST API). Browse movies and showtimes, pick seats on a live
seat map, hold and confirm reservations, and (as an admin) manage the catalogue and
read reports.

> The backend is the contract. All types and endpoints are mirrored from the live
> OpenAPI spec at `http://localhost:8080/v3/api-docs` (Swagger UI at
> `/swagger-ui/index.html`), verified against real responses — not from memory.

## Stack

Vite 5 · React 18 · TypeScript (strict) · Tailwind CSS 3 · React Router 6 ·
TanStack Query 5. A thin hand-written typed `fetch` wrapper (no codegen). Auth state
in React Context only.

> Pinned to these majors because the toolchain targets **Node 18**. Vite 6+/Tailwind 4
> require Node 20+.

## Running it

The backend must be running first (in the backend repo: `docker compose up`), with
Swagger reachable at `http://localhost:8080`.

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:8080
npm run dev            # http://localhost:5173 (port is pinned — see below)
```

Keep Vite on **5173**: the backend's CORS allowlist defaults to
`http://localhost:5173`. A different port hits a CORS wall on day one (or override
`APP_CORS_ALLOWED_ORIGINS` on the backend). The dev server uses `strictPort` so a busy
5173 fails loudly instead of silently bumping the port.

```bash
npm run build   # tsc -b && vite build (strict typecheck + production build)
npm run lint
```

## Progress

Build progress and per-slice decisions are tracked in
[`FRONTEND_PROGRESS.md`](FRONTEND_PROGRESS.md).
