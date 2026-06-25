import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMovie, getShowtimes } from '../api/movies';
import { ApiError } from '../lib/http';
import { formatDate, formatDuration, formatPrice, formatTime } from '../lib/format';
import type { ShowtimeResponse } from '../types/api';

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
    return <p className="text-slate-400">Invalid movie id.</p>;
  }

  if (movieQuery.isPending) {
    return <p className="text-slate-400">Loading movie…</p>;
  }

  if (movieQuery.isError) {
    const notFound = movieQuery.error instanceof ApiError && movieQuery.error.status === 404;
    return (
      <div>
        <Link to="/" className="text-sm text-indigo-400 hover:underline">
          ← Back to movies
        </Link>
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">
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
      <Link to="/" className="text-sm text-indigo-400 hover:underline">
        ← Back to movies
      </Link>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        {movie.posterUrl && (
          <img
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            className="h-72 w-48 flex-shrink-0 rounded-lg object-cover"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">{movie.title}</h1>
          <p className="mt-2 text-slate-400">{formatDuration(movie.durationMinutes)}</p>
          {movie.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {movie.genres.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
          {movie.description && (
            <p className="mt-4 max-w-2xl text-slate-300">{movie.description}</p>
          )}
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Showtimes</h2>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
            />
            {date && (
              <button
                type="button"
                onClick={() => setDate('')}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
              >
                All dates
              </button>
            )}
          </div>
        </div>

        {showtimesQuery.isPending && <p className="text-slate-400">Loading showtimes…</p>}

        {showtimesQuery.isError && (
          <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">
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
    return (
      <p className="text-slate-400">
        No showtimes{date ? ` on ${formatDate(date)}` : ''}.
      </p>
    );
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
    <div className="space-y-6">
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day}>
          <h3 className="mb-2 text-sm font-medium text-slate-400">{formatDate(day)}</h3>
          <ul className="flex flex-wrap gap-3">
            {list.map((st) => (
              <li key={st.id}>
                <Link
                  to={`/showtimes/${st.id}/seats`}
                  className="flex flex-col rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 transition-colors hover:border-indigo-500 hover:bg-slate-900"
                >
                  <span className="text-lg font-semibold">{formatTime(st.startTime)}</span>
                  <span className="text-xs text-slate-400">{st.roomName}</span>
                  <span className="mt-1 text-sm text-slate-300">{formatPrice(st.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
