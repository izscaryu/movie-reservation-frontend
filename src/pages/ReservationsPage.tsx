import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { cancelReservation, getMyReservations } from '../api/reservations';
import type { ReservationFilter } from '../api/reservations';
import { ApiError } from '../lib/http';
import { formatDateTime, formatPrice } from '../lib/format';
import type { ReservationResponse, ReservationStatus } from '../types/api';
import { cn } from '../lib/cn';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import type { BadgeTone } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Loading from '../components/ui/Loading';
import PageHeader from '../components/ui/PageHeader';
import { buttonClasses } from '../components/ui/buttonClasses';

const PAGE_SIZE = 10;

// Cancel is offered only for these states. Verified live: DELETE on a PENDING or a
// (future) CONFIRMED reservation returns 204; the server owns the transition. A
// CANCELLED/EXPIRED row has nothing to cancel, and re-cancelling 409s.
const CANCELLABLE: ReservationStatus[] = ['PENDING', 'CONFIRMED'];

const tabClass = (active: boolean) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    active
      ? 'bg-brass text-ink'
      : 'border border-ink-line text-paper-dim hover:bg-ink-raised hover:text-paper',
  );

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

  return (
    <div>
      <PageHeader
        eyebrow="The Orpheum"
        title="My tickets"
        actions={
          <div className="flex gap-2">
            <button onClick={() => switchFilter('upcoming')} className={tabClass(filter === 'upcoming')}>
              Upcoming
            </button>
            <button onClick={() => switchFilter('past')} className={tabClass(filter === 'past')}>
              Past
            </button>
          </div>
        }
      />

      {actionError && (
        <Alert className="mb-4">{actionError}</Alert>
      )}

      {isPending && <Loading>Loading reservations…</Loading>}

      {isError && (
        <Alert>
          Failed to load reservations: {error instanceof Error ? error.message : 'unknown error'}
        </Alert>
      )}

      {data && (
        <>
          {data.content.length === 0 ? (
            <EmptyState
              title={`No ${filter} tickets`}
              action={
                filter === 'upcoming' ? (
                  <Link to="/" className={buttonClasses()}>
                    Browse movies
                  </Link>
                ) : undefined
              }
            >
              {filter === 'upcoming'
                ? "Browse what's showing to book some seats."
                : 'Past tickets will appear here.'}
            </EmptyState>
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
          <div className="mt-8 flex items-center justify-between text-sm text-paper-faint">
            <span>
              Page {data.page + 1} of {Math.max(data.totalPages, 1)} · {data.totalElements} reservation
              {data.totalElements === 1 ? '' : 's'}
              {isFetching && ' · updating…'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.first}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.last}
              >
                Next
              </Button>
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
    <li>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-lg font-semibold text-paper">{r.movieTitle}</h2>
            <Badge tone={r.status.toLowerCase() as BadgeTone}>{r.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-paper-dim">{formatDateTime(r.startTime)}</p>
          <p className="mt-1 text-sm text-paper-dim">
            Seats <span className="font-mono text-paper">{r.seats.join(', ')}</span> ·{' '}
            <span className="font-mono text-brass">{formatPrice(r.totalPrice)}</span>
          </p>
        </div>

        {cancellable && (
          <div className="flex shrink-0 items-center gap-2">
            {confirming ? (
              <>
                <span className="text-sm text-paper-dim">Cancel this reservation?</span>
                <Button variant="danger" size="sm" onClick={onConfirmCancel} disabled={busy}>
                  {busy ? 'Cancelling…' : 'Yes, cancel'}
                </Button>
                <Button variant="secondary" size="sm" onClick={onDismissCancel} disabled={busy}>
                  Keep
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={onAskCancel}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </Card>
    </li>
  );
}
