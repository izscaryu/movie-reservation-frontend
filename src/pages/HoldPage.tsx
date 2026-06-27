import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { cancelReservation, confirmReservation } from '../api/reservations';
import { useCountdown } from '../hooks/useCountdown';
import { ApiError } from '../lib/http';
import { formatDateTime, formatPrice } from '../lib/format';
import type { ReservationResponse } from '../types/api';
import { cn } from '../lib/cn';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import TicketStub from '../components/ui/TicketStub';
import { buttonClasses } from '../components/ui/buttonClasses';

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
      <Card className="mx-auto max-w-md text-center">
        <h1 className="font-display text-xl font-semibold text-paper">Hold not available here</h1>
        <p className="mt-2 text-sm text-paper-dim">
          Reloading drops the hold details from this page. Check your tickets to confirm or cancel
          it.
        </p>
        <Link to="/reservations" className={cn('mt-5 inline-flex', buttonClasses())}>
          My tickets
        </Link>
      </Card>
    );
  }

  if (outcome.kind === 'confirmed') {
    const r = outcome.reservation;
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="mb-5 text-center font-display text-2xl font-semibold text-paper">
          You're in
        </h1>
        <TicketStub
          admit={r.seats.length}
          title={r.movieTitle}
          seats={r.seats.join(', ')}
          when={formatDateTime(r.startTime)}
          serial={r.id}
          price={formatPrice(r.totalPrice)}
          footer={
            <div className="space-y-4">
              <div className="flex justify-center">
                <Badge tone="confirmed">CONFIRMED</Badge>
              </div>
              <div className="flex gap-3">
                <Link to="/reservations" className={cn('flex-1', buttonClasses({ fullWidth: true }))}>
                  My tickets
                </Link>
                <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
                  Browse
                </Link>
              </div>
            </div>
          }
        />
      </div>
    );
  }

  if (outcome.kind === 'expired') {
    return (
      <Card className="mx-auto max-w-md border-status-expired/40">
        <h1 className="font-display text-xl font-semibold text-status-expired">Hold expired</h1>
        <p className="mt-2 text-sm text-paper-dim">{outcome.message}</p>
        <p className="mt-2 text-sm text-paper-faint">
          Holds last about 10 minutes and are released automatically. Pick your seats again.
        </p>
        <Link
          to={`/showtimes/${hold.showtimeId}/seats`}
          className={cn('mt-5 inline-flex', buttonClasses())}
        >
          Back to seats
        </Link>
      </Card>
    );
  }

  const lowTime = countdown.remainingMs > 0 && countdown.remainingMs <= 60_000;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-5 text-center font-display text-2xl font-semibold text-paper">
        Confirm your seats
      </h1>
      <TicketStub
        admit={hold.seats.length}
        title={hold.movieTitle}
        seats={hold.seats.join(', ')}
        when={formatDateTime(hold.startTime)}
        serial={hold.id}
        price={formatPrice(hold.totalPrice)}
        footer={
          <div>
            {countdown.expired ? (
              <Alert tone="warning" className="text-center">
                Your hold timer has run out. You can still try to confirm — we'll check with the
                server.
              </Alert>
            ) : (
              <div className="rounded-md border border-ink-line bg-ink p-3 text-center">
                <p className="text-[0.625rem] uppercase tracking-eyebrow text-paper-faint">
                  Hold expires in
                </p>
                <p
                  className={cn(
                    'mt-1 font-mono text-3xl font-semibold tabular-nums',
                    lowTime ? 'text-alert' : 'text-paper',
                  )}
                >
                  {countdown.label}
                </p>
              </div>
            )}

            {outcome.kind === 'error' && (
              <Alert className="mt-4">{outcome.message}</Alert>
            )}

            <div className="mt-4 flex gap-3">
              {/* NOT disabled on the countdown (landmine #2) — only while a request is
                  in flight. The server's 409 is authoritative. */}
              <Button
                fullWidth
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending || cancelMutation.isPending}
              >
                {confirmMutation.isPending ? 'Confirming…' : 'Confirm'}
              </Button>
              <Button
                variant="danger"
                onClick={() => cancelMutation.mutate()}
                disabled={confirmMutation.isPending || cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'Releasing…' : 'Release'}
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
}
