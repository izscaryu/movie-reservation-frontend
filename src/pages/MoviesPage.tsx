import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getMovies } from '../api/movies';
import { formatDuration } from '../lib/format';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import PageHeader from '../components/ui/PageHeader';

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
      <PageHeader
        eyebrow="The Orpheum"
        title="Now showing"
        actions={
          <form onSubmit={applyGenre} className="flex items-center gap-2">
            <Input
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              placeholder="Filter by genre…"
              className="w-44"
            />
            <Button type="submit">Filter</Button>
            {genre && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setGenre('');
                  setGenreInput('');
                  setPage(0);
                }}
              >
                Clear
              </Button>
            )}
          </form>
        }
      />

      {isPending && <p className="text-paper-dim">Loading movies…</p>}

      {isError && (
        <p className="rounded-md border border-status-expired/40 bg-status-expired/10 px-4 py-3 text-sm text-status-expired">
          Failed to load movies: {error instanceof Error ? error.message : 'unknown error'}
        </p>
      )}

      {data && (
        <>
          {data.content.length === 0 ? (
            <p className="text-paper-dim">No movies found{genre ? ` for genre “${genre}”` : ''}.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.content.map((movie) => (
                <li key={movie.id}>
                  <Link to={`/movies/${movie.id}`} className="block h-full">
                    <Card interactive className="flex h-full flex-col">
                      <h2 className="font-display text-xl font-semibold leading-snug text-paper">
                        {movie.title}
                      </h2>
                      <p className="mt-1 font-mono text-sm text-paper-faint">
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
                        <p className="mt-3 line-clamp-3 text-sm text-paper-dim">
                          {movie.description}
                        </p>
                      )}
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Server-driven pagination — never compute totals client-side (landmine #6). */}
          <div className="mt-8 flex items-center justify-between text-sm text-paper-faint">
            <span>
              Page {data.page + 1} of {data.totalPages} · {data.totalElements} movies
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
