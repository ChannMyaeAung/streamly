import { Genre, LoginPayload, Movie, RegisterPayload } from "./type";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

type ApiError = Error & { status?: number; payload?: unknown };

const defaultHeaders = {
  "Content-Type": "application/json",
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get("content-type") || "";
  let payload: any;
  try {
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload || response.statusText
        : payload?.message ?? "Request failed";
    const error: ApiError = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload as T;
}

export function normalizeMovie(raw: any): Movie {
  const genreSource =
    raw.genres ??
    raw.genre ??
    raw.favourite_genres ??
    raw.favorite_genres ??
    [];

  const genres = Array.isArray(genreSource)
    ? genreSource
        .map((item: any) => {
          if (typeof item === "string") return item;
          return item?.genre_name ?? item?.name ?? "";
        })
        .filter(Boolean)
    : [];

  const rankingName =
    raw.ranking?.ranking_name ??
    raw.ranking?.name ??
    raw.ranking_name ??
    raw.RankingName ??
    undefined;

  const rankingValue =
    raw.ranking?.ranking_value ??
    raw.ranking?.value ??
    raw.ranking_value ??
    raw.RankingValue ??
    undefined;

  return {
    imdbId: raw.imdb_id ?? raw.imdbId ?? "",
    title: raw.title ?? raw.Title ?? "Untitled",
    description: raw.description ?? raw.admin_review ?? "",
    posterUrl:
      raw.poster_path ??
      raw.poster ??
      raw.Poster ??
      raw.backdrop ??
      raw.banner_url ??
      undefined,
    rankingName,
    rankingValue,
    genres,
    adminReview: raw.admin_review ?? undefined,
    runtimeMinutes: raw.runtime_minutes ?? raw.runtime ?? undefined,
  };
}

export const api = {
  async getGenres(): Promise<Genre[]> {
    return request<Genre[]>("/genres");
  },

  async getMovies(): Promise<Movie[]> {
    const data = await request<any[]>("/movies");
    return data.map(normalizeMovie);
  },

  async getMovie(imdbId: string): Promise<Movie> {
    const data = await request<any>(`/movie/${imdbId}`, {
      method: "GET",
      cache: "no-store",
    });
    return normalizeMovie(data);
  },

  async getRecommendedMovies(): Promise<Movie[]> {
    const data = await request<any[]>("/recommendedmovies", {
      method: "GET",
      cache: "no-store",
    });
    return data.map(normalizeMovie);
  },

  async login(payload: LoginPayload) {
    return request<{ message: string; user?: unknown }>("/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async register(payload: RegisterPayload) {
    return request<{ message: string; user?: unknown }>("/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async refresh() {
    return request<{ message: string }>("/refresh", {
      method: "POST",
    });
  },
};
