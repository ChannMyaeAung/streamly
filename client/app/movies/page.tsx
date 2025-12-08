"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getLocalMovies } from "@/lib/local-movies";
import { Movie } from "@/lib/type";

import MovieCard from "../components/MovieCard";

const MoviesPage = () => {
  const [movies, setMovies] = useState<Movie[]>(() => getLocalMovies());
  const [hasRemoteData, setHasRemoteData] = useState(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const deferredSearch = useDeferredValue(searchTerm);

  const filteredMovies = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return movies;
    }

    return movies.filter((movie) => {
      const titleMatch = movie.title.toLowerCase().includes(query);

      return titleMatch;
    });
  }, [movies, deferredSearch]);

  const loadMovies = useCallback(async () => {
    try {
      setIsFetching(true);
      setError(null);
      const data = await api.getMovies();
      setMovies(data);
      setHasRemoteData(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load movies";
      setError(message);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    void loadMovies();
  }, [loadMovies]);

  const hasMovies = movies.length > 0;

  const hasActiveSearch = searchTerm.trim().length > 0;

  return (
    <section className="space-y-6 w-full max-w-6xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2 self-start">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Browse the catalogue
          </p>
          <h2 className="text-2xl font-semibold text-foreground">Movies</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-1 font-medium ${
                hasRemoteData
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-400/15 text-amber-300"
              }`}
            >
              {hasRemoteData ? "Live Render data" : "Instant demo data"}
            </span>
            {isFetching && (
              <span className="text-muted-foreground animate-pulse">
                Fetching live catalogue…
              </span>
            )}
          </div>
        </div>

        <div className="md:w-80">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title..."
            aria-label="Search movies"
          />
        </div>
      </header>

      {error && (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p>
            Couldn’t reach the Render API yet. Still showing the built-in demo
            set so you can browse instantly.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={loadMovies}
              variant="outline"
              size="sm"
              disabled={isFetching}
            >
              Retry live fetch
            </Button>
            <span className="text-xs text-destructive/80">{error}</span>
          </div>
        </div>
      )}

      {!hasMovies && (
        <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No demo movies bundled. Add entries through the admin workflow.
        </div>
      )}

      {hasActiveSearch && filteredMovies.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No movies match “{searchTerm}”. Try a different title or genre.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {hasMovies &&
            filteredMovies.map((movie) => (
              <MovieCard
                key={movie.imdbId}
                movie={movie}
                onDelete={(id) =>
                  setMovies((current) => current.filter((m) => m.imdbId !== id))
                }
              />
            ))}
        </div>
      )}
    </section>
  );
};

export default MoviesPage;
