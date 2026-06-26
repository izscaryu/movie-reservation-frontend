import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { cancelReservation, getMyReservations } from '../api/reservations';
import type { ReservationFilter } from '../api/reservations';
import { ApiError } from '../lib/http';
import { formatDateTime, formatPrice } from '../lib/format';
import type { ReservationResponse, ReservationStatus } from '../types/api';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<ReservationStatus, string> = {
  CONFIRMED: 'border-emerald-800 bg-emerald-950/40 text-emerald-200',
  PENDING: 'border-amber-800 bg-amber-950/40 text-amber-200',
  CANCELLED: 'border-slate-700 bg-slate-800/60 text-slate-400',
  EXPIRED: 'border-rose-900 bg-rose-950/40 text-rose-300',
};

// Cancel is offered only for these states. Verified live: DELETE on a PENDING or a
// (future) CONFIRMED reservation returns 204; the server owns the transition. A
// CANCELLED/EXPIRED row has nothing to cancel, and re-cancelling 409s.
const CANCELLABLE: ReservationStatus[] = ['PENDING', 'CONFIRMED'];

export default function ReservationsPage() {
  const [filter, setFilter] = useState<ReservationFilter>('upcoming');
  const [page, setPage] = useState(0);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['reservations', { filter, page, size: PAGE_SIZE }],
    queryFn: () => getMyReservations({ filter, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelReservation(id),
    onSuccess: () => {
      setConfirmId(null);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (err, id) => {
      setConfirmId(null);
      // The server is authoritative: the row may have changed underneath us (e.g.
      // cancelled in another tab → 409, or swept → 404). Refetch so the list reflects
      // the real state, and surface the server's message.
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        setActionError(err.body?.message ?? `Reservation #${id} could not be cancelled.`);
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
      } else {
        setActionError(err instanceof Error ? err.message : 'Could not cancel the reservation.');
      }
    },
  });

  function switchFilter(next: ReservationFilter) {
    if (next === filter) return;
    setFilter(next);
    setPage(0);
    setConfirmId(null);
    setActionError(null);
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? 'bg-indigo-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
    }`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">My reservations</h1>
        <div className="flex gap-2">
          <button onClick={() => switchFilter('upcoming')} className={tabClass(filter === 'upcoming')}>
            Upcoming
          </button>
          <button onClick={() => switchFilter('past')} className={tabClass(filter === 'past')}>
            Past
          </button>
        </div>
      </div>

      {actionError && (
        <p className="mb-4 rounded-md border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          {actionError}
        </p>
      )}

      {isPending && <p className="text-slate-400">Loading reservations…</p>}

      {isError && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">
          Failed to load reservations: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {data && (
        <>
          {data.content.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
              <p className="text-slate-400">
                No {filter} reservations.
                {filter === 'upcoming' && ' Browse movies to book some seats.'}
              </p>
              {filter === 'upcoming' && (
                <Link
                  to="/"
                  className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
                >
                  Browse movies
                </Link>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {data.content.map((r) => (
                <ReservationRow
                  key={r.id}
                  reservation={r}
                  // Cancel only on the upcoming tab; the past tab is read-only history.
                  cancellable={filter === 'upcoming' && CANCELLABLE.includes(r.status)}
                  confirming={confirmId === r.id}
                  busy={cancelMutation.isPending && cancelMutation.variables === r.id}
                  onAskCancel={() => {
                    setActionError(null);
                    setConfirmId(r.id);
                  }}
                  onConfirmCancel={() => cancelMutation.mutate(r.id)}
                  onDismissCancel={() => setConfirmId(null)}
                />
              ))}
            </ul>
          )}

          {/* Server-driven pagination — never compute totals client-side (landmine #6). */}
          <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {data.page + 1} of {Math.max(data.totalPages, 1)} · {data.totalElements} reservation
              {data.totalElements === 1 ? '' : 's'}
              {isFetching && ' · updating…'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.first}
                className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={data.last}
                className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface RowProps {
  reservation: ReservationResponse;
  cancellable: boolean;
  confirming: boolean;
  busy: boolean;
  onAskCancel: () => void;
  onConfirmCancel: () => void;
  onDismissCancel: () => void;
}

function ReservationRow({
  reservation: r,
  cancellable,
  confirming,
  busy,
  onAskCancel,
  onConfirmCancel,
  onDismissCancel,
}: RowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{r.movieTitle}</h2>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}
          >
            {r.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">{formatDateTime(r.startTime)}</p>
        <p className="mt-1 text-sm text-slate-300">
          Seats {r.seats.join(', ')} · {formatPrice(r.totalPrice)}
        </p>
      </div>

      {cancellable && (
        <div className="flex shrink-0 items-center gap-2">
          {confirming ? (
            <>
              <span className="text-sm text-slate-400">Cancel this reservation?</span>
              <button
                onClick={onConfirmCancel}
                disabled={busy}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium hover:bg-rose-500 disabled:opacity-50"
              >
                {busy ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button
                onClick={onDismissCancel}
                disabled={busy}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              onClick={onAskCancel}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-rose-700 hover:bg-rose-950/40 hover:text-rose-200"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </li>
  );
}
