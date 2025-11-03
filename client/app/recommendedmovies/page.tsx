"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Movie } from "@/lib/type";
import Link from "next/link";
import { useEffect, useState } from "react";

type StatusError = Error & { status?: number };

const RecommendedMovies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<StatusError | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getRecommendedMovies();
        if (!ignore) {
          setMovies(data);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof Error) {
            setError(err as StatusError);
          } else {
            setError(new Error("Unable to load recommended movies"));
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, []);

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

      {!loading && error && status === 401 && (
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
    </div>
  );
};

export default RecommendedMovies;
