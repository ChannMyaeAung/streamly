"use client";

import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Movie } from "@/lib/type";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import MovieCard from "../components/MovieCard";
import LoginPage from "../login/page";

type StatusError = Error & { status?: number };

const RecommendedMovies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<StatusError | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, loading: authLoading, logout } = useAuth();

  // Fetch recommended movies for the signed-in user, retrying refresh if the token expired.
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
              : new Error("Unable to load recommended movies"),
          );
        }
      } else {
        setError(
          err instanceof Error
            ? (err as StatusError)
            : new Error("Unable to load recommended movies"),
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
        "Sign in to see personalised recommendations.",
      ) as StatusError;
      unauth.status = 401;
      setError(unauth);
      setLoading(false);
      return;
    }

    void load();
  }, [authLoading, user, load]);

  // Smooth the search input updates to avoid filtering on every keypress.
  const deferredSearch = useDeferredValue(searchTerm);

  // Filter recommendations by title when a search query is present.
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

  const status = error?.status;
  const hasActiveSearch = searchTerm.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 py-12">
      <div className="flex items-center justify-between flex-row-reverse">
        <div className="md:w-80">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search movies by title..."
          />
        </div>
        <div className="space-y-2 text-start">
          <h1 className="text-3xl font-bold">Recommended for you</h1>
          <p className="text-muted-foreground">
            These picks blend your favourite genres with the latest rankings.
          </p>
        </div>
      </div>

      {/* Show a lightweight loading state while personalised picks load. */}
      {loading && (
        <div className="space-y-2 text-center text-sm text-muted-foreground">
          Fetching personalised titles...
        </div>
      )}

      {/* Prompt unauthenticated visitors to sign in when recommendations require auth. */}
      {!loading && error && status === 401 && !user && (
        <div className="space-y-4 text-start w-full">
          <p className="text-sm text-muted-foreground md:text-center">
            Sign in to see personalised recommendations.
          </p>
          <div className="flex justify-start md:justify-center gap-3">
            <LoginPage minHeight={false} />
          </div>
        </div>
      )}

      {/* Surface any non-auth errors returned by the recommendation endpoint. */}
      {!loading && error && status !== 401 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {/* Render the recommendation grid once data is available. */}
      {!loading && !error && filteredMovies.length > 0 && (
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

      {/* Let users know when their search returns no matches. */}
      {!loading && !error && hasActiveSearch && filteredMovies.length === 0 && (
        <div>
          No recommendations match "{searchTerm}". Try a different title.
        </div>
      )}

      {/* Encourage newly signed-in users to engage if we lack enough data to recommend titles. */}
      {!loading &&
        !error &&
        !hasActiveSearch &&
        movies.length === 0 &&
        user && (
          <p className="text-center text-sm text-muted-foreground">
            We don't have enough data to recommend movies yet. Rate a few titles
            or refresh later.
          </p>
        )}
    </div>
  );
};

export default RecommendedMovies;
