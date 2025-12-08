import { normalizeMovie } from "./api";
import { LOCAL_MOVIES_SEED } from "./local-movies-data";
import type { Movie } from "./type";

const LOCAL_MOVIES: Movie[] = LOCAL_MOVIES_SEED.map((item) =>
  normalizeMovie(item)
);

export function getLocalMovies(limit?: number): Movie[] {
  if (typeof limit === "number" && limit > 0) {
    return LOCAL_MOVIES.slice(0, limit);
  }
  return LOCAL_MOVIES;
}

export function getLocalMovieCount(): number {
  return LOCAL_MOVIES.length;
}
