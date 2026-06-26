// Admin-only API calls (behind the ADMIN role; the backend enforces 403, the UI
// gates with RequireAdmin). Grows per Slice 7 part — this is Part A+B (movies).
import { authFetch } from '../lib/session';
import type { MovieRequest, MovieResponse } from '../types/api';

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
