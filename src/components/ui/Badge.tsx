import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'expired'
  | 'neutral'
  | 'brass';

const TONES: Record<BadgeTone, string> = {
  confirmed: 'border-status-confirmed/40 bg-status-confirmed/15 text-status-confirmed',
  pending: 'border-status-pending/40 bg-status-pending/15 text-status-pending',
  cancelled: 'border-status-cancelled/40 bg-status-cancelled/15 text-status-cancelled',
  expired: 'border-status-expired/40 bg-status-expired/15 text-status-expired',
  neutral: 'border-ink-line bg-ink-raised text-paper-dim',
  brass: 'border-brass/40 bg-brass/15 text-brass',
};

export default function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
