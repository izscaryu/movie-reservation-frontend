import { useMemo } from 'react';
import type { SeatMapEntry } from '../types/api';
import { HELD_HATCH } from './seatStyles';

interface SeatGridProps {
  seats: SeatMapEntry[];
  /** Currently selected showtimeSeatIds. */
  selected: Set<number>;
  /** Seat labels that just failed a hold (409) — highlighted so the user sees what was lost. */
  conflictLabels: Set<string>;
  onToggle: (seat: SeatMapEntry) => void;
}

function seatClasses(seat: SeatMapEntry, isSelected: boolean, isConflict: boolean): string {
  const base =
    'flex h-8 w-8 items-center justify-center rounded font-mono text-xs font-medium transition-colors';
  // The just-lost ring must punch — vermilion, offset against the page.
  const ring = isConflict ? ' ring-2 ring-alert ring-offset-2 ring-offset-ink' : '';

  if (isSelected) {
    return `${base}${ring} bg-brass text-ink hover:bg-brass-bright`;
  }
  switch (seat.status) {
    case 'AVAILABLE':
      return `${base}${ring} cursor-pointer bg-seat-open text-paper-dim hover:bg-seat-open-hover`;
    case 'HELD':
      return `${base}${ring} cursor-not-allowed bg-seat-held text-seat-held-text`;
    case 'BOOKED':
      return `${base}${ring} cursor-not-allowed bg-seat-booked text-seat-booked-text`;
    default:
      return `${base}${ring} cursor-not-allowed bg-ink-raised text-paper-faint`;
  }
}

export default function SeatGrid({ seats, selected, conflictLabels, onToggle }: SeatGridProps) {
  // Group into rows, rows sorted by label, seats by number.
  const rows = useMemo(() => {
    const byRow = new Map<string, SeatMapEntry[]>();
    for (const s of seats) {
      const list = byRow.get(s.rowLabel) ?? [];
      list.push(s);
      byRow.set(s.rowLabel, list);
    }
    return [...byRow.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, list]) => ({
        label,
        seats: list.sort((a, b) => a.seatNumber - b.seatNumber),
      }));
  }, [seats]);

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto w-fit">
        {/* The screen — a warm light spill rather than a grey pill. */}
        <div className="mb-8 text-center">
          <div className="mx-auto h-1 w-3/4 rounded-full bg-gradient-to-r from-transparent via-brass/60 to-transparent" />
          <p className="mt-2 text-[0.625rem] uppercase tracking-eyebrow text-paper-faint">Screen</p>
        </div>
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-1.5">
              <span className="w-5 text-right font-mono text-xs text-paper-faint">{row.label}</span>
              <div className="flex gap-1.5">
                {row.seats.map((seat) => {
                  const isSelected = selected.has(seat.showtimeSeatId);
                  const isConflict = conflictLabels.has(seat.label);
                  const disabled = seat.status !== 'AVAILABLE' && !isSelected;
                  const hatched = seat.status === 'HELD' && !isSelected;
                  return (
                    <button
                      key={seat.showtimeSeatId}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(seat)}
                      style={hatched ? HELD_HATCH : undefined}
                      className={seatClasses(seat, isSelected, isConflict)}
                      title={`${seat.label} · ${seat.status}`}
                      aria-pressed={isSelected}
                      aria-label={`Seat ${seat.label}, ${seat.status}`}
                    >
                      {seat.seatNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
