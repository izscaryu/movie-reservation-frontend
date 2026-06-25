import { buildQuery } from '../lib/http';
import { authFetch } from '../lib/session';
import type {
  PageResponse,
  ReservationRequest,
  ReservationResponse,
} from '../types/api';

export type ReservationFilter = 'upcoming' | 'past';

export interface MyReservationsQuery {
  filter?: ReservationFilter;
  page?: number;
  size?: number;
}

/** Hold seats → 201 PENDING with expiresAt. 409 if a seat was taken concurrently. */
export function createReservation(body: ReservationRequest): Promise<ReservationResponse> {
  return authFetch('/api/reservations', { method: 'POST', json: body });
}

export function confirmReservation(id: number): Promise<ReservationResponse> {
  return authFetch(`/api/reservations/${id}/confirm`, { method: 'POST' });
}

export function cancelReservation(id: number): Promise<void> {
  return authFetch(`/api/reservations/${id}`, { method: 'DELETE' });
}

export function getMyReservations(
  params: MyReservationsQuery = {},
): Promise<PageResponse<ReservationResponse>> {
  return authFetch(`/api/reservations/me${buildQuery({ ...params })}`);
}
