// Hand-written mirror of the Spring Boot DTOs. Source of truth is the live
// OpenAPI spec (http://localhost:8080/v3/api-docs); verified against it and
// against real responses as of the Phase 10 backend. If this ever disagrees
// with Swagger, trust Swagger.

/** Uniform error body returned for every non-2xx: {timestamp, status, error, message, path}. */
export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

/** The backend's PageResponse<T> (a flattened Spring Page). */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ---- Auth ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  /** @deprecated alias of accessToken — use accessToken. */
  token: string;
  tokenType: string; // "Bearer"
  expiresInMs: number;
  refreshToken: string;
}

export type Role = 'USER' | 'ADMIN';

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: Role;
}

// ---- Movies / showtimes / seats ----

export interface MovieResponse {
  id: number;
  title: string;
  description: string | null;
  posterUrl: string | null;
  durationMinutes: number;
  /** Sorted genre names. */
  genres: string[];
  createdAt: string;
}

export interface ShowtimeResponse {
  id: number;
  movieId: number;
  movieTitle: string;
  theaterRoomId: number;
  roomName: string;
  startTime: string;
  endTime: string;
  price: number;
}

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface SeatMapEntry {
  /** The id you POST to reserve — NOT the physical seat id. */
  showtimeSeatId: number;
  rowLabel: string;
  seatNumber: number;
  label: string;
  status: SeatStatus;
}

export interface SeatMapResponse {
  showtimeId: number;
  seats: SeatMapEntry[];
}

// ---- Reservations ----

export interface ReservationRequest {
  showtimeId: number;
  showtimeSeatIds: number[];
}

/**
 * Admin create/update body for a movie. `title` + `durationMinutes` are required;
 * the rest are optional. The backend returns the full MovieResponse (genres come
 * back sorted), so callers can use the response directly. Verified live.
 */
export interface MovieRequest {
  title: string;
  durationMinutes: number;
  description?: string | null;
  posterUrl?: string | null;
  genres?: string[];
}

/**
 * Admin create body for a showtime. `startTime` is a zoneless LocalDateTime string
 * treated as UTC wall-clock (e.g. "2037-03-15T09:45") — sent exactly as the
 * datetime-local input gives it, NO offset conversion (the inverse of the Slice 5
 * read bug). Verified live: the backend echoes it back unchanged (seconds normalized
 * to ":00") and the public showtimes view displays the same wall-clock. endTime is
 * derived server-side from the movie duration. `theaterRoomId` is a raw id — there is
 * no GET /rooms, so valid ids are out-of-band (seeded rooms 1–3). See FRONTEND_PROGRESS.
 */
export interface ShowtimeRequest {
  movieId: number;
  theaterRoomId: number;
  startTime: string;
  price: number;
}

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

export interface ReservationResponse {
  id: number;
  showtimeId: number;
  movieTitle: string;
  startTime: string;
  status: ReservationStatus;
  createdAt: string;
  /** Hold expiry; meaningful while PENDING. Display-only — the server owns expiry. */
  expiresAt: string | null;
  totalPrice: number;
  /** Seat labels (e.g. "A5"), not ids. */
  seats: string[];
}

// ---- Admin reports ----

/** GET /api/admin/reports/revenue. from/to echo the (optional) range; null = all-time. */
export interface RevenueReport {
  from: string | null;
  to: string | null;
  totalRevenue: number;
  confirmedReservations: number;
}

/** A row of GET /api/admin/reports/revenue/by-movie (a plain array, sorted by revenue desc). */
export interface RevenueByMovie {
  movieId: number;
  movieTitle: string;
  revenue: number;
}

/** A row of the paged GET /api/admin/reports/popular-movies. */
export interface PopularMovie {
  movieId: number;
  movieTitle: string;
  ticketsSold: number;
}

/** GET /api/admin/reports/occupancy?showtimeId=. 404 if the showtime doesn't exist. */
export interface OccupancyReport {
  showtimeId: number;
  movieTitle: string;
  startTime: string;
  totalSeats: number;
  bookedSeats: number;
  /** Percentage, e.g. 5.00 = 5%. */
  occupancyRate: number;
}

/** A row of the paged GET /api/admin/reservations — richer than ReservationResponse
 *  (carries the owning user and uses `showtimeStartTime`, not `startTime`). No `seats`. */
export interface AdminReservationResponse {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  showtimeId: number;
  movieTitle: string;
  showtimeStartTime: string;
  status: ReservationStatus;
  createdAt: string;
  expiresAt: string | null;
  totalPrice: number;
}
