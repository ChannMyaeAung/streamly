"use client";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Movie } from "@/lib/type";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReactPlayer from "react-player";

type StatusError = Error & { status?: number };

const SingleMoviePage = () => {
  const params = useParams<{ imdbId: string }>();
  const imdbId = params?.imdbId;
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<StatusError | null>(null);

  useEffect(() => {
    if (!imdbId) return;
    let ignore = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getMovie(imdbId);
        if (!ignore) {
          setMovie(data);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof Error) {
            setError(err as StatusError);
          } else {
            setError(new Error("Unable to load movie"));
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
  }, [imdbId]);

  const status = error?.status;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <Button asChild variant={"outline"} className="w-fit">
        <Link href={"/movies"}>Back to movies</Link>
      </Button>
      {loading && (
        <div className="space-y-4">
          <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="aspect-2/3 w-full animate-pulse rounded bg-muted sm:w-64" />
            <div className="flex-1 space-y-4">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      )}

      {!loading && error && status === 401 && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to view this movie&apos;s protected details.
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
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          {error.message}
        </div>
      )}

      {!loading && movie && (
        <div className="flex flex-col gap-6 sm:flex-row">
          {movie.posterPath ? (
            <div className="relative aspect-2/3 w-full overflow-hidden rounded-lg sm:w-64">
              <Image
                src={movie.posterPath}
                alt={`${movie.title} poster`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 256px"
              />
            </div>
          ) : (
            <div className="aspect-2/3 w-full rounded-lg bg-muted sm:w-64" />
          )}

          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">{movie.title}</h1>
              {movie.rankingName && (
                <p>
                  {movie.rankingName}
                  {movie.rankingValue ? ` • ${movie.rankingValue}` : null}
                </p>
              )}
            </div>

            {movie.genres.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Genres: {movie.genres.join(" • ")}
              </p>
            )}

            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Synopsis</h2>
              <p className="text-sm text-muted-foreground">
                {movie.description || "No synopsis available yet."}
              </p>
            </div>

            {movie.adminReview && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Admin review
                </h2>
                <p className="text-sm text-muted-foreground">
                  {movie.adminReview}
                </p>
              </div>
            )}

            {movie.youtubeId && (
              <div className="space-y-2">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                  <ReactPlayer
                    src={`https://www.youtube.com/watch?v=${movie.youtubeId}`}
                    width="100%"
                    height="100%"
                    controls
                    playing={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleMoviePage;
