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
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import Loading from '../../components/ui/Loading';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';

const POPULAR_SIZE = 10;

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
    <div className="space-y-10">
      {/* Shared date range for the three revenue/popularity reports. Empty = all-time. */}
      <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3">
        <Field label="From" htmlFor="from">
          <Input
            id="from"
            type="date"
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
          />
        </Field>
        <Field label="To" htmlFor="to">
          <Input id="to" type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} />
        </Field>
        <Button type="submit">Apply</Button>
        {ranged && (
          <Button type="button" variant="secondary" onClick={clearRange}>
            All time
          </Button>
        )}
        <span className="ml-auto self-center font-mono text-sm text-paper-faint">
          {ranged ? `${range.from ?? '…'} → ${range.to ?? '…'}` : 'All time'}
        </span>
      </form>

      {/* Revenue summary */}
      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-paper">Revenue</h2>
        <QueryState query={revenue} label="revenue">
          {revenue.data && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Stat label="Total revenue" value={formatPrice(revenue.data.totalRevenue)} />
              <Stat
                label="Confirmed reservations"
                value={String(revenue.data.confirmedReservations)}
              />
            </div>
          )}
        </QueryState>
      </section>

      {/* Revenue by movie (plain array, already sorted desc by the backend) */}
      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-paper">Revenue by movie</h2>
        <QueryState query={byMovie} label="revenue by movie">
          {byMovie.data &&
            (byMovie.data.length === 0 ? (
              <p className="text-paper-dim">No revenue in this range.</p>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Movie</TH>
                    <TH numeric>Revenue</TH>
                  </tr>
                </THead>
                <TBody>
                  {byMovie.data.map((r) => (
                    <TR key={r.movieId}>
                      <TD className="text-paper">{r.movieTitle}</TD>
                      <TD numeric>{formatPrice(r.revenue)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ))}
        </QueryState>
      </section>

      {/* Popular movies (paged — render the server's pagination fields) */}
      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-paper">Popular movies</h2>
        <QueryState query={popular} label="popular movies">
          {popular.data &&
            (popular.data.content.length === 0 ? (
              <p className="text-paper-dim">No tickets sold in this range.</p>
            ) : (
              <>
                <Table>
                  <THead>
                    <tr>
                      <TH>Movie</TH>
                      <TH numeric>Tickets sold</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {popular.data.content.map((r) => (
                      <TR key={r.movieId}>
                        <TD className="text-paper">{r.movieTitle}</TD>
                        <TD numeric>{r.ticketsSold}</TD>
                      </TR>
                    ))}
                  </TBody>
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
      <section className="border-t border-ink-line pt-8">
        <h2 className="mb-4 font-display text-xl font-semibold text-paper">Occupancy lookup</h2>
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
        <Field label="Showtime id" htmlFor="showtimeId">
          <Input
            id="showtimeId"
            type="number"
            min={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </Field>
        <Button type="submit">Look up</Button>
      </form>

      {showtimeId !== null && (
        <div className="mt-5">
          {query.isPending && <Loading>Loading occupancy…</Loading>}
          {query.isError &&
            (notFound ? (
              <p className="text-paper-dim">No showtime with id {showtimeId}.</p>
            ) : (
              <Alert>{query.error instanceof Error ? query.error.message : 'Lookup failed.'}</Alert>
            ))}
          {query.data && (
            <Card>
              <p className="font-display text-lg font-semibold text-paper">{query.data.movieTitle}</p>
              <p className="mt-0.5 font-mono text-sm text-paper-faint">
                {formatDateTime(query.data.startTime)}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <Stat label="Booked" value={String(query.data.bookedSeats)} small />
                <Stat label="Total seats" value={String(query.data.totalSeats)} small />
                <Stat label="Occupancy" value={`${query.data.occupancyRate}%`} small />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ---- small shared presentational bits ----

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-ink-line bg-ink-raised p-4 shadow-card">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-eyebrow text-paper-faint">
        {label}
      </p>
      <p
        className={`mt-1.5 font-mono font-semibold tabular-nums text-paper ${
          small ? 'text-xl' : 'text-3xl'
        }`}
      >
        {value}
      </p>
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
    <div className="mt-4 flex items-center justify-between text-sm text-paper-faint">
      <span>
        Page {page + 1} of {Math.max(totalPages, 1)} · {totalElements} {noun}
        {totalElements === 1 ? '' : 's'}
        {fetching && ' · updating…'}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onPrev} disabled={first}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" onClick={onNext} disabled={last}>
          Next
        </Button>
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
  if (query.isPending) return <Loading>Loading {label}…</Loading>;
  if (query.isError) {
    return (
      <Alert>
        Failed to load {label}: {query.error instanceof Error ? query.error.message : 'unknown error'}
      </Alert>
    );
  }
  return <>{children}</>;
}
