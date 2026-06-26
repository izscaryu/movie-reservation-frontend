import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMovie } from '../../api/movies';
import { createMovie, updateMovie } from '../../api/admin';
import { ApiError } from '../../lib/http';
import type { MovieRequest } from '../../types/api';
import { cn } from '../../lib/cn';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Loading from '../../components/ui/Loading';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { buttonClasses } from '../../components/ui/buttonClasses';

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
    mutationFn: (body: MovieRequest) => (editing ? updateMovie(id, body) : createMovie(body)),
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
    return <Loading>Loading movie…</Loading>;
  }
  if (editing && movieQuery.isError) {
    const notFound = movieQuery.error instanceof ApiError && movieQuery.error.status === 404;
    return (
      <Card className="border-status-expired/40">
        <h2 className="font-display text-lg font-semibold text-status-expired">
          {notFound ? 'Movie not found' : 'Could not load the movie'}
        </h2>
        <p className="mt-2 text-sm text-paper-dim">
          {notFound
            ? 'It may have been deleted.'
            : movieQuery.error instanceof Error
              ? movieQuery.error.message
              : 'Unknown error.'}
        </p>
        <Link to="/admin/movies" className={cn('mt-5 inline-flex', buttonClasses())}>
          Back to movies
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-5 font-display text-xl font-semibold text-paper">
        {editing ? 'Edit movie' : 'New movie'}
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Duration (minutes)" htmlFor="duration">
          <Input
            id="duration"
            type="number"
            min={1}
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </Field>
        <Field label="Genres" htmlFor="genres" hint="Comma-separated">
          <Input
            id="genres"
            type="text"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="Action, Drama"
          />
        </Field>
        <Field label="Poster URL" htmlFor="posterUrl" hint="Optional">
          <Input
            id="posterUrl"
            type="url"
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="description" hint="Optional">
          <Textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        {error && <Alert>{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create movie'}
          </Button>
          <Link to="/admin/movies" className={buttonClasses({ variant: 'secondary' })}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
