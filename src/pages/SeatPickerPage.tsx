import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSeatMap } from '../api/movies';
import { createReservation } from '../api/reservations';
import { useAuth } from '../auth/AuthContext';
import SeatGrid from '../components/SeatGrid';
import { ApiError } from '../lib/http';
import { parseUnavailableSeatLabels } from '../lib/seatConflict';
import type { SeatMapEntry } from '../types/api';

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
    mutationFn: () =>
      createReservation({ showtimeId: id, showtimeSeatIds: [...selected] }),
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
        });
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

  if (!Number.isFinite(id)) return <p className="text-slate-400">Invalid showtime id.</p>;
  if (isPending) return <p className="text-slate-400">Loading seat map…</p>;
  if (isError) {
    return (
      <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">
        Failed to load seat map: {error instanceof Error ? error.message : 'unknown error'}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pick your seats</h1>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: seatMapKey })}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          {isFetching ? 'Refreshing…' : 'Refresh map'}
        </button>
      </div>

      <Legend />

      <div className="mt-6">
        <SeatGrid
          seats={seats}
          selected={selected}
          conflictLabels={conflictLabels}
          onToggle={toggleSeat}
        />
      </div>

      {errorMessage && (
        <p className="mx-auto mt-6 max-w-md rounded-md border border-rose-800 bg-rose-950/50 px-4 py-3 text-center text-sm text-rose-200">
          {errorMessage}
        </p>
      )}

      <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-4 border-t border-slate-800 bg-slate-950/90 py-4 backdrop-blur">
        <div className="text-sm text-slate-300">
          {selectedSeats.length === 0 ? (
            <span className="text-slate-500">No seats selected</span>
          ) : (
            <span>
              Selected: <span className="font-medium">{selectedSeats.map((s) => s.label).join(', ')}</span>{' '}
              <span className="text-slate-500">({selectedSeats.length})</span>
            </span>
          )}
        </div>
        <button
          onClick={onReserve}
          disabled={selected.size === 0 || mutation.isPending}
          className="rounded-md bg-indigo-600 px-5 py-2.5 font-medium hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending
            ? 'Holding…'
            : isAuthenticated
              ? `Hold ${selected.size || ''} seat${selected.size === 1 ? '' : 's'}`.trim()
              : 'Log in to reserve'}
        </button>
      </div>
    </div>
  );
}

function Legend() {
  const items: { cls: string; label: string }[] = [
    { cls: 'bg-slate-700', label: 'Available' },
    { cls: 'bg-indigo-500', label: 'Selected' },
    { cls: 'bg-amber-700/60', label: 'Held' },
    { cls: 'bg-rose-900/70', label: 'Booked' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3.5 w-3.5 rounded ${i.cls}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
