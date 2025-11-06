"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Genre, LoginPayload, RegisterPayload } from "@/lib/type";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: "USER" | "ADMIN";
  favouriteGenreIds: number[];
};

const defaultState: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "USER",
  favouriteGenreIds: [],
};

const AuthForm = ({ mode }: AuthFormProps) => {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState(defaultState);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [genresError, setGenresError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "register") return;

    let ignore = false;
    const load = async () => {
      try {
        setGenresLoading(true);
        setGenresError(null);
        const data = await api.getGenres();
        if (!ignore) setGenres(data);
      } catch (err) {
        if (!ignore) {
          const message =
            err instanceof Error ? err.message : "Unable to load genres";
          setGenresError(message);
        }
      } finally {
        if (!ignore) setGenresLoading(false);
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [mode]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setForm((prev) => ({ ...prev, role: value as "USER" | "ADMIN" }));
  };

  const toggleFavouriteGenre = (genreId: number) => {
    setForm((prev) => {
      const isSelected = prev.favouriteGenreIds.includes(genreId);
      const favouriteGenreIds = isSelected
        ? prev.favouriteGenreIds.filter((id) => id !== genreId)
        : [...prev.favouriteGenreIds, genreId];
      return { ...prev, favouriteGenreIds };
    });
  };

  const selectedGenres = useMemo(
    () =>
      form.favouriteGenreIds
        .map((id) => genres.find((genre) => genre.genre_id === id))
        .filter((genre): genre is Genre => Boolean(genre)),
    [form.favouriteGenreIds, genres]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const payload: LoginPayload = {
          email: form.email,
          password: form.password,
        };
        const user = await api.login(payload);
        setUser(user);
        setMessage("Logged in successfully");
      } else {
        if (!selectedGenres.length) {
          throw new Error("Select at least one favourite genre");
        }
        const payload: RegisterPayload = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          role: form.role,
          favourite_genres: selectedGenres,
        };
        await api.register(payload);
        const user = await api.login({
          email: form.email,
          password: form.password,
        });
        setUser(user);
        setMessage("Account created successfully");
      }
      setForm(defaultState);
      router.push("/");
    } catch (err) {
      const fallback =
        mode === "login"
          ? "Unable to sign in. Check your credentials."
          : "Unable to create an account right now.";
      setMessage(err instanceof Error ? err.message : fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm"
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to continue exploring Streamly."
            : "Register to start building personalized recommendations."}
        </p>
      </header>

      {mode === "register" && (
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                name="first_name"
                autoComplete="given-name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                name="last_name"
                autoComplete="family-name"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Role</SelectLabel>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Favourite genres</Label>
            {genresLoading && (
              <p className="text-sm text-muted-foreground">Loading genres…</p>
            )}
            {genresError && (
              <p className="text-sm text-destructive">{genresError}</p>
            )}
            {!genresLoading && !genresError && (
              <div className="grid gap-2 sm:grid-cols-2">
                {genres.map((genre) => {
                  const checked = form.favouriteGenreIds.includes(
                    genre.genre_id
                  );
                  return (
                    <label
                      key={genre.genre_id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:border-primary"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggleFavouriteGenre(genre.genre_id)}
                      />
                      <span>{genre.genre_name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={form.password}
          onChange={handleChange}
          required
        />
      </div>

      <Button
        type="submit"
        disabled={loading || (mode === "register" && genresLoading)}
      >
        {loading
          ? "Please wait..."
          : mode === "login"
          ? "Sign in"
          : "Create Account"}
      </Button>

      {message && (
        <p className="rounded-md border border-muted-foreground/30 bg-muted/20 p-3 text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </form>
  );
};

export default AuthForm;
