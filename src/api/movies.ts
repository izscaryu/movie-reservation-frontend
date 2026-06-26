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

/** Every (non-deleted) movie, paged through for pickers. size caps at 100 (>100 → 400). */
export async function getAllMovies(): Promise<MovieResponse[]> {
  const out: MovieResponse[] = [];
  for (let page = 0; ; page++) {
    const p = await getMovies({ page, size: 100 });
    out.push(...p.content);
    if (p.last || p.content.length === 0) break;
  }
  return out;
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
