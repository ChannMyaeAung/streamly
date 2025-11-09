"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lens } from "@/components/ui/lens";
import { Movie } from "@/lib/type";
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
    <>
      {posterPath ? (
        <Card className="relative max-w-md shadow-none flex flex-col justify-between">
          <CardHeader>
            <Lens
              zoomFactor={2}
              lensSize={150}
              isStatic={false}
              ariaLabel="Zoom Area"
            >
              <Image
                src={posterPath}
                alt="image placeholder"
                width={500}
                height={500}
              />
            </Lens>
          </CardHeader>
          <CardContent className="space-y-1">
            <CardTitle className="text-2xl">{title}</CardTitle>
            {(rankingName || rankingValue) && (
              <CardDescription>
                {rankingName ?? "Ranking"}{" "}
                {rankingValue ? `• ${rankingValue}` : null}
              </CardDescription>
            )}
            {genres.length > 0 && (
              <CardDescription className="text-sm text-muted-foreground">
                {genres.join(" • ")}
              </CardDescription>
            )}
            <CardDescription>
              <span className="font-semibold text-gray-50">Admin Review:</span>{" "}
              {description || "No description available."}
            </CardDescription>
          </CardContent>
          <CardFooter className="space-x-4">
            <Button asChild size={"sm"} className="w-full">
              <Link href={`/movie/${imdbId}`}>View Details & Watch</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="aspect-2/3 w-full bg-muted" />
      )}
    </>
  );
};

export default MovieCard;
