// Admin-only API calls (behind the ADMIN role; the backend enforces 403, the UI
// gates with RequireAdmin). Grows per Slice 7 part — this is Part A+B (movies).
import { buildQuery } from '../lib/http';
import { authFetch } from '../lib/session';
import type {
  AdminReservationResponse,
  MovieRequest,
  MovieResponse,
  OccupancyReport,
  PageResponse,
  PopularMovie,
  ReservationStatus,
  RevenueByMovie,
  RevenueReport,
  ShowtimeRequest,
  ShowtimeResponse,
} from '../types/api';

/** Create a movie. 201 with the full MovieResponse. 400 (uniform body) on validation. */
export function createMovie(body: MovieRequest): Promise<MovieResponse> {
  return authFetch('/api/admin/movies', { method: 'POST', json: body });
}

/** Update a movie. 200 with the updated MovieResponse. */
export function updateMovie(id: number, body: MovieRequest): Promise<MovieResponse> {
  return authFetch(`/api/admin/movies/${id}`, { method: 'PUT', json: body });
}

/** Soft-delete a movie. 204 (no body). Afterwards it drops out of GET /api/movies. */
export function deleteMovie(id: number): Promise<void> {
  return authFetch(`/api/admin/movies/${id}`, { method: 'DELETE' });
}

/** Create a showtime. 201 with the full ShowtimeResponse (startTime echoed, endTime derived). */
export function createShowtime(body: ShowtimeRequest): Promise<ShowtimeResponse> {
  return authFetch('/api/admin/showtimes', { method: 'POST', json: body });
}

// ---- Reports ----
// from/to are LocalDate strings (yyyy-MM-dd); both optional (null/omitted = all-time).
// A datetime (with a T) is rejected (400). Verified live.
export interface DateRangeQuery {
  from?: string;
  to?: string;
}

export function getRevenueReport(q: DateRangeQuery = {}): Promise<RevenueReport> {
  return authFetch(`/api/admin/reports/revenue${buildQuery({ ...q })}`);
}

export function getRevenueByMovie(q: DateRangeQuery = {}): Promise<RevenueByMovie[]> {
  return authFetch(`/api/admin/reports/revenue/by-movie${buildQuery({ ...q })}`);
}

export interface PopularMoviesQuery extends DateRangeQuery {
  page?: number;
  size?: number;
}

export function getPopularMovies(q: PopularMoviesQuery = {}): Promise<PageResponse<PopularMovie>> {
  return authFetch(`/api/admin/reports/popular-movies${buildQuery({ ...q })}`);
}

/** Occupancy for one showtime. 404 if the showtime id doesn't exist. */
export function getOccupancy(showtimeId: number): Promise<OccupancyReport> {
  return authFetch(`/api/admin/reports/occupancy${buildQuery({ showtimeId })}`);
}

// ---- Admin reservations ----
export interface AdminReservationsQuery {
  status?: ReservationStatus;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  /** Entity field; an unknown field is rejected (400). Keep to known columns. */
  sort?: string;
  direction?: 'asc' | 'desc';
}

export function getAdminReservations(
  q: AdminReservationsQuery = {},
): Promise<PageResponse<AdminReservationResponse>> {
  return authFetch(`/api/admin/reservations${buildQuery({ ...q })}`);
}
