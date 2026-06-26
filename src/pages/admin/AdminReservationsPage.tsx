import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAdminReservations } from '../../api/admin';
import type { AdminReservationsQuery } from '../../api/admin';
import { formatDateTime, formatPrice } from '../../lib/format';
import type { ReservationStatus } from '../../types/api';

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<ReservationStatus, string> = {
  CONFIRMED: 'border-emerald-800 bg-emerald-950/40 text-emerald-200',
  PENDING: 'border-amber-800 bg-amber-950/40 text-amber-200',
  CANCELLED: 'border-slate-700 bg-slate-800/60 text-slate-400',
  EXPIRED: 'border-rose-900 bg-rose-950/40 text-rose-300',
};

const STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'];
// Curated to entity columns — the backend 400s on an unknown sort field.
const SORTS = [
  { value: 'createdAt', label: 'Created' },
  { value: 'totalPrice', label: 'Price' },
];

const selectClass =
  'rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500';

type Filters = Required<Pick<AdminReservationsQuery, 'sort' | 'direction'>> &
  Pick<AdminReservationsQuery, 'status' | 'from' | 'to'>;

const DEFAULT_FILTERS: Filters = { sort: 'createdAt', direction: 'desc' };

export default function AdminReservationsPage() {
  // Draft (form) state vs. applied state, so the query fires only on Apply.
  const [status, setStatus] = useState<string>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);

  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['admin-reservations', applied, page],
    queryFn: () => getAdminReservations({ ...applied, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setApplied({
      status: (status || undefined) as ReservationStatus | undefined,
      from: from || undefined,
      to: to || undefined,
      sort,
      direction,
    });
  }
  function reset() {
    setStatus('');
    setFrom('');
    setTo('');
    setSort('createdAt');
    setDirection('desc');
    setPage(0);
    setApplied(DEFAULT_FILTERS);
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Reservations</h2>

      <form onSubmit={apply} className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="From">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} />
        </Field>
        <Field label="To">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} />
        </Field>
        <Field label="Sort by">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Order">
          <select value={direction} onChange={(e) => setDirection(e.target.value as 'asc' | 'desc')} className={selectClass}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </Field>
        <button type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500">
          Apply
        </button>
        <button type="button" onClick={reset} className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
          Reset
        </button>
      </form>

      {isPending && <p className="text-slate-400">Loading reservations…</p>}

      {isError && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">
          Failed to load reservations: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {data && (
        <>
          {data.content.length === 0 ? (
            <p className="text-slate-400">No reservations match these filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/70 text-left text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Movie</th>
                    <th className="px-3 py-2 font-medium">Showtime</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((r) => (
                    <tr key={r.id} className="border-t border-slate-800">
                      <td className="px-3 py-2 tabular-nums text-slate-400">{r.id}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.userName}</div>
                        <div className="text-xs text-slate-400">{r.userEmail}</div>
                      </td>
                      <td className="px-3 py-2">{r.movieTitle}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(r.showtimeStartTime)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-400">{formatDateTime(r.createdAt)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatPrice(r.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Server-driven pagination — never compute totals client-side (landmine #6). */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {data.page + 1} of {Math.max(data.totalPages, 1)} · {data.totalElements} reservation
              {data.totalElements === 1 ? '' : 's'}
              {isFetching && ' · updating…'}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={data.first} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-800">
                Previous
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={data.last} className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-800">
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">{label}</label>
      {children}
    </div>
  );
}
