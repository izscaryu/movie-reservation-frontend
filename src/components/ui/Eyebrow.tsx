import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Letterspaced brass label with a short rule — the ticket-stub voice. */
export default function Eyebrow({
  rule = true,
  className,
  children,
}: {
  rule?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 text-[0.6875rem] font-semibold uppercase tracking-eyebrow text-brass',
        className,
      )}
    >
      {rule && <span aria-hidden className="h-px w-6 bg-brass/60" />}
      {children}
    </span>
  );
}
