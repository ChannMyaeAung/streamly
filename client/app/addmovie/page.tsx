"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AddMoviePayload } from "@/lib/type";
import { toast } from "react-toastify";

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

// Normalizes a pasted YouTube link (watch, share, embed, shorts) into the 11-char video ID.
function extractYouTubeId(input: string): string | null {
  // Trim surrounding whitespace so we work with a clean value.
  const value = input.trim();
  // Abort when nothing remains after trimming.
  if (!value) {
    return null;
  }

  // Directly accept inputs that already look like canonical 11-char IDs.
  if (YOUTUBE_ID_REGEX.test(value)) {
    return value;
  }

  try {
    // Parse the string as a URL to inspect hostname and path segments.
    const url = new URL(value);
    // Strip the common www prefix for easier comparison (e.g. www.youtube.com).
    const host = url.hostname.replace(/^www\./, "");

    // Handle youtu.be short links where the ID is the remainder of the path.
    if (host === "youtu.be") {
      // Drop the leading slash to expose the raw candidate ID.
      const id = url.pathname.slice(1);
      // Confirm the candidate is a valid YouTube ID before returning it.
      return YOUTUBE_ID_REGEX.test(id) ? id : null;
    }

    // Accept youtube.com and any of its subdomains (e.g. music.youtube.com).
    const isYouTubeDomain =
      host === "youtube.com" || host.endsWith(".youtube.com");

    if (isYouTubeDomain) {
      // The standard watch page stores the ID in the v query parameter.
      if (url.pathname === "/watch") {
        // Pull the v parameter, defaulting to an empty string if absent.
        const id = url.searchParams.get("v") ?? "";
        // Validate the extracted v value before returning it.
        return YOUTUBE_ID_REGEX.test(id) ? id : null;
      }

      // Embed, shorts, and live URLs place the ID in the second path segment.
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (
        pathParts.length >= 2 &&
        ["embed", "shorts", "live"].includes(pathParts[0])
      ) {
        // Use the second segment as the candidate ID (e.g. /embed/id, /shorts/id).
        const id = pathParts[1];
        // Return the candidate only when it matches the ID pattern.
        return YOUTUBE_ID_REGEX.test(id) ? id : null;
      }
    }
  } catch (error) {
    // Non-URL inputs reach here; they fall through to the null return value.
  }

  // Signal failure to extract the ID so the caller can surface a validation error.
  return null;
}

type AdminMovieForm = {
  imdb_id: string;
  title: string;
  poster_path: string;
  youtube_id: string;
  ranking_name: string;
  ranking_value: string;
  admin_review: string;
  genres: string;
  runtime: string;
};

const emptyAdminForm: AdminMovieForm = {
  imdb_id: "",
  title: "",
  poster_path: "",
  youtube_id: "",
  ranking_name: "",
  ranking_value: "",
  admin_review: "",
  genres: "",
  runtime: "",
};

const AddMovie = () => {
  const { user, loading: authLoading } = useAuth();

  const [adminForm, setAdminForm] = useState<AdminMovieForm>(emptyAdminForm);
  const [movieSubmitting, setMovieSubmitting] = useState(false);

  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);

  const isAdmin = useMemo(
    () => user?.role === "ADMIN" || user?.role === "DEMO_ADMIN",
    [user?.role]
  );

  const handleAdminInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setAdminForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddMovie = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMovieSubmitting(true);

    try {
      const rankingValueNumber = Number.parseInt(adminForm.ranking_value, 10);
      if (Number.isNaN(rankingValueNumber)) {
        throw new Error("Ranking value must be a number.");
      }

      const runtimeMinutes = Number.parseInt(adminForm.runtime, 10);
      if (Number.isNaN(runtimeMinutes) || runtimeMinutes <= 0) {
        throw new Error("Runtime must be a positive number of minutes.");
      }

      const genreEntries = adminForm.genres
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

      if (genreEntries.length === 0) {
        throw new Error("Provide at least one genre.");
      }

      const parsedGenres = genreEntries.map((entry, index) => {
        const [maybeId, ...nameParts] = entry
          .split(":")
          .map((part) => part.trim());
        if (nameParts.length > 0) {
          const parsedId = Number.parseInt(maybeId, 10);
          const name = nameParts.join(":");
          if (!name) {
            throw new Error("Each genre must include a name.");
          }
          if (Number.isNaN(parsedId)) {
            throw new Error("Genre IDs must be numbers when provided.");
          }
          return {
            genre_id: parsedId,
            genre_name: name,
          };
        }

        if (!maybeId) {
          throw new Error("Each genre must include a name.");
        }

        return {
          genre_id: index + 1,
          genre_name: maybeId,
        };
      });

      const youtubeId = extractYouTubeId(adminForm.youtube_id);
      if (!youtubeId) {
        throw new Error("Enter a valid YouTube URL or video ID.");
      }

      const payload: AddMoviePayload = {
        imdb_id: adminForm.imdb_id.trim(),
        title: adminForm.title.trim(),
        poster_path: adminForm.poster_path.trim(),
        youtube_id: youtubeId,
        genre: parsedGenres,
        admin_review: adminForm.admin_review.trim() || undefined,
        ranking: {
          ranking_value: rankingValueNumber,
          ranking_name: adminForm.ranking_name.trim(),
        },
        runtime: runtimeMinutes,
      };

      if (
        !payload.imdb_id ||
        !payload.title ||
        !payload.poster_path ||
        !payload.youtube_id
      ) {
        throw new Error(
          "IMDb ID, title, poster URL, and YouTube ID are required."
        );
      }

      if (!payload.ranking.ranking_name) {
        throw new Error("Ranking name is required.");
      }

      await api.addMovie(payload);

      toast.success("Movie added successfully.");
      setAdminForm(emptyAdminForm);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to add movie right now.";

      toast.error(message);
    } finally {
      setMovieSubmitting(false);
    }
  };

  const handleAdminAccessRequest = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setRequestSubmitting(true);
    setRequestFeedback(null);

    const targetForm = event.currentTarget;
    const form = new FormData(targetForm);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      comments: String(form.get("comments") ?? ""),
    };

    try {
      await api.submitAdminAccessRequest(payload);
      setRequestFeedback(
        "Thanks! We received your request and will respond by email."
      );
      targetForm.reset();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit request right now.";
      setRequestFeedback(message);
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Checking access…
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto mt-10 w-full max-w-lg rounded-md border border-border bg-card px-8 py-10 shadow-sm">
        <h1 className="text-xl font-semibold text-destructive">
          Admin access required
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Only administrators can add new movies. Submit your details below and
          an existing admin will reach out.
        </p>

        <form onSubmit={handleAdminAccessRequest} className="mt-6 space-y-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Jane Doe"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="e.g. jane@example.com"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="comments">Comments</FieldLabel>
              <Textarea
                id="comments"
                name="comments"
                placeholder="Tell us why you need admin access…"
                className="min-h-32"
                required
              />
            </Field>

            <Field orientation="horizontal">
              <Button type="submit" disabled={requestSubmitting}>
                {requestSubmitting ? "Submitting…" : "Submit request"}
              </Button>
              <Button asChild variant="outline" type="button">
                <Link href="/">Cancel</Link>
              </Button>
            </Field>

            {requestFeedback && (
              <p className="text-sm text-muted-foreground">{requestFeedback}</p>
            )}
          </FieldGroup>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-10 w-full max-w-3xl space-y-8 px-4">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Admin tools
        </p>
        <h1 className="text-3xl font-semibold">Add a new movie</h1>
        <p className="text-sm text-muted-foreground">
          Provide the base metadata for a new title. Reviews and rankings can be
          updated later.
        </p>
      </header>

      <form
        onSubmit={handleAddMovie}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <FieldGroup className="grid gap-6 md:grid-cols-2">
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="imdb_id">IMDb ID</FieldLabel>
            <Input
              id="imdb_id"
              name="imdb_id"
              value={adminForm.imdb_id}
              onChange={handleAdminInputChange}
              placeholder="tt0111161"
              required
            />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              name="title"
              value={adminForm.title}
              onChange={handleAdminInputChange}
              placeholder="Movie title"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="runtime">Duration (in minutes)</FieldLabel>
            <Input
              id="runtime"
              name="runtime"
              value={adminForm.runtime}
              onChange={handleAdminInputChange}
              placeholder="E.g. 140 minutes"
              required
            />
            <FieldDescription>
              Enter the runtime as a whole number in minutes, e.g. 140.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="poster_path">Poster URL</FieldLabel>
            <Input
              id="poster_path"
              name="poster_path"
              value={adminForm.poster_path}
              onChange={handleAdminInputChange}
              placeholder="https://image.tmdb.org/..."
              required
            />
            <FieldDescription>
              Must be a publicly accessible image URL.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="youtube_id">YouTube trailer link</FieldLabel>
            <Input
              id="youtube_id"
              name="youtube_id"
              value={adminForm.youtube_id}
              onChange={handleAdminInputChange}
              placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              required
            />
            <FieldDescription>
              Paste the full YouTube URL or the 11-character video ID.
              We&apos;ll extract the ID for you.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="ranking_name">Ranking label</FieldLabel>
            <Input
              id="ranking_name"
              name="ranking_name"
              value={adminForm.ranking_name}
              onChange={handleAdminInputChange}
              placeholder="Excellent"
              required
            />
            <FieldDescription>
              Put the number based on the number you've chosen. <br /> 1.
              Excellent, 2. Good , 3. Okay, 4. Bad, 5. Terrible
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="ranking_value">Ranking value</FieldLabel>
            <Input
              id="ranking_value"
              name="ranking_value"
              type="number"
              min={1}
              max={5}
              value={adminForm.ranking_value}
              onChange={handleAdminInputChange}
              placeholder="1"
              required
            />
            <FieldDescription>
              Lower numbers represent higher rankings.
            </FieldDescription>
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="genres">Genres</FieldLabel>
            <Input
              id="genres"
              name="genres"
              value={adminForm.genres}
              onChange={handleAdminInputChange}
              placeholder="2:Drama, 2:Thriller"
              required
            />
            <FieldDescription>
              Provide a comma-separated list. Optionally prefix each genre with
              an ID using the format <code>id:name</code>.
              <br />
              <code>
                1:Comedy, 2:Drama, 3:Western, 4:Fantasy, 5:Thriller, 6: Sci-Fi,
                7:Action, 8:Adventure, 9:Crime
              </code>
            </FieldDescription>
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="admin_review">
              Admin review (optional)
            </FieldLabel>
            <Textarea
              id="admin_review"
              name="admin_review"
              value={adminForm.admin_review}
              onChange={handleAdminInputChange}
              placeholder="Short editorial note."
              rows={4}
            />
          </Field>
        </FieldGroup>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" disabled={movieSubmitting}>
            {movieSubmitting ? "Saving…" : "Add movie"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAdminForm(emptyAdminForm);
            }}
          >
            Reset form
          </Button>
        </div>
      </form>
    </main>
  );
};

export default AddMovie;
