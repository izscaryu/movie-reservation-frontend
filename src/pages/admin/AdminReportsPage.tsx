import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getOccupancy,
  getPopularMovies,
  getRevenueByMovie,
  getRevenueReport,
} from '../../api/admin';
import { ApiError } from '../../lib/http';
import { formatDateTime, formatPrice } from '../../lib/format';

const POPULAR_SIZE = 10;
const inputClass =
  'rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500';

interface Range {
  from?: string;
  to?: string;
}

export default function AdminReportsPage() {
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [range, setRange] = useState<Range>({});
  const [popPage, setPopPage] = useState(0);

  const revenue = useQuery({
    queryKey: ['report-revenue', range],
    queryFn: () => getRevenueReport(range),
  });
  const byMovie = useQuery({
    queryKey: ['report-by-movie', range],
    queryFn: () => getRevenueByMovie(range),
  });
  const popular = useQuery({
    queryKey: ['report-popular', range, popPage],
    queryFn: () => getPopularMovies({ ...range, page: popPage, size: POPULAR_SIZE }),
    placeholderData: keepPreviousData,
  });

  function applyRange(e: React.FormEvent) {
    e.preventDefault();
    setPopPage(0);
    setRange({ from: fromInput || undefined, to: toInput || undefined });
  }
  function clearRange() {
    setFromInput('');
    setToInput('');
    setPopPage(0);
    setRange({});
  }
  const ranged = Boolean(range.from || range.to);

  return (
    <div className="space-y-8">
      {/* Shared date range for the three revenue/popularity reports. Empty = all-time. */}
      <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="from" className="mb-1 block text-sm text-slate-300">
            From
          </label>
          <input id="from" type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-sm text-slate-300">
            To
          </label>
          <input id="to" type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} className={inputClass} />
        </div>
        <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500">
          Apply
        </button>
        {ranged && (
          <button type="button" onClick={clearRange} className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            All time
          </button>
        )}
        <span className="ml-auto self-center text-sm text-slate-400">
          {ranged ? `${range.from ?? '…'} → ${range.to ?? '…'}` : 'All time'}
        </span>
      </form>

      {/* Revenue summary */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Revenue</h2>
        <QueryState query={revenue} label="revenue">
          {revenue.data && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Stat label="Total revenue" value={formatPrice(revenue.data.totalRevenue)} />
              <Stat label="Confirmed reservations" value={String(revenue.data.confirmedReservations)} />
            </div>
          )}
        </QueryState>
      </section>

      {/* Revenue by movie (plain array, already sorted desc by the backend) */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Revenue by movie</h2>
        <QueryState query={byMovie} label="revenue by movie">
          {byMovie.data &&
            (byMovie.data.length === 0 ? (
              <p className="text-slate-400">No revenue in this range.</p>
            ) : (
              <Table head={['Movie', 'Revenue']}>
                {byMovie.data.map((r) => (
                  <tr key={r.movieId} className="border-t border-slate-800">
                    <td className="px-3 py-2">{r.movieTitle}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatPrice(r.revenue)}</td>
                  </tr>
                ))}
              </Table>
            ))}
        </QueryState>
      </section>

      {/* Popular movies (paged — render the server's pagination fields) */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Popular movies</h2>
        <QueryState query={popular} label="popular movies">
          {popular.data &&
            (popular.data.content.length === 0 ? (
              <p className="text-slate-400">No tickets sold in this range.</p>
            ) : (
              <>
                <Table head={['Movie', 'Tickets sold']}>
                  {popular.data.content.map((r) => (
                    <tr key={r.movieId} className="border-t border-slate-800">
                      <td className="px-3 py-2">{r.movieTitle}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.ticketsSold}</td>
                    </tr>
                  ))}
                </Table>
                <Pager
                  page={popular.data.page}
                  totalPages={popular.data.totalPages}
                  totalElements={popular.data.totalElements}
                  first={popular.data.first}
                  last={popular.data.last}
                  fetching={popular.isFetching}
                  noun="movie"
                  onPrev={() => setPopPage((p) => Math.max(0, p - 1))}
                  onNext={() => setPopPage((p) => p + 1)}
                />
              </>
            ))}
        </QueryState>
      </section>

      {/* Occupancy — independent of the date range; keyed on a showtime id */}
      <section className="border-t border-slate-800 pt-6">
        <h2 className="mb-3 text-lg font-semibold">Occupancy lookup</h2>
        <OccupancyLookup />
      </section>
    </div>
  );
}

function OccupancyLookup() {
  const [input, setInput] = useState('');
  const [showtimeId, setShowtimeId] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ['report-occupancy', showtimeId],
    queryFn: () => getOccupancy(showtimeId as number),
    enabled: showtimeId !== null,
  });

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(input);
    setShowtimeId(input && Number.isFinite(n) ? n : null);
  }

  const notFound = query.error instanceof ApiError && query.error.status === 404;

  return (
    <div>
      <form onSubmit={lookup} className="flex items-end gap-3">
        <div>
          <label htmlFor="showtimeId" className="mb-1 block text-sm text-slate-300">
            Showtime id
          </label>
          <input id="showtimeId" type="number" min={1} value={input} onChange={(e) => setInput(e.target.value)} className={inputClass} />
        </div>
        <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500">
          Look up
        </button>
      </form>

      {showtimeId !== null && (
        <div className="mt-4">
          {query.isPending && <p className="text-slate-400">Loading occupancy…</p>}
          {query.isError &&
            (notFound ? (
              <p className="text-slate-400">No showtime with id {showtimeId}.</p>
            ) : (
              <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">
                {query.error instanceof Error ? query.error.message : 'Lookup failed.'}
              </p>
            ))}
          {query.data && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="font-semibold">{query.data.movieTitle}</p>
              <p className="mt-0.5 text-sm text-slate-400">{formatDateTime(query.data.startTime)}</p>
              <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                <Stat label="Booked" value={String(query.data.bookedSeats)} small />
                <Stat label="Total seats" value={String(query.data.totalSeats)} small />
                <Stat label="Occupancy" value={`${query.data.occupancyRate}%`} small />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- small shared presentational bits ----

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-bold tabular-nums ${small ? 'text-xl' : 'text-3xl'}`}>{value}</p>
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/70 text-left text-slate-400">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-medium ${i > 0 ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Pager({
  page,
  totalPages,
  totalElements,
  first,
  last,
  fetching,
  noun,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  fetching: boolean;
  noun: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
      <span>
        Page {page + 1} of {Math.max(totalPages, 1)} · {totalElements} {noun}
        {totalElements === 1 ? '' : 's'}
        {fetching && ' · updating…'}
      </span>
      <div className="flex gap-2">
        <button onClick={onPrev} disabled={first} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-800">
          Previous
        </button>
        <button onClick={onNext} disabled={last} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-800">
          Next
        </button>
      </div>
    </div>
  );
}

// Shared loading/error wrapper for a query section.
function QueryState({
  query,
  label,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown };
  label: string;
  children: React.ReactNode;
}) {
  if (query.isPending) return <p className="text-slate-400">Loading {label}…</p>;
  if (query.isError) {
    return (
      <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">
        Failed to load {label}: {query.error instanceof Error ? query.error.message : 'unknown error'}
      </p>
    );
  }
  return <>{children}</>;
}
