import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** A brass hairline along the top edge — for emphasised panels. */
  topRule?: boolean;
  /** Hover affordance for clickable cards (e.g. a movie linking to its detail). */
  interactive?: boolean;
  /** Default padding; set false when the card lays out its own sections. */
  padded?: boolean;
}

export default function Card({
  topRule = false,
  interactive = false,
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg border border-ink-line bg-ink-raised shadow-card',
        topRule && 'border-t-2 border-t-brass',
        interactive && 'transition-colors hover:border-brass/50 hover:bg-ink-field',
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
