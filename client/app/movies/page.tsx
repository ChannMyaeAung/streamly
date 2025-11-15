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
import { Movie } from "@/lib/type";

import MovieCard from "../components/MovieCard";

const skeletonItems = Array.from({ length: 6 });

const MoviesPage = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
      setLoading(true);
      setError(null);
      const data = await api.getMovies();
      setMovies(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load movies";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMovies();
  }, [loadMovies]);

  if (loading) {
    return (
      <section className=" space-y-6 w-full max-w-6xl mx-auto">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {skeletonItems.map((_, index) => (
            <div
              key={`movie-skeleton-${index}`}
              className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="aspect-2/3 w-full animate-pulse bg-muted" />
              <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="mt-auto h-10 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
        <Button onClick={loadMovies} variant={"outline"}>
          Try Again
        </Button>
      </section>
    );
  }

  if (!movies.length) {
    return (
      <section className="space-y-2 ">
        <h2 className="text-xl font-semibold">Movies</h2>
        <p className="text-sm text-muted-foreground">
          No movies available yet. Add data through the seed scripts or the
          admin review workflow.
        </p>
      </section>
    );
  }

  const hasActiveSearch = searchTerm.trim().length > 0;

  return (
    <section className="space-y-6 w-full max-w-6xl mx-auto">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2 self-start">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">
            Browse the catalogue
          </p>
          <h2 className="text-2xl font-semibold text-foreground">Movies</h2>
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

      {hasActiveSearch && filteredMovies.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No movies match “{searchTerm}”. Try a different title or genre.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredMovies.map((movie) => (
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
