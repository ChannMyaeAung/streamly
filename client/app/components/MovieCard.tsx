import { Button } from "@/components/ui/button";
import { Movie } from "@/lib/type";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

type MovieProps = {
  movie: Movie;
  className?: string;
};

const MovieCard = ({ movie, className }: MovieProps) => {
  const {
    imdbId,
    title,
    posterPath,
    description,
    genres,
    rankingName,
    rankingValue,
  } = movie;

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
        className
      )}
    >
      {posterPath ? (
        <div className="relative aspect-2/3 w-full overflow-hidden bg-muted">
          <Image
            src={posterPath}
            alt={`${title} poster`}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className="object-cover transition duration-300 hover:scale-105"
          />
        </div>
      ) : (
        <div className="aspect-2/3 w-full bg-muted" />
      )}

      <div className="flex flex-1 flex-col gap-3 bg-muted p-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {(rankingName || rankingValue) && (
            <p className="text-sm text-muted-foreground">
              {rankingName ?? "Ranking"}
              {rankingValue ? `: ${rankingValue}` : null}
            </p>
          )}
        </div>

        {genres.length > 0 && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {genres.join(" • ")}
          </p>
        )}

        <p className="">
          <span className="">Admin Review: </span>
          {""}
          <span className="line-clamp-3 text-sm text-muted-foreground">
            {description || "This movie does not have a description yet."}
          </span>
        </p>

        <div className="mt-auto pt-4">
          <Button asChild size={"sm"} className="w-full">
            <Link href={`/movie/${imdbId}`}>View Details</Link>
          </Button>
        </div>
      </div>
    </article>
  );
};

export default MovieCard;
