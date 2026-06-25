import { apiFetch, buildQuery } from '../lib/http';
import type {
  MovieResponse,
  PageResponse,
  SeatMapResponse,
  ShowtimeResponse,
} from '../types/api';

export interface MoviesQuery {
  genre?: string;
  page?: number;
  size?: number;
}

export function getMovies(params: MoviesQuery = {}): Promise<PageResponse<MovieResponse>> {
  return apiFetch(`/api/movies${buildQuery({ ...params })}`);
}

export function getMovie(id: number): Promise<MovieResponse> {
  return apiFetch(`/api/movies/${id}`);
}

/** Showtimes for a movie, optionally filtered to a single date (YYYY-MM-DD). Returns a plain list. */
export function getShowtimes(movieId: number, date?: string): Promise<ShowtimeResponse[]> {
  return apiFetch(`/api/movies/${movieId}/showtimes${buildQuery({ date })}`);
}

export function getSeatMap(showtimeId: number): Promise<SeatMapResponse> {
  return apiFetch(`/api/showtimes/${showtimeId}/seats`);
}
