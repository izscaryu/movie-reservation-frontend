import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMovies } from '../api/movies';

const PAGE_SIZE = 12;

export default function MoviesPage() {
  const [page, setPage] = useState(0);
  const [genreInput, setGenreInput] = useState('');
  const [genre, setGenre] = useState('');

  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ['movies', { genre, page, size: PAGE_SIZE }],
    queryFn: () => getMovies({ genre: genre || undefined, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  function applyGenre(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setGenre(genreInput.trim());
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Movies</h1>
        <form onSubmit={applyGenre} className="flex items-center gap-2">
          <input
            value={genreInput}
            onChange={(e) => setGenreInput(e.target.value)}
            placeholder="Filter by genre…"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium hover:bg-indigo-500"
          >
            Filter
          </button>
          {genre && (
            <button
              type="button"
              onClick={() => {
                setGenre('');
                setGenreInput('');
                setPage(0);
              }}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {isPending && <p className="text-slate-400">Loading movies…</p>}

      {isError && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">
          Failed to load movies: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {data && (
        <>
          {data.content.length === 0 ? (
            <p className="text-slate-400">No movies found{genre ? ` for genre "${genre}"` : ''}.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.content.map((movie) => (
                <li
                  key={movie.id}
                  className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/50 p-4"
                >
                  <h2 className="text-lg font-semibold">{movie.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">{movie.durationMinutes} min</p>
                  {movie.genres.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {movie.genres.map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  {movie.description && (
                    <p className="mt-3 line-clamp-3 text-sm text-slate-400">{movie.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Server-driven pagination — never compute totals client-side (landmine #6). */}
          <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
            <span>
              Page {data.page + 1} of {data.totalPages} · {data.totalElements} movies
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
