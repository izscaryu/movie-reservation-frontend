import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type AlertTone = 'error' | 'success' | 'warning' | 'info';

const TONES: Record<AlertTone, string> = {
  error: 'border-status-expired/40 bg-status-expired/10 text-status-expired',
  success: 'border-status-confirmed/40 bg-status-confirmed/10 text-status-confirmed',
  warning: 'border-status-pending/40 bg-status-pending/10 text-status-pending',
  info: 'border-ink-line bg-ink-raised text-paper-dim',
};

/** Inline status banner — the one place error/success/warning messaging lives. */
export default function Alert({
  tone = 'error',
  className,
  children,
}: {
  tone?: AlertTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('rounded-md border px-4 py-3 text-sm', TONES[tone], className)}
    >
      {children}
    </div>
  );
}
