"use client";
import LoginPage from "@/app/login/page";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Movie } from "@/lib/type";
import { ArrowLeft } from "lucide-react";
import {
  MediaControlBar,
  MediaController,
  MediaFullscreenButton,
  MediaMuteButton,
  MediaPlaybackRateButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from "media-chrome/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
          setError(
            (err instanceof Error
              ? err
              : new Error("Unable to load movie")) as StatusError
          );
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
  const movieGenres = useMemo(() => movie?.genres ?? [], [movie?.genres]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 py-8">
      <div
        className={`sm:items-center text-center justify-center sm:justify-between ${
          !loading && error && status === 401 ? "hidden" : "flex"
        } flex-col md:flex-row gap-2`}
      >
        <Button asChild variant="outline" className="w-fit">
          <Link href="/movies">
            <ArrowLeft />
            Back to catalogue
          </Link>
        </Button>
        {movie?.rankingName && (
          <div className="rounded-full border border-border px-4 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground w-fit">
            Ranked: {movie.rankingName}
            {movie.rankingValue ? ` • ${movie.rankingValue}` : ""}
          </div>
        )}
      </div>

      {loading && (
        <div className="space-y-6">
          <div className="aspect-video w-full animate-pulse rounded-3xl border border-border bg-muted" />
          <div className="grid gap-6 md:grid-cols-[240px_1fr]">
            <div className="aspect-2/3 w-full animate-pulse rounded-xl bg-muted" />
            <div className="space-y-3">
              <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      )}

      {!loading && error && status === 401 && (
        <div className="space-y-4 text-center flex items-center justify-center">
          {" "}
          <LoginPage minHeight={false} />
        </div>
      )}

      {!loading && error && status !== 401 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          {error.message}
        </div>
      )}

      {!loading && movie && (
        <div className="space-y-12">
          <section className="relative overflow-hidden rounded-3xl border border-border bg-[#0B0B0F] shadow-[0_30px_120px_-60px_rgba(15,15,26,0.8)]">
            {/* {movie.posterPath && (
              <Image
                src={movie.posterPath}
                alt={`${movie.title} backdrop`}
                fill
                className="absolute inset-0 -z-10 h-full w-full scale-110 transform object-cover opacity-30 blur-[60px]"
                sizes="(max-width: 1024px) 100vw, 1200px"
                priority
              />
            )}
            <div className="absolute inset-0 -z-10 bg-linear-to-br from-black via-[#10101A]/90 to-black" /> */}
            <div className="relative p-4 space-y-6">
              <div className="space-y-6">
                <div className="relative overflow-hidden rounded-2xl border w-full border-white/10 bg-black/70 backdrop-blur">
                  <div className="relative aspect-video w-full">
                    {movie.youtubeId ? (
                      <MediaController
                        style={{
                          width: "100%",
                          aspectRatio: "16/9",
                        }}
                      >
                        <ReactPlayer
                          slot="media"
                          src={`https://www.youtube.com/watch?v=${movie.youtubeId}`}
                          controls={false}
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                          config={{
                            youtube: {},
                          }}
                        ></ReactPlayer>
                        <MediaControlBar>
                          <MediaPlayButton />
                          <MediaSeekBackwardButton
                            seekOffset={10}
                            className="hidden sm:flex"
                          />
                          <MediaSeekForwardButton
                            seekOffset={10}
                            className="hidden sm:flex"
                          />
                          <MediaTimeRange />
                          <MediaTimeDisplay showDuration />
                          <MediaMuteButton />
                          <MediaVolumeRange />
                          <MediaPlaybackRateButton className="hidden sm:flex" />
                          <MediaFullscreenButton />
                        </MediaControlBar>
                      </MediaController>
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                        Trailer unavailable for this title.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/50">
                  <span className="rounded-full border border-white/15 px-3 py-1">
                    {movie.runtimeMinutes
                      ? `${movie.runtimeMinutes} minutes`
                      : "Runtime unknown"}
                  </span>
                  {movieGenres.length > 0 && (
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {movieGenres.join(" • ")}
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    Streamly Premiere
                  </span>
                </div>
              </div>

              <aside className="space-y-8 text-sm text-muted-foreground">
                <div className="space-y-3">
                  <h1 className="text-4xl font-semibold tracking-tight text-foreground lg:text-5xl">
                    {movie.title}
                  </h1>
                  <p className="text-base text-white/70">
                    Streamly orchestrates LangChainGo insights with OpenAI to
                    surface living rankings, personalised for every member.
                    Ranking 1 - 5 are generated based on AI analysis of the
                    admin review.
                  </p>
                </div>

                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    Synopsis
                  </h2>
                  <p className="leading-relaxed text-white/70">
                    {movie.description || "No synopsis available yet."}
                  </p>
                </div>

                {movie.adminReview && (
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
                        Admin review
                      </h3>
                      {movie.rankingName && (
                        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">
                          {movie.rankingName}
                          {movie.rankingValue ? ` • ${movie.rankingValue}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-white/80">
                      {movie.adminReview}
                    </p>
                  </div>
                )}

                {movie.youtubeId && (
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Link
                      href={`https://www.youtube.com/watch?v=${movie.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open trailer on YouTube
                    </Link>
                  </Button>
                )}
              </aside>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default SingleMoviePage;
