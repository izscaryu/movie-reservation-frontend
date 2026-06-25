import { useMemo } from 'react';
import type { SeatMapEntry } from '../types/api';

interface SeatGridProps {
  seats: SeatMapEntry[];
  /** Currently selected showtimeSeatIds. */
  selected: Set<number>;
  /** Seat labels that just failed a hold (409) — highlighted so the user sees what was lost. */
  conflictLabels: Set<string>;
  onToggle: (seat: SeatMapEntry) => void;
}

function seatClasses(
  seat: SeatMapEntry,
  isSelected: boolean,
  isConflict: boolean,
): string {
  const base =
    'flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors';
  const ring = isConflict ? ' ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-950' : '';

  if (isSelected) {
    return `${base}${ring} bg-indigo-500 text-white hover:bg-indigo-400`;
  }
  switch (seat.status) {
    case 'AVAILABLE':
      return `${base}${ring} bg-slate-700 text-slate-200 hover:bg-slate-600 cursor-pointer`;
    case 'HELD':
      return `${base}${ring} bg-amber-700/60 text-amber-100/70 cursor-not-allowed`;
    case 'BOOKED':
      return `${base}${ring} bg-rose-900/70 text-rose-200/60 cursor-not-allowed`;
    default:
      return `${base}${ring} bg-slate-800 text-slate-400 cursor-not-allowed`;
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
        <div className="mb-6 rounded bg-slate-800 py-1 text-center text-xs uppercase tracking-widest text-slate-400">
          Screen
        </div>
        <div className="space-y-1.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-1.5">
              <span className="w-5 text-right text-xs text-slate-500">{row.label}</span>
              <div className="flex gap-1.5">
                {row.seats.map((seat) => {
                  const isSelected = selected.has(seat.showtimeSeatId);
                  const isConflict = conflictLabels.has(seat.label);
                  const disabled = seat.status !== 'AVAILABLE' && !isSelected;
                  return (
                    <button
                      key={seat.showtimeSeatId}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggle(seat)}
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
