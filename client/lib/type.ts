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

export interface AddMoviePayload {
  imdb_id: string;
  title: string;
  poster_path: string;
  youtube_id: string;
  genre: Genre[];
  admin_review?: string;
  ranking: {
    ranking_value: number;
    ranking_name: string;
  };
  runtime: number;
}

export interface AdminAccessRequestPayload {
  name: string;
  email: string;
  comments: string;
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
