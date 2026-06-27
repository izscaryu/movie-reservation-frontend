import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSeatMap } from '../api/movies';
import { createReservation } from '../api/reservations';
import { useAuth } from '../auth/AuthContext';
import SeatGrid from '../components/SeatGrid';
import { HELD_HATCH } from '../components/seatStyles';
import { ApiError } from '../lib/http';
import { parseUnavailableSeatLabels } from '../lib/seatConflict';
import { cn } from '../lib/cn';
import type { SeatMapEntry } from '../types/api';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Eyebrow from '../components/ui/Eyebrow';
import Skeleton from '../components/ui/Skeleton';

export default function SeatPickerPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>();
  const id = Number(showtimeId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [conflictLabels, setConflictLabels] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const seatMapKey = ['seats', id];

  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: seatMapKey,
    queryFn: () => getSeatMap(id),
    enabled: Number.isFinite(id),
  });

  const seats = data?.seats ?? [];
  const selectedSeats = seats.filter((s) => selected.has(s.showtimeSeatId));

  function toggleSeat(seat: SeatMapEntry) {
    // Picking again clears the just-failed highlight.
    if (conflictLabels.size) setConflictLabels(new Set());
    setErrorMessage(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.showtimeSeatId)) next.delete(seat.showtimeSeatId);
      else next.add(seat.showtimeSeatId);
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: () => createReservation({ showtimeId: id, showtimeSeatIds: [...selected] }),
    onSuccess: (reservation) => {
      // Hand the PENDING hold to the confirm page via navigation state (there's no
      // GET /api/reservations/{id} to refetch it from).
      void queryClient.invalidateQueries({ queryKey: seatMapKey });
      navigate(`/hold/${reservation.id}`, { state: { reservation } });
    },
    onError: async (err) => {
      if (err instanceof ApiError && err.status === 409) {
        // The 409 is a FEATURE, not a generic error (landmine #5). The body names
        // the seats that were taken — read them, refresh the map so they show as
        // HELD, drop them from the selection, and let the user re-pick.
        const lost = parseUnavailableSeatLabels(err.body?.message);
        const lostSet = new Set(lost);
        setConflictLabels(lostSet);
        const refreshed = await queryClient.fetchQuery({
          queryKey: seatMapKey,
          queryFn: () => getSeatMap(id),
          // staleTime:0 is LOAD-BEARING, do not remove. The global queryClient
          // sets staleTime:30s; without this override fetchQuery returns the
          // CACHED map and the lost seats never flip to HELD — the entire
          // refresh-on-conflict headline silently breaks. It's a cache+render
          // interaction that sits ABOVE the contract/unit tests (invisible to
          // them); it was only caught when the two-tab Playwright demo first drove
          // a real browser. The conflict IS the freshness signal: always refetch.
          staleTime: 0,
        });
        // Guard so a future global-config change can't silently re-break the above:
        // if the server said these seats are taken but the "fresh" map still shows
        // one AVAILABLE, the refetch was served from cache. Make it loud in dev
        // rather than shipping a broken headline. (e2e/overbooking.e2e.ts is the
        // browser-level guard; this is the always-on dev tripwire.)
        if (import.meta.env.DEV) {
          const stillFree = refreshed.seats.filter(
            (s) => lostSet.has(s.label) && s.status === 'AVAILABLE',
          );
          if (stillFree.length) {
            console.warn(
              '[seat-conflict] refetch returned STALE data — seats reported taken are still AVAILABLE:',
              stillFree.map((s) => s.label),
              '\nThe conflict refetch must bypass the global staleTime (see staleTime:0 above).',
            );
          }
        }
        // Remove the lost seats from the selection (match by label via the fresh map).
        const lostIds = new Set(
          refreshed.seats.filter((s) => lostSet.has(s.label)).map((s) => s.showtimeSeatId),
        );
        setSelected((prev) => new Set([...prev].filter((sid) => !lostIds.has(sid))));
        setErrorMessage(
          lost.length
            ? `${lost.join(', ')} ${lost.length === 1 ? 'was' : 'were'} just taken. Pick again.`
            : 'Some seats were just taken. Pick again.',
        );
      } else if (err instanceof ApiError && err.status === 400) {
        setErrorMessage(err.body?.message ?? 'Invalid selection.');
      } else if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { state: { from: { pathname: `/showtimes/${id}/seats` } } });
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Could not hold seats.');
      }
    },
  });

  function onReserve() {
    setErrorMessage(null);
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/showtimes/${id}/seats` } } });
      return;
    }
    mutation.mutate();
  }

  if (!Number.isFinite(id)) return <p className="text-paper-dim">Invalid showtime id.</p>;
  if (isPending) return <SeatMapSkeleton />;
  if (isError) {
    return (
      <Alert>Failed to load seat map: {error instanceof Error ? error.message : 'unknown error'}</Alert>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-ink-line pb-4">
        <div>
          <Eyebrow>The Orpheum</Eyebrow>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-paper">
            Pick your seats
          </h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: seatMapKey })}
        >
          {isFetching ? 'Refreshing…' : 'Refresh map'}
        </Button>
      </div>

      <Legend />

      <div className="mt-8">
        <SeatGrid
          seats={seats}
          selected={selected}
          conflictLabels={conflictLabels}
          onToggle={toggleSeat}
        />
      </div>

      {errorMessage && (
        // The 409 "pick again" message uses the lost-seat vermilion, matching the
        // ring on the grid — deliberately distinct from a generic red error.
        <p className="mx-auto mt-6 max-w-md rounded-md border border-alert/50 bg-alert/10 px-4 py-3 text-center text-sm text-alert">
          {errorMessage}
        </p>
      )}

      <div className="sticky bottom-0 mt-10 flex items-center justify-between gap-4 border-t border-ink-line bg-ink/90 py-4 backdrop-blur">
        <div className="text-sm text-paper-dim">
          {selectedSeats.length === 0 ? (
            <span className="text-paper-faint">No seats selected</span>
          ) : (
            <span>
              Selected:{' '}
              <span className="font-mono text-paper">
                {selectedSeats.map((s) => s.label).join(', ')}
              </span>{' '}
              <span className="text-paper-faint">({selectedSeats.length})</span>
            </span>
          )}
        </div>
        <Button
          size="lg"
          onClick={onReserve}
          disabled={selected.size === 0 || mutation.isPending}
        >
          {mutation.isPending
            ? 'Holding…'
            : isAuthenticated
              ? `Hold ${selected.size || ''} seat${selected.size === 1 ? '' : 's'}`.trim()
              : 'Log in to reserve'}
        </Button>
      </div>
    </div>
  );
}

function SeatMapSkeleton() {
  return (
    <div className="mx-auto w-fit" aria-hidden>
      <Skeleton className="mx-auto mb-8 h-1 w-3/4" />
      <div className="space-y-1 sm:space-y-1.5">
        {Array.from({ length: 6 }).map((_, r) => (
          <div key={r} className="flex gap-1 sm:gap-1.5">
            {Array.from({ length: 10 }).map((_, c) => (
              <Skeleton key={c} className="h-7 w-7 sm:h-8 sm:w-8" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  const items: { cls: string; label: string; hatch?: boolean }[] = [
    { cls: 'bg-seat-open', label: 'Available' },
    { cls: 'bg-brass', label: 'Selected' },
    { cls: 'bg-seat-held', label: 'Held', hatch: true },
    { cls: 'bg-seat-booked', label: 'Booked' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-paper-faint">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            style={i.hatch ? HELD_HATCH : undefined}
            className={cn('inline-block h-3.5 w-3.5 rounded', i.cls)}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}
