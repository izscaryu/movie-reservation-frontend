import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMovies } from '../../api/movies';
import { deleteMovie } from '../../api/admin';
import { ApiError } from '../../lib/http';
import { formatDuration } from '../../lib/format';
import type { MovieResponse } from '../../types/api';
import { cn } from '../../lib/cn';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { buttonClasses } from '../../components/ui/buttonClasses';

// The list reuses the public paged GET /api/movies (which already excludes
// soft-deleted movies). Page size kept modest — the backend caps size (>100 → 400).
const PAGE_SIZE = 12;

export default function AdminMoviesPage() {
  const [page, setPage] = useState(0);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['admin-movies', { page, size: PAGE_SIZE }],
    queryFn: () => getMovies({ page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMovie(id),
    onSuccess: () => {
      setConfirmId(null);
      setActionError(null);
      // Refresh both the admin list and the public browse list.
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
    onError: (err) => {
      setConfirmId(null);
      setActionError(err instanceof ApiError ? err.message : 'Could not delete the movie.');
    },
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-paper">Movies</h2>
        <Link to="/admin/movies/new" className={buttonClasses()}>
          + New movie
        </Link>
      </div>

      {actionError && (
        <p className="mb-4 rounded-md border border-status-expired/40 bg-status-expired/10 px-4 py-3 text-sm text-status-expired">
          {actionError}
        </p>
      )}

      {isPending && <p className="text-paper-dim">Loading movies…</p>}

      {isError && (
        <p className="rounded-md border border-status-expired/40 bg-status-expired/10 px-4 py-3 text-sm text-status-expired">
          Failed to load movies: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {data && (
        <>
          {data.content.length === 0 ? (
            <p className="text-paper-dim">No movies yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-2.5">
              {data.content.map((m) => (
                <MovieRow
                  key={m.id}
                  movie={m}
                  confirming={confirmId === m.id}
                  busy={deleteMutation.isPending && deleteMutation.variables === m.id}
                  onAskDelete={() => {
                    setActionError(null);
                    setConfirmId(m.id);
                  }}
                  onConfirmDelete={() => deleteMutation.mutate(m.id)}
                  onDismiss={() => setConfirmId(null)}
                />
              ))}
            </ul>
          )}

          {/* Server-driven pagination — never compute totals client-side (landmine #6). */}
          <div className="mt-6 flex items-center justify-between text-sm text-paper-faint">
            <span>
              Page {data.page + 1} of {Math.max(data.totalPages, 1)} · {data.totalElements} movie
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

interface RowProps {
  movie: MovieResponse;
  confirming: boolean;
  busy: boolean;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onDismiss: () => void;
}

function MovieRow({ movie: m, confirming, busy, onAskDelete, onConfirmDelete, onDismiss }: RowProps) {
  return (
    <li>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-paper">{m.title}</p>
          <p className="mt-0.5 font-mono text-sm text-paper-faint">
            {formatDuration(m.durationMinutes)}
            {m.genres.length > 0 && ` · ${m.genres.join(', ')}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {confirming ? (
            <>
              <span className="text-sm text-paper-dim">Delete this movie?</span>
              <Button variant="danger" size="sm" onClick={onConfirmDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Yes, delete'}
              </Button>
              <Button variant="secondary" size="sm" onClick={onDismiss} disabled={busy}>
                Keep
              </Button>
            </>
          ) : (
            <>
              <Link
                to={`/admin/movies/${m.id}/edit`}
                className={cn(buttonClasses({ variant: 'secondary', size: 'sm' }))}
              >
                Edit
              </Link>
              <Button variant="secondary" size="sm" onClick={onAskDelete}>
                Delete
              </Button>
            </>
          )}
        </div>
      </Card>
    </li>
  );
}
