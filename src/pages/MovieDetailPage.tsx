import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMovie, getShowtimes } from '../api/movies';
import { ApiError } from '../lib/http';
import { formatDate, formatDuration, formatPrice, formatTime } from '../lib/format';
import type { ShowtimeResponse } from '../types/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Eyebrow from '../components/ui/Eyebrow';
import { Input } from '../components/ui/Input';

const backLink = 'text-sm font-medium text-brass transition-colors hover:text-brass-bright';

export default function MovieDetailPage() {
  const { movieId } = useParams<{ movieId: string }>();
  const id = Number(movieId);

  const movieQuery = useQuery({
    queryKey: ['movie', id],
    queryFn: () => getMovie(id),
    enabled: Number.isFinite(id),
  });

  // Empty string = "all upcoming" (no date filter) — the better default here
  // because the seed data is sparse and a specific day is usually empty.
  const [date, setDate] = useState('');

  const showtimesQuery = useQuery({
    queryKey: ['showtimes', id, date],
    queryFn: () => getShowtimes(id, date || undefined),
    enabled: Number.isFinite(id),
    placeholderData: keepPreviousData,
  });

  if (!Number.isFinite(id)) {
    return <p className="text-paper-dim">Invalid movie id.</p>;
  }

  if (movieQuery.isPending) {
    return <p className="text-paper-dim">Loading movie…</p>;
  }

  if (movieQuery.isError) {
    const notFound = movieQuery.error instanceof ApiError && movieQuery.error.status === 404;
    return (
      <div>
        <Link to="/" className={backLink}>
          ← Back to movies
        </Link>
        <p className="mt-4 rounded-md border border-status-expired/40 bg-status-expired/10 px-4 py-3 text-sm text-status-expired">
          {notFound
            ? 'That movie does not exist.'
            : `Failed to load movie: ${movieQuery.error instanceof Error ? movieQuery.error.message : 'unknown error'}`}
        </p>
      </div>
    );
  }

  const movie = movieQuery.data;

  return (
    <div>
      <Link to="/" className={backLink}>
        ← Back to movies
      </Link>

      <div className="mt-5 flex flex-col gap-7 sm:flex-row">
        {movie.posterUrl && (
          <img
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            className="h-72 w-48 flex-shrink-0 rounded-lg border border-ink-line object-cover shadow-card"
          />
        )}
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-paper">
            {movie.title}
          </h1>
          <p className="mt-2 font-mono text-sm text-paper-faint">
            {formatDuration(movie.durationMinutes)}
          </p>
          {movie.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {movie.genres.map((g) => (
                <Badge key={g} tone="neutral">
                  {g}
                </Badge>
              ))}
            </div>
          )}
          {movie.description && (
            <p className="mt-4 max-w-2xl leading-relaxed text-paper-dim">{movie.description}</p>
          )}
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-ink-line pb-4">
          <div>
            <Eyebrow>Tickets</Eyebrow>
            <h2 className="mt-2 font-display text-2xl font-semibold text-paper">Showtimes</h2>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
            {date && (
              <Button type="button" variant="secondary" onClick={() => setDate('')}>
                All dates
              </Button>
            )}
          </div>
        </div>

        {showtimesQuery.isPending && <p className="text-paper-dim">Loading showtimes…</p>}

        {showtimesQuery.isError && (
          <p className="rounded-md border border-status-expired/40 bg-status-expired/10 px-4 py-3 text-sm text-status-expired">
            Failed to load showtimes:{' '}
            {showtimesQuery.error instanceof Error ? showtimesQuery.error.message : 'unknown error'}
          </p>
        )}

        {showtimesQuery.data && <ShowtimeList showtimes={showtimesQuery.data} date={date} />}
      </section>
    </div>
  );
}

function ShowtimeList({ showtimes, date }: { showtimes: ShowtimeResponse[]; date: string }) {
  if (showtimes.length === 0) {
    return <p className="text-paper-dim">No showtimes{date ? ` on ${formatDate(date)}` : ''}.</p>;
  }

  // Group by calendar day for a readable list.
  const byDay = new Map<string, ShowtimeResponse[]>();
  for (const st of [...showtimes].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
    const day = st.startTime.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(st);
    byDay.set(day, list);
  }

  return (
    <div className="space-y-8">
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day}>
          <h3 className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-eyebrow text-paper-faint">
            {formatDate(day)}
          </h3>
          <ul className="flex flex-wrap gap-3">
            {list.map((st) => (
              <li key={st.id}>
                <Link to={`/showtimes/${st.id}/seats`} className="block">
                  <Card interactive padded={false} className="px-5 py-3">
                    <span className="block font-mono text-lg font-semibold tabular-nums text-paper">
                      {formatTime(st.startTime)}
                    </span>
                    <span className="text-xs text-paper-faint">{st.roomName}</span>
                    <span className="mt-1 block font-mono text-sm text-brass">
                      {formatPrice(st.price)}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
