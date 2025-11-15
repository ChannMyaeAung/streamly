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
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Movie } from "@/lib/type";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";

type MovieProps = {
  movie: Movie;
  className?: string;
  onDelete?: (imdbId: string) => void;
};

const MovieCard = ({ movie, className, onDelete }: MovieProps) => {
  const {
    imdbId,
    title,
    posterPath,
    adminReview,
    genres,
    rankingName,
    rankingValue,
  } = movie;

  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;

    try {
      setDeleting(true);
      await api.deleteMovie(imdbId);
      onDelete?.(imdbId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete movie.";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

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
              {adminReview || "No description available."}
            </CardDescription>
          </CardContent>
          <CardFooter className="space-x-4 flex flex-col items-start justify-start gap-3">
            <Button asChild size={"sm"} className="w-full">
              <Link href={`/movie/${imdbId}`}>View Details & Watch</Link>
            </Button>
            {user?.role === "ADMIN" && (
              <Button
                type="button"
                size={"sm"}
                variant={"destructive"}
                className="w-full"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </CardFooter>
        </Card>
      ) : (
        <div className="aspect-2/3 w-full bg-muted" />
      )}
    </>
  );
};

export default MovieCard;
