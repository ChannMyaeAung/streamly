import {
  AddMoviePayload,
  AdminAccessRequestPayload,
  Genre,
  LoginPayload,
  Movie,
  RegisterPayload,
  User,
} from "./type";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// 5 Minutes TTL
const MOVIES_CACHE_TTL = 5 * 60 * 1000;
const RECOMMENDED_CACHE_TTL = 5 * 60 * 1000;

let moviesCache: { data: Movie[]; expiresAt: number } | null = null;
let moviesPromise: Promise<Movie[]> | null = null;

// per-user cache for recommended movies
const recommendedCache = new Map<
  string,
  { data: Movie[]; expiresAt: number }
>();
const recommendedPromises = new Map<string, Promise<Movie[]>>();

type ApiError = Error & { status?: number; payload?: unknown };

const defaultHeaders = new Headers({
  "Content-Type": "application/json",
});

function getStoredAuthPayload(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("streamly:user");
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// Pull a persisted access token from localStorage so API calls can authorize without cookies.
function getStoredAccessToken(): string | null {
  const payload = getStoredAuthPayload();
  const token = payload?.token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

function getStoredUserId(): string | null {
  const payload = getStoredAuthPayload();
  const userId = payload?.user_id;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
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
    // Go/Gin returns { "error": "..." }; other APIs may use { "message": "..." }
    const message =
      typeof payload === "string"
        ? payload || response.statusText
        : payload?.error ?? payload?.message ?? response.statusText ?? "Request failed";
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
    runtimeMinutes: raw.runtime ?? undefined,
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
    const userId = getStoredUserId();
    if (!userId) {
      const data = await request<any[]>("/recommendedmovies", {
        method: "GET",
        cache: "no-store",
      });
      return data.map(normalizeMovie);
    }

    const now = Date.now();
    const cached = recommendedCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    let promise = recommendedPromises.get(userId);
    if (!promise) {
      promise = (async () => {
        const raw = await request<any[]>("/recommendedmovies", {
          method: "GET",
          cache: "no-store",
        });
        return raw.map(normalizeMovie);
      })();
      recommendedPromises.set(userId, promise);
    }

    try {
      const normalized = await promise;
      recommendedCache.set(userId, {
        data: normalized,
        expiresAt: Date.now() + RECOMMENDED_CACHE_TTL,
      });

      return normalized;
    } catch (error) {
      const stale = recommendedCache.get(userId);
      if (!stale || stale.expiresAt <= now) {
        recommendedCache.delete(userId);
      }
      throw error;
    } finally {
      recommendedPromises.delete(userId);
    }
  },

  async addMovie(payload: AddMoviePayload) {
    const response = await request<any>("/addmovie", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    moviesCache = null;
    recommendedCache.clear();
    recommendedPromises.clear();
    return response;
  },

  async updateAdminReview(imdbId: string, adminReview: string) {
    const response = await request<{
      ranking_name: string;
      admin_review: string;
    }>(`/updatereview/${imdbId}`, {
      method: "PATCH",
      body: JSON.stringify({ admin_review: adminReview }),
    });
    moviesCache = null;
    recommendedCache.clear();
    recommendedPromises.clear();
    return response;
  },

  async submitAdminAccessRequest(payload: AdminAccessRequestPayload) {
    const res = await fetch("/api/admin-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof data?.message === "string"
          ? data.message
          : "Unable to submit request.";
      throw new Error(message);
    }

    return data as { message: string };
  },

  async deleteMovie(imdbId: string) {
    await request<void>(`/deletemovie/${imdbId}`, { method: "DELETE" });
    moviesCache = null;
    recommendedCache.clear();
    recommendedPromises.clear();
  },

  // Authenticate as a pre-seeded demo account ("admin" or "user") without a password.
  async demoLogin(type: "admin" | "user"): Promise<User> {
    const user = await request<User>("/demo-login", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
    moviesCache = null;
    recommendedCache.clear();
    recommendedPromises.clear();
    return user;
  },

  // Authenticate a user and return the profile details supplied by the API.
  async login(payload: LoginPayload): Promise<User> {
    const user = await request<User>("/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    moviesCache = null;
    recommendedCache.clear();
    recommendedPromises.clear();
    return user;
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
    try {
      return await request<{ message: string }>("/logout", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });
    } finally {
      moviesCache = null;
      recommendedCache.clear();
      recommendedPromises.clear();
    }
  },
};
