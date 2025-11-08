export interface Genre {
  genre_id: number;
  genre_name: string;
}

export interface Movie {
  imdbId: string;
  title: string;
  description?: string;
  posterPath?: string;
  rankingName?: string;
  rankingValue?: number;
  genres: string[];
  adminReview?: string;
  youtubeId?: string;
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

export interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "USER" | "ADMIN";
  token?: string;
  refresh_token?: string;
  favourite_genres: Genre[];
}
