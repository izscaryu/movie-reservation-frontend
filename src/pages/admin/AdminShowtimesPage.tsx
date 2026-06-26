import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAllMovies } from '../../api/movies';
import { createShowtime } from '../../api/admin';
import { ApiError } from '../../lib/http';
import { formatDateTime, formatPrice } from '../../lib/format';
import type { ShowtimeRequest, ShowtimeResponse } from '../../types/api';

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-slate-500';
const labelClass = 'mb-1 block text-sm text-slate-300';

export default function AdminShowtimesPage() {
  const [movieId, setMovieId] = useState('');
  const [theaterRoomId, setTheaterRoomId] = useState('1');
  const [startTime, setStartTime] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ShowtimeResponse | null>(null);

  const moviesQuery = useQuery({ queryKey: ['all-movies'], queryFn: getAllMovies });

  const mutation = useMutation({
    mutationFn: (body: ShowtimeRequest) => createShowtime(body),
    onSuccess: (showtime) => {
      setCreated(showtime);
      setError(null);
      // Keep movie/room/price for quick repeat scheduling; clear just the time.
      setStartTime('');
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not create the showtime.'),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    mutation.mutate({
      movieId: Number(movieId),
      theaterRoomId: Number(theaterRoomId),
      // Sent exactly as the datetime-local input gives it ("YYYY-MM-DDTHH:mm"),
      // treated as UTC wall-clock — NO offset conversion (see ShowtimeRequest).
      startTime,
      price: Number(price),
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-lg font-semibold">Schedule a showtime</h2>

      {created && (
        <div className="mt-4 rounded-md border border-emerald-900 bg-emerald-950/30 p-4 text-sm">
          <p className="font-medium text-emerald-200">Showtime created 🎬</p>
          <p className="mt-1 text-emerald-200/80">
            {created.movieTitle} · {created.roomName} · {formatDateTime(created.startTime)} →{' '}
            {formatDateTime(created.endTime)} · {formatPrice(created.price)}
          </p>
          <Link to={`/movies/${created.movieId}`} className="mt-2 inline-block text-indigo-400 hover:underline">
            View on the movie page →
          </Link>
        </div>
      )}

      {moviesQuery.isError && (
        <p className="mt-4 rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          Couldn't load the movie list: {moviesQuery.error instanceof Error ? moviesQuery.error.message : 'unknown'}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="movie" className={labelClass}>
            Movie
          </label>
          <select
            id="movie"
            required
            value={movieId}
            onChange={(e) => setMovieId(e.target.value)}
            disabled={moviesQuery.isPending}
            className={inputClass}
          >
            <option value="" disabled>
              {moviesQuery.isPending ? 'Loading movies…' : 'Select a movie…'}
            </option>
            {moviesQuery.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="room" className={labelClass}>
            Theater room id
          </label>
          <input
            id="room"
            type="number"
            min={1}
            required
            value={theaterRoomId}
            onChange={(e) => setTheaterRoomId(e.target.value)}
            className={inputClass}
          />
          {/* No GET /rooms endpoint yet — valid ids are out-of-band. Seeded rooms: */}
          <p className="mt-1 text-xs text-slate-500">
            Seeded rooms: 1 (Room 1, 40 seats), 2 (Room 2, 80), 3 (Room 3, 54). An unknown id is
            rejected by the server.
          </p>
        </div>

        <div>
          <label htmlFor="start" className={labelClass}>
            Start time
          </label>
          <input
            id="start"
            type="datetime-local"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Stored and shown as entered (UTC wall-clock). End time is computed from the movie's
            duration.
          </p>
        </div>

        <div>
          <label htmlFor="price" className={labelClass}>
            Price
          </label>
          <input
            id="price"
            type="number"
            min={0}
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-md border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {mutation.isPending ? 'Creating…' : 'Create showtime'}
        </button>
      </form>
    </div>
  );
}
