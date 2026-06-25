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
