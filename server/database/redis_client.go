package database

import (
	"context"
	"log"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

var (
	redisClient *redis.Client
	redisOnce   sync.Once
)

// Redis returns a shared Redis client instance configured via environment variables.
// If connection details are missing or the server is unreachable, caching is disabled gracefully by returning nil.
func Redis() *redis.Client {
	redisOnce.Do(func() {
		if err := godotenv.Load(".env"); err != nil {
			log.Println("redis: unable to load .env file", err)
		}

		addr := os.Getenv("REDIS_ADDR")
		if addr == "" {
			log.Println("redis: REDIS_ADDR not set; caching disabled")
			return
		}

		password := os.Getenv("REDIS_PASSWORD")
		db := 0
		if raw := os.Getenv("REDIS_DB"); raw != "" {
			if parsed, err := strconv.Atoi(raw); err == nil {
				db = parsed
			} else {
				log.Printf("redis: invalid REDIS_DB value %q, defaulting to 0\n", raw)
			}
		}

		client := redis.NewClient(&redis.Options{
			Addr:         addr,
			Password:     password,
			DB:           db,
			DialTimeout:  5 * time.Second,
			ReadTimeout:  2 * time.Second,
			WriteTimeout: 2 * time.Second,
		})

		if err := client.Ping(context.Background()).Err(); err != nil {
			log.Printf("redis: ping failed (%v); caching disabled\n", err)
			return
		}

		redisClient = client
	})

	return redisClient
}
