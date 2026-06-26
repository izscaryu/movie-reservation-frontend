import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAdminReservations } from '../../api/admin';
import type { AdminReservationsQuery } from '../../api/admin';
import { formatDateTime, formatPrice } from '../../lib/format';
import type { BadgeTone } from '../../components/ui/Badge';
import type { ReservationStatus } from '../../types/api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Input';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';

const PAGE_SIZE = 20;

const STATUSES: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'];
// Curated to entity columns — the backend 400s on an unknown sort field.
const SORTS = [
  { value: 'createdAt', label: 'Created' },
  { value: 'totalPrice', label: 'Price' },
];

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
      <h2 className="mb-5 font-display text-xl font-semibold text-paper">Reservations</h2>

      <form onSubmit={apply} className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Status" htmlFor="f-status">
          <Select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="From" htmlFor="f-from">
          <Input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To" htmlFor="f-to">
          <Input id="f-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Sort by" htmlFor="f-sort">
          <Select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Order" htmlFor="f-order">
          <Select
            id="f-order"
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'asc' | 'desc')}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </Select>
        </Field>
        <Button type="submit">Apply</Button>
        <Button type="button" variant="secondary" onClick={reset}>
          Reset
        </Button>
      </form>

      {isPending && <p className="text-paper-dim">Loading reservations…</p>}

      {isError && (
        <p className="rounded-md border border-status-expired/40 bg-status-expired/10 px-4 py-3 text-sm text-status-expired">
          Failed to load reservations: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {data && (
        <>
          {data.content.length === 0 ? (
            <p className="text-paper-dim">No reservations match these filters.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>#</TH>
                  <TH>User</TH>
                  <TH>Movie</TH>
                  <TH>Showtime</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                  <TH numeric>Total</TH>
                </tr>
              </THead>
              <TBody>
                {data.content.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-mono tabular-nums text-paper-faint">{r.id}</TD>
                    <TD>
                      <div className="font-medium text-paper">{r.userName}</div>
                      <div className="text-xs text-paper-faint">{r.userEmail}</div>
                    </TD>
                    <TD className="text-paper">{r.movieTitle}</TD>
                    <TD className="whitespace-nowrap">{formatDateTime(r.showtimeStartTime)}</TD>
                    <TD>
                      <Badge tone={r.status.toLowerCase() as BadgeTone}>{r.status}</Badge>
                    </TD>
                    <TD className="whitespace-nowrap">{formatDateTime(r.createdAt)}</TD>
                    <TD numeric>{formatPrice(r.totalPrice)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          {/* Server-driven pagination — never compute totals client-side (landmine #6). */}
          <div className="mt-4 flex items-center justify-between text-sm text-paper-faint">
            <span>
              Page {data.page + 1} of {Math.max(data.totalPages, 1)} · {data.totalElements} reservation
              {data.totalElements === 1 ? '' : 's'}
              {isFetching && ' · updating…'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.first}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.last}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
