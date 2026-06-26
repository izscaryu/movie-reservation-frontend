import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import Spinner from './Spinner';

/** Spinner + label, for inline query loading where a skeleton is overkill. */
export default function Loading({
  className,
  children = 'Loading…',
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('flex items-center gap-2.5 text-sm text-paper-dim', className)}>
      <Spinner />
      {children}
    </div>
  );
}
