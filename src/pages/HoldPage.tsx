import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { cancelReservation, confirmReservation } from '../api/reservations';
import { useCountdown } from '../hooks/useCountdown';
import { ApiError } from '../lib/http';
import { formatPrice } from '../lib/format';
import type { ReservationResponse } from '../types/api';

interface HoldLocationState {
  reservation?: ReservationResponse;
}

type Outcome =
  | { kind: 'none' }
  | { kind: 'confirmed'; reservation: ReservationResponse }
  | { kind: 'expired'; message: string } // 409 — hold no longer pending
  | { kind: 'error'; message: string };

export default function HoldPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // The hold is passed via navigation state from the seat picker. There is no
  // GET /api/reservations/{id}, so a hard refresh can't rebuild it here — fall
  // back to a pointer to "My reservations".
  const hold = (location.state as HoldLocationState | null)?.reservation ?? null;

  const [outcome, setOutcome] = useState<Outcome>({ kind: 'none' });
  const countdown = useCountdown(hold?.expiresAt ?? null);

  const confirmMutation = useMutation({
    mutationFn: () => confirmReservation(Number(reservationId)),
    onSuccess: (reservation) => setOutcome({ kind: 'confirmed', reservation }),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        // The hold lapsed (server-swept) or is no longer pending. This can happen
        // even if the local countdown hasn't hit zero — the server is the source
        // of truth (landmine #2).
        setOutcome({
          kind: 'expired',
          message: err.body?.message ?? 'This hold is no longer available.',
        });
      } else if (err instanceof ApiError && err.status === 404) {
        setOutcome({ kind: 'expired', message: 'This reservation no longer exists.' });
      } else {
        setOutcome({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Could not confirm.',
        });
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelReservation(Number(reservationId)),
    onSuccess: () => navigate('/reservations'),
    onError: (err) =>
      setOutcome({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not release the hold.',
      }),
  });

  if (!hold) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-center">
        <h1 className="text-xl font-semibold">Hold not available here</h1>
        <p className="mt-2 text-sm text-slate-400">
          Reloading drops the hold details from this page. Check your reservations to confirm or
          cancel it.
        </p>
        <Link
          to="/reservations"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          My reservations
        </Link>
      </div>
    );
  }

  if (outcome.kind === 'confirmed') {
    const r = outcome.reservation;
    return (
      <div className="mx-auto max-w-md rounded-lg border border-emerald-900 bg-emerald-950/30 p-6">
        <h1 className="text-xl font-semibold text-emerald-200">Reservation confirmed 🎟️</h1>
        <p className="mt-2 text-sm text-emerald-200/80">
          {r.seats.join(', ')} for <span className="font-medium">{r.movieTitle}</span>.
        </p>
        <p className="mt-1 text-sm text-slate-300">Total {formatPrice(r.totalPrice)}</p>
        <div className="mt-5 flex gap-3">
          <Link
            to="/reservations"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
          >
            My reservations
          </Link>
          <Link
            to="/"
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Browse movies
          </Link>
        </div>
      </div>
    );
  }

  if (outcome.kind === 'expired') {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-rose-900 bg-rose-950/30 p-6">
        <h1 className="text-xl font-semibold text-rose-200">Hold expired</h1>
        <p className="mt-2 text-sm text-rose-200/80">{outcome.message}</p>
        <p className="mt-2 text-sm text-slate-400">
          Holds last about 10 minutes and are released automatically. Pick your seats again.
        </p>
        <Link
          to={`/showtimes/${hold.showtimeId}/seats`}
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Back to seats
        </Link>
      </div>
    );
  }

  const lowTime = countdown.remainingMs > 0 && countdown.remainingMs <= 60_000;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">Confirm your seats</h1>
      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <p className="text-lg font-semibold">{hold.movieTitle}</p>
        <p className="mt-1 text-sm text-slate-400">Seats: {hold.seats.join(', ')}</p>
        <p className="mt-1 text-sm text-slate-300">Total {formatPrice(hold.totalPrice)}</p>

        <div className="mt-5 rounded-md border border-slate-800 bg-slate-950/60 p-4 text-center">
          {countdown.expired ? (
            <p className="text-sm text-amber-300">
              Your hold timer has run out. You can still try to confirm — we'll check with the
              server.
            </p>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wide text-slate-500">Hold expires in</p>
              <p
                className={`mt-1 font-mono text-3xl font-bold tabular-nums ${
                  lowTime ? 'text-rose-400' : 'text-slate-100'
                }`}
              >
                {countdown.label}
              </p>
            </>
          )}
        </div>

        {outcome.kind === 'error' && (
          <p className="mt-4 rounded-md border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
            {outcome.message}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          {/* NOT disabled on the countdown (landmine #2) — only while a request is
              in flight. The server's 409 is authoritative. */}
          <button
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending || cancelMutation.isPending}
            className="flex-1 rounded-md bg-indigo-600 px-3 py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {confirmMutation.isPending ? 'Confirming…' : 'Confirm'}
          </button>
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={confirmMutation.isPending || cancelMutation.isPending}
            className="rounded-md border border-slate-700 px-3 py-2.5 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {cancelMutation.isPending ? 'Releasing…' : 'Release hold'}
          </button>
        </div>
      </div>
    </div>
  );
}
