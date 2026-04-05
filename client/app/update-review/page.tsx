"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RippleButton } from "@/components/ui/ripple-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Movie } from "@/lib/type";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const AdminReviewPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedImdbId, setSelectedImdbId] = useState<string>("");
  const [review, setReview] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isDemoAdmin = user?.role === "DEMO_ADMIN";

  useEffect(() => {
    let ignore = false;

    const fetchMovies = async () => {
      try {
        const data = await api.getMovies();
        if (!ignore) setMovies(data);
      } catch (err) {
        if (!ignore) {
          const error =
            err instanceof Error
              ? err.message
              : "Unable to load catalogue for review.";
          setLoadError(error);
        }
      }
    };

    void fetchMovies();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!authLoading && user && user.role !== "ADMIN" && user.role !== "DEMO_ADMIN") {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedImdbId || !review.trim()) {
      setMessage("Pick a movie and write a review first.");
      return;
    }

    if (isDemoAdmin) {
      toast.warn("Review updates are disabled in demo mode.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);
      const response = await api.updateAdminReview(
        selectedImdbId,
        review.trim()
      );
      setMessage(
        `Review stored with ranking "${response.ranking_name}". Refreshed the score.`
      );
      setReview("");
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Unable to update the review.";
      toast.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking access...</p>
        <p>Only admins can update the reviews.</p>
      </div>
    );
  }

  if (user.role !== "ADMIN" && user.role !== "DEMO_ADMIN") {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          AI-assisted moderation
        </p>
        <h1 className="text-3xl font-semibold">Admin review console</h1>
        <p className="text-sm text-muted-foreground">
          Submit an editorial review.
        </p>
      </header>

      {loadError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select a movie</Label>
          <Select
            value={selectedImdbId}
            onValueChange={(value) => setSelectedImdbId(value)}
            disabled={movies.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a title" />
            </SelectTrigger>
            <SelectContent>
              {movies.map((movie) => (
                <SelectItem key={movie.imdbId} value={movie.imdbId}>
                  {movie.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-review" className="text-sm font-medium">
            Editorial review
          </Label>
          <Textarea
            id="admin-review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={6}
            required
            placeholder="Share a concise assessment. The AI model maps this text to a ranking."
          />
        </div>

        {isDemoAdmin && (
          <p className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
            You are in demo mode meaning submitting reviews is disabled.
          </p>
        )}
        <RippleButton rippleColor="#ADD8E6" type="submit" disabled={submitting || isDemoAdmin}>
          {submitting ? "Submitting..." : "Submit Review"}
        </RippleButton>

        {message && (
          <>
            <div className="rounded-md border border-muted-foreground/30 bg-muted/20 p-3 text-sm text-muted-foreground flex gap-3 flex-col">
              <p>{message}</p>
              <Button className="w-fit">
                <Link href={`movie/${selectedImdbId}`}>
                  View the updated movie details
                </Link>
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default AdminReviewPage;
