package utils

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/ChannMyaeAung/streamly/server/database"
	"github.com/ChannMyaeAung/streamly/server/models"
	redis "github.com/redis/go-redis/v9"
)

const (
	moviesCacheKey         = "movies:all"
	recommendedCachePrefix = "recommended:"
	cacheTTL               = 3 * time.Minute
)

// FetchMoviesFromCache returns cached movies when available.
func FetchMoviesFromCache(ctx context.Context) ([]models.Movie, bool, error) {
	client := database.Redis()
	if client == nil {
		return nil, false, nil
	}

	payload, err := client.Get(ctx, moviesCacheKey).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, false, nil
		}
		return nil, false, err
	}

	var movies []models.Movie
	if err := json.Unmarshal(payload, &movies); err != nil {
		return nil, false, err
	}
	return movies, true, nil
}

// StoreMoviesCache persists the movie list in Redis.
func StoreMoviesCache(ctx context.Context, movies []models.Movie) {
	client := database.Redis()
	if client == nil {
		return
	}

	payload, err := json.Marshal(movies)
	if err != nil {
		log.Printf("cache: failed to marshal movies: %v\n", err)
		return
	}

	if err := client.Set(ctx, moviesCacheKey, payload, cacheTTL).Err(); err != nil {
		log.Printf("cache: failed to store movies cache: %v\n", err)
	}
}

// FetchRecommendationsFromCache tries to load cached recommendations for a user.
func FetchRecommendationsFromCache(ctx context.Context, userID string) ([]models.Movie, bool, error) {
	client := database.Redis()
	if client == nil {
		return nil, false, nil
	}

	key := recommendedCachePrefix + userID
	payload, err := client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, false, nil
		}
		return nil, false, err
	}

	var movies []models.Movie
	if err := json.Unmarshal(payload, &movies); err != nil {
		return nil, false, err
	}
	return movies, true, nil
}

// StoreRecommendationsCache writes the recommended list for a user into Redis.
func StoreRecommendationsCache(ctx context.Context, userID string, movies []models.Movie) {
	client := database.Redis()
	if client == nil {
		return
	}

	payload, err := json.Marshal(movies)
	if err != nil {
		log.Printf("cache: failed to marshal recommendations: %v\n", err)
		return
	}

	key := recommendedCachePrefix + userID
	if err := client.Set(ctx, key, payload, cacheTTL).Err(); err != nil {
		log.Printf("cache: failed to store recommendations for %s: %v\n", userID, err)
	}
}

// InvalidateMoviesCache clears the cached movie listing.
func InvalidateMoviesCache(ctx context.Context) {
	client := database.Redis()
	if client == nil {
		return
	}

	if err := client.Del(ctx, moviesCacheKey).Err(); err != nil && err != redis.Nil {
		log.Printf("cache: failed to invalidate movies cache: %v\n", err)
	}
}

// InvalidateAllRecommendations removes every cached recommendation entry.
func InvalidateAllRecommendations(ctx context.Context) {
	client := database.Redis()
	if client == nil {
		return
	}

	iter := client.Scan(ctx, 0, recommendedCachePrefix+"*", 0).Iterator()
	for iter.Next(ctx) {
		if err := client.Del(ctx, iter.Val()).Err(); err != nil && err != redis.Nil {
			log.Printf("cache: failed to delete recommendation key %s: %v\n", iter.Val(), err)
		}
	}

	if err := iter.Err(); err != nil {
		log.Printf("cache: error during recommendation cache scan: %v\n", err)
	}
}
