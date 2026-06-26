import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMovies } from '../../api/movies';
import { deleteMovie } from '../../api/admin';
import { ApiError } from '../../lib/http';
import { formatDuration } from '../../lib/format';
import type { MovieResponse } from '../../types/api';

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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Movies</h2>
        <Link
          to="/admin/movies/new"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          + New movie
        </Link>
      </div>

      {actionError && (
        <p className="mb-4 rounded-md border border-rose-800 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
          {actionError}
        </p>
      )}

      {isPending && <p className="text-slate-400">Loading movies…</p>}

      {isError && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">
          Failed to load movies: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {data && (
        <>
          {data.content.length === 0 ? (
            <p className="text-slate-400">No movies yet. Create one to get started.</p>
          ) : (
            <ul className="space-y-2">
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
          <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {data.page + 1} of {Math.max(data.totalPages, 1)} · {data.totalElements} movie
              {data.totalElements === 1 ? '' : 's'}
              {isFetching && ' · updating…'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.first}
                className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={data.last}
                className="rounded-md border border-slate-700 px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-800"
              >
                Next
              </button>
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
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="min-w-0">
        <p className="font-semibold">{m.title}</p>
        <p className="mt-0.5 text-sm text-slate-400">
          {formatDuration(m.durationMinutes)}
          {m.genres.length > 0 && ` · ${m.genres.join(', ')}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {confirming ? (
          <>
            <span className="text-sm text-slate-400">Delete this movie?</span>
            <button
              onClick={onConfirmDelete}
              disabled={busy}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium hover:bg-rose-500 disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button
              onClick={onDismiss}
              disabled={busy}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Keep
            </button>
          </>
        ) : (
          <>
            <Link
              to={`/admin/movies/${m.id}/edit`}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Edit
            </Link>
            <button
              onClick={onAskDelete}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-rose-700 hover:bg-rose-950/40 hover:text-rose-200"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
