import { cn } from '../../lib/cn';

/** Pulsing placeholder block. Holds layout while content loads. */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded bg-ink-line/60 motion-reduce:animate-none', className)}
    />
  );
}
