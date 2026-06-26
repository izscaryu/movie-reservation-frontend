import { cn } from '../../lib/cn';

/** Brass-tipped ring. Stops spinning under prefers-reduced-motion. */
export default function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink-line border-t-brass motion-reduce:animate-none',
        className,
      )}
    />
  );
}
