import { Genre, LoginPayload, Movie, RegisterPayload, User } from "./type";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const MOVIES_CACHE_TTL = 3 * 60 * 1000;
let moviesCache: { data: Movie[]; expiresAt: number } | null = null;
let moviesPromise: Promise<Movie[]> | null = null;

type ApiError = Error & { status?: number; payload?: unknown };

const defaultHeaders = new Headers({
  "Content-Type": "application/json",
});

// Pull a persisted access token from localStorage so API calls can authorize without cookies.
function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("streamly:user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.token;
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

// Wrap fetch to enforce credentials, merge headers, and surface normalized errors.
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(defaultHeaders);

  // Ensure any caller-supplied headers are merged on top of our defaults.
  if (init.headers) {
    const provided = new Headers(init.headers as HeadersInit);
    provided.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  // Automatically add the bearer token when the consumer does not pass one explicitly.
  if (!headers.has("Authorization")) {
    const token = getStoredAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
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

// Convert mixed movie payload shapes into the client-facing Movie model.
export function normalizeMovie(raw: any): Movie {
  const genreSource = raw.genre ?? [];

  const genres = Array.isArray(genreSource)
    ? genreSource
        .map((item: any) => {
          if (typeof item === "string") return item;
          return item?.genre_name ?? item?.name ?? "";
        })
        .filter(Boolean)
    : [];

  const rankingName = raw.ranking?.ranking_name ?? undefined;

  const rankingValue = raw.ranking?.ranking_value ?? undefined;

  return {
    imdbId: raw.imdb_id ?? raw.imdbId ?? "",
    title: raw.title ?? "Untitled",
    description: raw.description ?? "",
    posterPath: raw.poster_path ?? undefined,
    rankingName,
    rankingValue,
    genres,
    adminReview: raw.admin_review ?? undefined,
    youtubeId: raw.youtube_id ?? undefined,
    runtimeMinutes: raw.runtime_minutes ?? raw.runtime ?? undefined,
  };
}

export const api = {
  // Retrieve the available genre definitions for registration filters.
  async getGenres(): Promise<Genre[]> {
    return request<Genre[]>("/genres");
  },

  // Load all movies and normalize their structure for UI consumption.
  async getMovies(): Promise<Movie[]> {
    const now = Date.now();
    if (moviesCache && moviesCache.expiresAt > now) {
      return moviesCache.data;
    }

    if (!moviesPromise) {
      moviesPromise = (async () => {
        const raw = await request<any[]>("/movies");
        return raw.map(normalizeMovie);
      })();
    }

    try {
      const normalized = await moviesPromise;
      moviesCache = {
        data: normalized,
        expiresAt: Date.now() + MOVIES_CACHE_TTL,
      };
      return normalized;
    } catch (error) {
      if (!moviesCache || moviesCache.expiresAt <= now) {
        moviesCache = null;
      }
      throw error;
    } finally {
      moviesPromise = null;
    }
  },

  // Fetch an individual movie by IMDb id with fresh data from the server.
  async getMovie(imdbId: string): Promise<Movie> {
    const data = await request<any>(`/movie/${imdbId}`, {
      method: "GET",
      cache: "no-store",
    });
    return normalizeMovie(data);
  },

  // Get recommendations for the current user, retrying normalization per item.
  async getRecommendedMovies(): Promise<Movie[]> {
    const data = await request<any[]>("/recommendedmovies", {
      method: "GET",
      cache: "no-store",
    });
    return data.map(normalizeMovie);
  },

  async updateAdminReview(imdbId: string, adminReview: string) {
    return request<{ ranking_name: string; admin_review: string }>(
      `/updatereview/${imdbId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ admin_review: adminReview }),
      }
    );
  },

  // Authenticate a user and return the profile details supplied by the API.
  async login(payload: LoginPayload): Promise<User> {
    return request<User>("/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Register a new user account with role and genre preferences.
  async register(payload: RegisterPayload) {
    return request<unknown>("/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Refresh the access token using the refresh cookie maintained by the API.
  async refresh() {
    return request<{ message: string }>("/refresh", {
      method: "POST",
    });
  },

  // Revoke the active session by informing the server of the current user id.
  async logout(userId: string) {
    return request<{ message: string }>("/logout", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  },
};
