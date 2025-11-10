import { Marquee } from "@/components/ui/marquee";
import { api } from "@/lib/api";
import { Movie } from "@/lib/type";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const Carousel = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMovies = async () => {
      setError(null);
      try {
        const data = await api.getMovies();
        if (!cancelled) {
          setMovies(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load movies";
          setError(message);
        }
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

  console.log(movies);

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

  if (error) {
    return <p className="mt-6 text-sm text-destructive">{error}</p>;
  }

  if (movies.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        No movies carousel available.
      </p>
    );
  }

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden mt-6">
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
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-background" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-linear-to-l from-background" />
    </div>
  );
};

export default Carousel;
