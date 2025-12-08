"use client";

import { Marquee } from "@/components/ui/marquee";
import { api } from "@/lib/api";
import { getLocalMovies } from "@/lib/local-movies";
import { Movie } from "@/lib/type";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const Carousel = () => {
  const fallbackMovies = useMemo(() => getLocalMovies(12), []);
  const [movies, setMovies] = useState<Movie[]>(fallbackMovies);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasRemoteData, setHasRemoteData] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMovies = async () => {
      setIsFetching(true);
      try {
        const data = await api.getMovies();
        if (!cancelled) {
          setMovies(data);
          setHasRemoteData(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load movies";
          setError(message);
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };

    void loadMovies();

    return () => {
      cancelled = true;
    };
  }, []);
  const splitIndex = Math.ceil(movies.length / 2);
  const firstRow = movies.slice(0, splitIndex);
  const secondRow = movies.slice(splitIndex);

  const MovieCard = ({
    posterPath,
    imdbId,
  }: {
    posterPath?: string;
    imdbId: string;
  }) => (
    <figure
      className={cn(
        "relative h-full w-64 cursor-pointer overflow-hidden rounded-xl border p-4",
        // light styles
        "border-gray-950/10 bg-gray-950/5 hover:bg-gray-950/10",
        // dark styles
        "dark:border-gray-50/10 dark:bg-gray-50/10 dark:hover:bg-gray-50/15"
      )}
    >
      <div className="relative h-80 w-full">
        <Link href={`/movie/${imdbId}`}>
          {posterPath ? (
            <Image
              src={posterPath}
              alt="Movie poster"
              fill
              className="h-full w-full object-cover"
              sizes="256px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
              No poster available
            </div>
          )}
        </Link>
      </div>
    </figure>
  );

  const hasMovies = movies.length > 0;

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-2 py-1 font-medium ${
            hasRemoteData
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-400/15 text-amber-300"
          }`}
        >
          {hasRemoteData ? "Live posters" : "Demo posters"}
        </span>
        {isFetching && (
          <span className="text-muted-foreground animate-pulse">
            Syncing with Render…
          </span>
        )}
        {error && (
          <span className="text-destructive/80">
            {error}. Showing instant demo art instead.
          </span>
        )}
      </div>

      {!hasMovies && (
        <p className="text-sm text-muted-foreground">
          No demo posters available yet.
        </p>
      )}

      {hasMovies && (
        <>
          <Marquee className="[--duration:40s]">
            {firstRow.map((movie) => (
              <MovieCard
                key={movie.imdbId}
                posterPath={movie.posterPath}
                imdbId={movie.imdbId}
              />
            ))}
          </Marquee>
          {secondRow.length > 0 && (
            <Marquee reverse className="[--duration:40s]">
              {secondRow.map((movie) => (
                <MovieCard
                  key={movie.imdbId}
                  posterPath={movie.posterPath}
                  imdbId={movie.imdbId}
                />
              ))}
            </Marquee>
          )}
        </>
      )}

      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-background" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-linear-to-l from-background" />
    </div>
  );
};

export default Carousel;
