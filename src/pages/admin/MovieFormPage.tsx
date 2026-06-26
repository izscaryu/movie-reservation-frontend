import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMovie } from '../../api/movies';
import { createMovie, updateMovie } from '../../api/admin';
import { ApiError } from '../../lib/http';
import type { MovieRequest } from '../../types/api';

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 outline-none focus:border-slate-500';
const labelClass = 'mb-1 block text-sm text-slate-300';

/** Shared create/edit form. Edit mode prefills from GET /api/movies/{id}. */
export default function MovieFormPage() {
  const { movieId } = useParams<{ movieId: string }>();
  const editing = Boolean(movieId);
  const id = Number(movieId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [genres, setGenres] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Prefill once when editing. The query won't refetch mid-edit (30s staleTime, no
  // focus refetch), but guard anyway so a refetch never clobbers in-progress edits.
  const prefilled = useRef(false);
  const movieQuery = useQuery({
    queryKey: ['movie', id],
    queryFn: () => getMovie(id),
    enabled: editing,
  });

  useEffect(() => {
    if (movieQuery.data && !prefilled.current) {
      const m = movieQuery.data;
      setTitle(m.title);
      setDuration(String(m.durationMinutes));
      setDescription(m.description ?? '');
      setPosterUrl(m.posterUrl ?? '');
      setGenres(m.genres.join(', '));
      prefilled.current = true;
    }
  }, [movieQuery.data]);

  const mutation = useMutation({
    mutationFn: (body: MovieRequest) =>
      editing ? updateMovie(id, body) : createMovie(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      if (editing) queryClient.invalidateQueries({ queryKey: ['movie', id] });
      navigate('/admin/movies');
    },
    onError: (err) => {
      // 400 carries the field-prefixed validation message in the uniform body.
      setError(err instanceof ApiError ? err.message : 'Could not save the movie.');
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate({
      title: title.trim(),
      durationMinutes: Number(duration),
      description: description.trim() || null,
      posterUrl: posterUrl.trim() || null,
      genres: genres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
    });
  }

  if (editing && movieQuery.isPending) {
    return <p className="text-slate-400">Loading movie…</p>;
  }
  if (editing && movieQuery.isError) {
    const notFound = movieQuery.error instanceof ApiError && movieQuery.error.status === 404;
    return (
      <div className="rounded-lg border border-rose-900 bg-rose-950/30 p-6">
        <h2 className="text-lg font-semibold text-rose-200">
          {notFound ? 'Movie not found' : 'Could not load the movie'}
        </h2>
        <p className="mt-2 text-sm text-rose-200/80">
          {notFound
            ? 'It may have been deleted.'
            : movieQuery.error instanceof Error
              ? movieQuery.error.message
              : 'Unknown error.'}
        </p>
        <Link
          to="/admin/movies"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Back to movies
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="text-lg font-semibold">{editing ? 'Edit movie' : 'New movie'}</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="duration" className={labelClass}>
            Duration (minutes)
          </label>
          <input
            id="duration"
            type="number"
            min={1}
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="genres" className={labelClass}>
            Genres <span className="text-slate-500">(comma-separated)</span>
          </label>
          <input
            id="genres"
            type="text"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="Action, Drama"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="posterUrl" className={labelClass}>
            Poster URL <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="posterUrl"
            type="url"
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="description" className={labelClass}>
            Description <span className="text-slate-500">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-md border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create movie'}
          </button>
          <Link
            to="/admin/movies"
            className="rounded-md border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
