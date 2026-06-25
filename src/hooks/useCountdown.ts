import { useEffect, useState } from 'react';
import { parseServerInstant } from '../lib/format';

export interface Countdown {
  /** Whole minutes remaining. */
  minutes: number;
  /** Seconds within the current minute. */
  seconds: number;
  /** Total milliseconds remaining (clamped at 0). */
  remainingMs: number;
  /** mm:ss for display. */
  label: string;
  /** True once the local clock passes the target. */
  expired: boolean;
}

/**
 * A 1-second countdown to a backend timestamp.
 *
 * DISPLAY-ONLY (landmine #2): the server owns hold expiry and sweeps it itself.
 * This is purely for UX; callers must NOT gate actions (e.g. disable Confirm) on
 * `expired`, because the server may have expired the hold earlier OR the hold may
 * still be valid for a moment after the local clock hits zero. Trust the server's
 * 409 over this value.
 */
export function useCountdown(expiresAt: string | null): Countdown {
  const target = expiresAt ? parseServerInstant(expiresAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target == null) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);

  const remainingMs = target == null ? 0 : Math.max(0, target - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const label = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const expired = target != null && remainingMs <= 0;

  return { minutes, seconds, remainingMs, label, expired };
}
