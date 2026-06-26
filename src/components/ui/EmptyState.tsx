import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Page-level empty state — an invitation to act, not a dead end. */
export default function EmptyState({
  title,
  action,
  className,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed border-ink-line bg-ink-raised/50 p-10 text-center',
        className,
      )}
    >
      {title && <p className="font-display text-lg font-semibold text-paper">{title}</p>}
      {children && <p className="mt-2 text-sm text-paper-dim">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
