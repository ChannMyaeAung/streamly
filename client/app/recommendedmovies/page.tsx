"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Movie } from "@/lib/type";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";

type StatusError = Error & { status?: number };

const RecommendedMovies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<StatusError | null>(null);
  const { user, loading: authLoading, logout } = useAuth();

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getRecommendedMovies();
      setMovies(data);
    } catch (err) {
      const typedError = err as StatusError;
      if (typedError?.status === 401) {
        try {
          await api.refresh();
          const retried = await api.getRecommendedMovies();
          setMovies(retried);
          setError(null);
        } catch (refreshErr) {
          const refreshTyped = refreshErr as StatusError;
          if (refreshTyped?.status === 401) {
            await logout();
          }
          setError(
            refreshErr instanceof Error
              ? (refreshErr as StatusError)
              : new Error("Unable to load recommended movies")
          );
        }
      } else {
        setError(
          err instanceof Error
            ? (err as StatusError)
            : new Error("Unable to load recommended movies")
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user, logout]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setMovies([]);
      const unauth = new Error(
        "Sign in to see personalised recommendations."
      ) as StatusError;
      unauth.status = 401;
      setError(unauth);
      setLoading(false);
      return;
    }

    void load();
  }, [authLoading, user, load]);

  const status = error?.status;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Recommended for you</h1>
        <p className="text-muted-foreground">
          These picks blend your favourite genres with the latest rankings.
        </p>
      </div>

      {loading && (
        <div className="space-y-2 text-center text-sm text-muted-foreground">
          Fetching personalised titles...
        </div>
      )}

      {!loading && error && status === 401 && !user && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to see personalised recommendations.
          </p>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant={"outline"}>
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      )}

      {!loading && error && status !== 401 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {!loading && !error && movies.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {movies.map((movie) => (
            <MovieCard key={movie.imdbId} movie={movie} />
          ))}
        </div>
      )}

      {!loading && !error && !movies.length && user && (
        <p className="text-center text-sm text-muted-foreground">
          We don't have enough data to recommend movies yet. Rate a few titles
          or refresh later.
        </p>
      )}
    </div>
  );
};

export default RecommendedMovies;
