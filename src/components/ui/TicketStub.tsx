import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface TicketStubProps {
  /** The house name, top-left of the stub. */
  house?: string;
  /** Seat count → "ADMIT N", top-right. Omitted when not applicable. */
  admit?: number;
  title: string;
  /** Pre-joined seat labels, e.g. "C7, C8". */
  seats: string;
  /** Pre-formatted showtime, e.g. "Thu 2 Jul · 19:30". */
  when?: string;
  /** Reservation id — printed as the stub's serial number. */
  serial: string | number;
  /** Pre-formatted total. */
  price: string;
  /** Action zone below the perforation (countdown + confirm/release). */
  footer?: ReactNode;
  className?: string;
}

/**
 * The signature element: a hold/confirmation rendered as a tear-off ticket stub.
 * Brass marquee header, monospace "printed" data, a punched perforation edge.
 */
export default function TicketStub({
  house = 'The Orpheum',
  admit,
  title,
  seats,
  when,
  serial,
  price,
  footer,
  className,
}: TicketStubProps) {
  return (
    <div
      className={cn(
        'relative w-full max-w-sm rounded-lg border border-ink-line bg-ink-raised shadow-card',
        className,
      )}
    >
      {/* Marquee header */}
      <div className="flex items-center justify-between gap-2 px-6 pb-4 pt-5">
        <span className="inline-flex items-center gap-2 font-display text-base font-semibold tracking-tight text-brass">
          <span aria-hidden>◆</span> {house}
        </span>
        {admit != null && (
          <span className="font-mono text-[0.625rem] uppercase tracking-eyebrow text-paper-faint">
            Admit {admit}
          </span>
        )}
      </div>

      {/* Printed data */}
      <div className="px-6 pb-5">
        <h3 className="font-display text-2xl font-semibold leading-tight text-paper">{title}</h3>
        <dl className="mt-4 space-y-2 font-mono text-sm">
          <Line term="Seats" value={seats} />
          {when && <Line term="When" value={when} />}
          <Line term="Serial" value={`#${serial}`} />
          <Line term="Total" value={price} accent />
        </dl>
      </div>

      {/* Perforation — bg-ink notches straddle the edges to punch the card. */}
      <div className="relative">
        <div className="border-t border-dashed border-ink-line" />
        <span
          aria-hidden
          className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink"
        />
        <span
          aria-hidden
          className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-ink"
        />
      </div>

      {/* Action zone */}
      {footer && <div className="px-6 pb-6 pt-5">{footer}</div>}
    </div>
  );
}

function Line({ term, value, accent }: { term: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-paper-faint">{term}</dt>
      <dd className={accent ? 'text-brass' : 'text-paper'}>{value}</dd>
    </div>
  );
}
