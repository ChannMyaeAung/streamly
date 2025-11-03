export interface Movie {
  imdbId: string;
  title: string;
  description?: string;
  posterPath?: string;
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
}
