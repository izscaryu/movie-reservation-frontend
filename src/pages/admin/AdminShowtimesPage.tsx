import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAllMovies } from '../../api/movies';
import { createShowtime } from '../../api/admin';
import { ApiError } from '../../lib/http';
import { formatDateTime, formatPrice } from '../../lib/format';
import type { ShowtimeRequest, ShowtimeResponse } from '../../types/api';
import Button from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Input';

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
      <h2 className="mb-5 font-display text-xl font-semibold text-paper">Schedule a showtime</h2>

      {created && (
        <div className="mb-5 rounded-md border border-status-confirmed/40 bg-status-confirmed/10 p-4 text-sm">
          <p className="font-medium text-status-confirmed">Showtime created 🎬</p>
          <p className="mt-1 text-paper-dim">
            {created.movieTitle} · {created.roomName} · {formatDateTime(created.startTime)} →{' '}
            {formatDateTime(created.endTime)} · {formatPrice(created.price)}
          </p>
          <Link
            to={`/movies/${created.movieId}`}
            className="mt-2 inline-block font-medium text-brass hover:text-brass-bright"
          >
            View on the movie page →
          </Link>
        </div>
      )}

      {moviesQuery.isError && (
        <p className="mb-5 rounded-md border border-status-expired/40 bg-status-expired/10 px-4 py-3 text-sm text-status-expired">
          Couldn't load the movie list:{' '}
          {moviesQuery.error instanceof Error ? moviesQuery.error.message : 'unknown'}
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Movie" htmlFor="movie">
          <Select
            id="movie"
            required
            value={movieId}
            onChange={(e) => setMovieId(e.target.value)}
            disabled={moviesQuery.isPending}
          >
            <option value="" disabled>
              {moviesQuery.isPending ? 'Loading movies…' : 'Select a movie…'}
            </option>
            {moviesQuery.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Theater room id"
          htmlFor="room"
          hint="Seeded rooms: 1 (Room 1, 40 seats), 2 (Room 2, 80), 3 (Room 3, 54). An unknown id is rejected by the server."
        >
          <Input
            id="room"
            type="number"
            min={1}
            required
            value={theaterRoomId}
            onChange={(e) => setTheaterRoomId(e.target.value)}
          />
        </Field>

        <Field
          label="Start time"
          htmlFor="start"
          hint="Stored and shown as entered (UTC wall-clock). End time is computed from the movie's duration."
        >
          <Input
            id="start"
            type="datetime-local"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </Field>

        <Field label="Price" htmlFor="price">
          <Input
            id="price"
            type="number"
            min={0}
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-md border border-status-expired/40 bg-status-expired/10 px-3 py-2 text-sm text-status-expired">
            {error}
          </p>
        )}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create showtime'}
        </Button>
      </form>
    </div>
  );
}
