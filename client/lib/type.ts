export interface Genre {
  genre_id: number;
  genre_name: string;
}

export interface Movie {
  imdbId: string;
  title: string;
  description?: string;
  posterUrl?: string;
  rankingName?: string;
  rankingValue?: number;
  genres: string[];
  adminReview?: string;
  runtimeMinutes?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  first_name: string;
  last_name: string;
  role: "USER" | "ADMIN";
  favourite_genres: Genre[];
}
